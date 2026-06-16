import * as THREE from 'three';

/**
 * ──────────────────────────────────────────────────────────────────────────
 *  CLOTH SCENE  —  the 3D "sea-linen" amenities experience.
 *
 *  A framework-agnostic Three.js scene: an inclined ocean-teal grid floor that
 *  recedes into fog, and one fabric "sheet" per amenity (a subdivided plane
 *  textured with the amenity photo). A single 0→1 progress (driven by scroll
 *  from React/GSAP) choreographs the sheets:
 *
 *    waiting (lying far back on the floor) → dragged toward the camera while it
 *    wrinkles like real cloth → settles flat & facing you → recedes into a
 *    parked pile as the next sheet is drawn in.
 *
 *  Deformation is CPU vertex displacement (same approach as SceneBackground):
 *  fan-folds + ripples + a billow that fan out from a grab point near the
 *  bottom edge, with fake shading written into a vertex-colour attribute so the
 *  creases read without any scene lights. Only the actively-dragged sheet is
 *  deformed per frame; the rest stay flat.
 * ──────────────────────────────────────────────────────────────────────────
 */

export interface ClothItem {
  image: string;
}

export interface ClothSceneOptions {
  items: ClothItem[];
  /** called every frame with each sheet's text-overlay opacity (0..1) */
  onTexts?: (opacities: number[]) => void;
}

export interface ClothSceneHandle {
  /** set the target scroll progress (0..1); eased toward in the render loop */
  setProgress: (p: number) => void;
  resize: () => void;
  start: () => void;
  stop: () => void;
  dispose: () => void;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeIO = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
// overshoots past 1 before settling — a soft elastic "release" as the draw ends
const easeOutBack = (t: number) => {
  const c1 = 0.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

interface Pose {
  pos: THREE.Vector3;
  rotX: number;
  scale: number;
  op: number;
}
const lerpPose = (a: Pose, b: Pose, t: number): Pose => ({
  pos: new THREE.Vector3().lerpVectors(a.pos, b.pos, t),
  rotX: lerp(a.rotX, b.rotX, t),
  scale: lerp(a.scale, b.scale, t),
  op: lerp(a.op, b.op, t),
});

interface Sheet {
  group: THREE.Group;
  mesh: THREE.Mesh;
  geo: THREE.BufferGeometry;
  base: Float32Array;
  pos: Float32Array;
  col: Float32Array;
  mat: THREE.MeshBasicMaterial;
  tex: THREE.Texture;
  deformed: boolean;
}

const BASE_COLOR = 0x06121a; // page base — fog fades the grid into it

export function createClothScene(
  canvas: HTMLCanvasElement,
  { items, onTexts }: ClothSceneOptions,
): ClothSceneHandle {
  const N = items.length;
  let w = Math.max(1, canvas.clientWidth);
  let h = Math.max(1, canvas.clientHeight);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(BASE_COLOR, 10, 34);

  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 120);
  camera.position.set(0, 1.1, 5);
  camera.lookAt(0, -0.2, -2);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);

  /* ---- depth rails ("/|\") + inward-flowing light dots ----------------- */
  const floorDisposables: Array<{ dispose: () => void }> = [];

  // soft round sprite for the travelling light dots
  const makeGlowTexture = () => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(255,255,255,0.7)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  const buildFloor = () => {
    const group = new THREE.Group();
    group.position.y = -1.2;
    const GW = 12;
    const zNear = 7;
    const zFar = -26;
    const step = 1.4;

    // Depth rails only (no cross-lines): in perspective they converge to the
    // vanishing point, reading as a "/|\" fan that recedes into the fog.
    const lineXs: number[] = [];
    for (let x = -GW; x <= GW + 0.001; x += step) lineXs.push(x);
    const railVerts: number[] = [];
    lineXs.forEach((x) => railVerts.push(x, 0, zNear, x, 0, zFar));
    const railGeo = new THREE.BufferGeometry();
    railGeo.setAttribute('position', new THREE.Float32BufferAttribute(railVerts, 3));
    railGeo.computeBoundingSphere();
    const railMat = new THREE.LineBasicMaterial({ color: 0x2fbcdc, transparent: true, opacity: 0.26 });
    const rails = new THREE.LineSegments(railGeo, railMat);
    rails.frustumCulled = false;
    group.add(rails);
    floorDisposables.push(railGeo, railMat);

    // Light dots that travel inward (toward the vanishing point) along each rail.
    const DPL = 3; // dots per rail
    const Z0 = 3; // spawn just in front of the camera
    const Z1 = -24; // sink away into the fog
    const count = lineXs.length * DPL;
    const dPos = new Float32Array(count * 3);
    const dCol = new Float32Array(count * 3);
    const dBase = new Float32Array(count * 3); // each dot's full-brightness colour
    const dT = new Float32Array(count); // parametric position along the rail (0..1)
    const dSpeed = new Float32Array(count);
    const dX = new Float32Array(count);
    let di = 0;
    for (const x of lineXs) {
      for (let k = 0; k < DPL; k++) {
        dT[di] = (k / DPL + Math.random() * 0.12) % 1; // stagger so they don't march in lockstep
        dSpeed[di] = 0.05 + Math.random() * 0.05; // t units per second
        dX[di] = x;
        const sunset = Math.random() < 0.18; // mostly ocean-teal, a few warm ones
        dBase[di * 3] = sunset ? 0.97 : 0.18;
        dBase[di * 3 + 1] = sunset ? 0.65 : 0.74;
        dBase[di * 3 + 2] = sunset ? 0.17 : 0.86;
        di++;
      }
    }
    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
    dotGeo.setAttribute('color', new THREE.BufferAttribute(dCol, 3));
    dotGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, (Z0 + Z1) / 2), 60);
    const dotTex = makeGlowTexture();
    const dotMat = new THREE.PointsMaterial({
      size: 0.3,
      sizeAttenuation: true, // dots shrink as they recede → reinforces the depth
      map: dotTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    const dots = new THREE.Points(dotGeo, dotMat);
    dots.frustumCulled = false;
    group.add(dots);
    floorDisposables.push(dotGeo, dotMat, dotTex);

    const update = (dt: number) => {
      for (let i = 0; i < count; i++) {
        let t = dT[i] + dSpeed[i] * dt;
        if (t >= 1) t -= 1; // wrap back to the spawn point
        dT[i] = t;
        const ix = i * 3;
        dPos[ix] = dX[i];
        dPos[ix + 1] = 0;
        dPos[ix + 2] = Z0 + (Z1 - Z0) * t;
        // fade in at the spawn, fade out before the far end (fog finishes the job)
        const fade = smooth(0, 0.12, t) * (1 - smooth(0.82, 1, t));
        dCol[ix] = dBase[ix] * fade;
        dCol[ix + 1] = dBase[ix + 1] * fade;
        dCol[ix + 2] = dBase[ix + 2] * fade;
      }
      dotGeo.attributes.position.needsUpdate = true;
      dotGeo.attributes.color.needsUpdate = true;
    };
    update(0);

    return { group, update };
  };
  const floor = buildFloor();
  scene.add(floor.group);

  /* ---- sheets ----------------------------------------------------------- */
  const PW = 2.4;
  const PH = 1.6;
  const SX = 56;
  const SY = 38;
  const HALFH = PH / 2;
  // ── pull-arrival tuning (dial the "yank" feel) ──
  const DIAG = 3.0; // grab→far-corner span, used to normalise per-vertex lag
  const LEAD = 0.3; // how far the far edge lags behind the grabbed corner (0..1)
  const TRAIL_DEPTH = 0.5; // how far the trailing body streams back, in world units

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');

  const sheets: Sheet[] = items.map((it) => {
    const geo = new THREE.PlaneGeometry(PW, PH, SX, SY);
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const base = (posAttr.array as Float32Array).slice(0);
    const pos = posAttr.array as Float32Array;
    const col = new Float32Array(posAttr.count * 3);
    col.fill(1);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    // Cache a generous bounding sphere now (positions are still flat/valid) so
    // three never auto-recomputes it from the live-deformed buffer — avoids a
    // NaN-radius warning if it's ever inspected mid-update (e.g. on HMR teardown).
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4);

    const tex = loader.load(it.image);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false; // deformation + group transforms move it around
    const group = new THREE.Group();
    group.add(mesh);
    scene.add(group);

    return { group, mesh, geo, base, pos, col, mat, tex, deformed: false };
  });

  /* ---- choreography poses ---------------------------------------------- */
  const waitingPose = (i: number): Pose => ({
    pos: new THREE.Vector3(0, -1.05, -9 - i * 0.6),
    rotX: -1.15,
    scale: 0.96,
    op: 0.34,
  });
  const frontPose: Pose = { pos: new THREE.Vector3(0, 0.18, 1.35), rotX: 0, scale: 1, op: 1 };
  const parkedPose = (i: number): Pose => ({
    pos: new THREE.Vector3(-2.8 + i * 0.2, -0.72, -2.4 - i * 0.7),
    rotX: -0.55,
    scale: 0.66,
    op: 0.4,
  });

  const resetFlat = (s: Sheet) => {
    if (!s.deformed) return;
    s.pos.set(s.base);
    s.col.fill(1);
    s.geo.attributes.position.needsUpdate = true;
    s.geo.attributes.color.needsUpdate = true;
    s.deformed = false;
  };

  // Cloth deformation — the visible "pull". A grabbed bottom corner is hauled
  // toward the camera (big bend, strongest near the grab) while a few large
  // diagonal folds fan across the fabric. `amp` (0..1) is the pull strength;
  // `phase` shifts the creases so they travel as the sheet is dragged. Crease
  // light/shadow is baked into the vertex colour so the folds read on the photo.
  // At amp = 0 the colour returns to full brightness (flat, un-pulled sheet).
  const deform = (s: Sheet, amp: number, phase: number, pull: number) => {
    const { base, pos, col } = s;
    const n = pos.length / 3;
    const grabX = PW * 0.3; // pull from a bottom corner → diagonal drape
    const grabY = -HALFH * 0.9;
    for (let i = 0; i < n; i++) {
      const ix = i * 3;
      const x = base[ix];
      const y = base[ix + 1];
      const free = clamp((HALFH - y) / PH, 0, 1); // 0 at pinned top edge, 1 at free bottom
      const dx = x - grabX;
      const dy = y - grabY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Each vertex arrives later the further it sits from the grabbed corner, so
      // the corner leads to the front while the body trails behind under tension
      // and then catches up — the actual "being pulled" motion. easeOutBack adds
      // a small overshoot so the fabric snaps flat (elastic release) on settle.
      const lag = clamp(dist / DIAG, 0, 1);
      const arrival = easeOutBack(clamp((pull - lag * LEAD) / (1 - LEAD), 0, 1));
      const trailZ = -(1 - arrival) * lag * TRAIL_DEPTH; // streams back behind the corner
      // main drag: fabric drawn toward the camera, concentrated at the grab
      const drag = amp * Math.exp(-dist * 1.0) * (0.3 + 0.7 * free) * 0.44;
      // soft diagonal folds + a cross fold + finer creases near the grab
      const diag = x * 0.8 + y * 0.6;
      const fold1 = Math.sin(diag * 3.2 + dist * 1.5 - phase) * 0.17 * amp * free;
      const fold2 = Math.sin((x * 0.6 - y * 0.9) * 3.8 + 0.8) * 0.1 * amp * free;
      const fold3 = Math.sin(dist * 6.5 - phase * 1.4) * 0.06 * amp * free * Math.exp(-dist * 0.7);
      const folds = fold1 + fold2 + fold3;
      pos[ix + 2] = drag + folds + trailZ;
      // crease light/shadow — folds dominate so the wrinkles read on the photo;
      // trailing fabric dims a touch as it streams back into shadow
      const delta = clamp(folds * 7.0 + drag * 0.4 + trailZ * 0.5, -0.5, 0.45);
      const shade = clamp(1 + Math.max(amp, 1 - arrival) * (delta - 0.3), 0.18, 1.12);
      col[ix] = shade;
      col[ix + 1] = shade;
      col[ix + 2] = shade;
    }
    s.geo.attributes.position.needsUpdate = true;
    s.geo.attributes.color.needsUpdate = true;
    s.deformed = true;
  };

  const applyPose = (s: Sheet, p: Pose) => {
    s.group.position.copy(p.pos);
    s.group.rotation.x = p.rotX;
    s.group.scale.setScalar(p.scale);
    s.mat.opacity = p.op;
  };

  const win = 1 / N;

  // Evaluate the whole scene at progress `p`; returns each sheet's text opacity.
  const apply = (p: number): number[] => {
    p = clamp(p, 0, 1);
    const texts = new Array<number>(N).fill(0);

    for (let i = 0; i < N; i++) {
      const s = sheets[i];
      const ws = i * win; // drag-in starts
      const we = (i + 1) * win; // settled (front & centre)
      const isLast = i === N - 1;
      let pose: Pose;
      let text = 0;

      if (p < ws) {
        // waiting far back on the floor
        resetFlat(s);
        pose = waitingPose(i);
      } else if (p <= we) {
        // dragging in: the sheet reaches front & large by ~70% of the window,
        // arriving still wrinkled/tensioned, then the fabric relaxes flat and
        // the text fades in — so the cloth "pull" is seen at full size.
        const tl = (p - ws) / win;
        // the grabbed corner reaches the front by ~62% of the window; the body
        // (per-vertex trailing in `deform`) catches up close behind → a gentle draw.
        const travel = easeIO(clamp(tl / 0.62, 0, 1));
        pose = lerpPose(waitingPose(i), frontPose, travel);
        const amp = smooth(0, 0.4, tl) * (1 - smooth(0.78, 0.96, tl));
        deform(s, amp, tl * 7, tl);
        text = smooth(0.84, 1, tl);
      } else if (isLast) {
        // last sheet holds front & centre to the end
        resetFlat(s);
        pose = frontPose;
        text = 1;
      } else {
        // recede into the parked pile while the next sheet draws in
        resetFlat(s);
        const re = we + win;
        const r = clamp((p - we) / (re - we), 0, 1);
        pose = lerpPose(frontPose, parkedPose(i), easeIO(r));
        text = 1 - smooth(0, 0.35, r);
      }

      applyPose(s, pose);
      texts[i] = text;
    }
    return texts;
  };

  /* ---- render loop ------------------------------------------------------ */
  let currentP = 0;
  let targetP = 0;
  let running = false;
  let raf = 0;

  let lastT = performance.now();
  const frame = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000); // clamp so a tab-switch doesn't jump the dots
    lastT = now;
    currentP += (targetP - currentP) * 0.12;
    if (Math.abs(targetP - currentP) < 0.0002) currentP = targetP;
    floor.update(dt);
    const texts = apply(currentP);
    onTexts?.(texts);
    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(frame);
  };

  // first paint so the section is correct before it scrolls into view
  onTexts?.(apply(0));
  renderer.render(scene, camera);

  return {
    setProgress(p: number) {
      targetP = clamp(p, 0, 1);
    },
    resize() {
      w = Math.max(1, canvas.clientWidth);
      h = Math.max(1, canvas.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      renderer.render(scene, camera);
    },
    start() {
      if (running) return;
      running = true;
      lastT = performance.now(); // avoid a large dt after being paused off-screen
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
    dispose() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      sheets.forEach((s) => {
        scene.remove(s.group);
        s.geo.dispose();
        s.mat.dispose();
        s.tex.dispose();
      });
      scene.remove(floor.group);
      floorDisposables.forEach((d) => d.dispose());
      renderer.dispose();
    },
  };
}
