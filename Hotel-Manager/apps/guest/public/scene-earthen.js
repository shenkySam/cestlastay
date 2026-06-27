import * as THREE from 'three';

// Earthen scroll scene — a warm particle field that moves through four
// ORGANISED shapes as you scroll, smoothly (eased), keyed to real sections:
//   0. CLOUD  — gently floating embers (top / hero)
//   1. FRAME  — an organised border framing the Philosophy quote (centre clear)
//   2. DOME   — a dense, organised lat/long lattice behind the Matrimandir sphere
//   3. TERRAIN— Alpha's travelling wave terrain, fully formed at the bottom
// three.js makes its own canvas inside `mount`. Recolored warm for cream.
export function initScene(mount, opts = {}) {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PALETTE = opts.palette || [
    ['#b1542e', 0.28], ['#c9a23a', 0.30], ['#c0792f', 0.20],
    ['#8a4a26', 0.12], ['#7a7a3c', 0.10],
  ];
  const pick = () => {
    const r = Math.random();
    let a = 0;
    for (const [hex, wgt] of PALETTE) { a += wgt; if (r <= a) return hex; }
    return PALETTE[0][0];
  };
  const lerp = THREE.MathUtils.lerp;
  const ease = (t) => t * t * (3 - 2 * t);

  let w = window.innerWidth, h = window.innerHeight;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, w / h, 0.1, 100);
  camera.position.set(0, 0, 7);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  mount.appendChild(canvas);
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h, false);

  const isMobile = w < 768;
  const COLS = isMobile ? 70 : 110;
  const ROWS = isMobile ? 46 : 68;
  const COUNT = COLS * ROWS;
  const GRID_W = 30, GRID_D = 20;

  // Ripple disc placement. DCX/DCY are fallbacks; the live center tracks the
  // on-screen position of the Matrimandir sphere (#sphere) each frame (see
  // frameTick) so the rings stay centered on it across scroll + viewport width.
  const DCX = isMobile ? 0 : 3.4;
  const DCY = -0.2;
  const DZ = -0.6;
  let dcxCur = DCX, dcyCur = DCY;
  const sphereEl = document.getElementById('sphere');
  const DISC_R = isMobile ? 3.6 : 4.6;
  const TILT = 1.02; // ~58° — so the concentric rings read in perspective

  const initial = new Float32Array(COUNT * 3); // cloud
  const frame = new Float32Array(COUNT * 3);    // organised frame
  const ripple = new Float32Array(COUNT * 3);    // concentric ripple disc (lx, lz, radius)
  const phase = new Float32Array(COUNT);
  const gridX = new Float32Array(COUNT);
  const gridZ = new Float32Array(COUNT);
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const c = new THREE.Color();

  // Frame geometry — hugs the viewport edges, hollow centre keeps text clear.
  const FW = 7.0, FH = 3.9, LAYERS = 4;
  function rectPt(u, hw, hh) {
    const W = 2 * hw, H = 2 * hh, P = 2 * (W + H);
    let d = u * P;
    if (d < W) return [-hw + d, hh];
    d -= W;
    if (d < H) return [hw, hh - d];
    d -= H;
    if (d < W) return [hw - d, -hh];
    d -= W;
    return [-hw, -hh + d];
  }

  // Organised concentric ripple disc — rings of points, like water rings.
  const RINGS = isMobile ? 24 : 36;
  const SEG = Math.ceil(COUNT / RINGS);

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    initial[i3] = (Math.random() - 0.5) * 16;
    initial[i3 + 1] = (Math.random() - 0.5) * 10;
    initial[i3 + 2] = (Math.random() - 0.5) * 6;
    phase[i] = Math.random() * Math.PI * 2;

    // organised frame: even along perimeter, in LAYERS concentric rings
    const layer = i % LAYERS;
    const idx = Math.floor(i / LAYERS);
    const fu = idx / Math.ceil(COUNT / LAYERS);
    const [fx, fy] = rectPt(fu, FW - layer * 0.22, FH - layer * 0.22);
    frame[i3] = fx;
    frame[i3 + 1] = fy;
    frame[i3 + 2] = (layer - 1.5) * 0.18;

    // organised concentric ripple disc: rings of points (lx, lz, radius)
    const ring = Math.floor(i / SEG);
    const seg = i % SEG;
    const rad = (ring / (RINGS - 1)) * DISC_R;
    const ang = (seg / SEG) * Math.PI * 2 + ring * 0.18;
    ripple[i3] = rad * Math.cos(ang);
    ripple[i3 + 1] = rad * Math.sin(ang);
    ripple[i3 + 2] = rad;

    const col = i % COLS, row = Math.floor(i / COLS);
    gridX[i] = (col / (COLS - 1) - 0.5) * GRID_W;
    gridZ[i] = (row / (ROWS - 1) - 0.5) * GRID_D;

    positions[i3] = initial[i3];
    positions[i3 + 1] = initial[i3 + 1];
    positions[i3 + 2] = initial[i3 + 2];
    c.set(pick());
    colors[i3] = c.r; colors[i3 + 1] = c.g; colors[i3 + 2] = c.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  // round dot sprite so points render as soft circles, not squares
  const dotCanvas = document.createElement('canvas');
  dotCanvas.width = dotCanvas.height = 64;
  const dg = dotCanvas.getContext('2d');
  const dgrd = dg.createRadialGradient(32, 32, 0, 32, 32, 32);
  dgrd.addColorStop(0, 'rgba(255,255,255,1)');
  dgrd.addColorStop(0.5, 'rgba(255,255,255,0.9)');
  dgrd.addColorStop(1, 'rgba(255,255,255,0)');
  dg.fillStyle = dgrd;
  dg.beginPath();
  dg.arc(32, 32, 32, 0, Math.PI * 2);
  dg.fill();
  const dotTex = new THREE.CanvasTexture(dotCanvas);

  const material = new THREE.PointsMaterial({
    size: isMobile ? 0.08 : 0.06,
    map: dotTex,
    alphaTest: 0.02,
    sizeAttenuation: true, transparent: true, opacity: 0.92,
    depthWrite: false, blending: THREE.NormalBlending, vertexColors: true,
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const posAttr = geometry.attributes.position;
  const pos = posAttr.array;
  let prog = 0;

  const scrollProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  };
  const sectionFrac = (el, fb) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (!el || max <= 0) return fb;
    return Math.min(0.92, Math.max(0.05, (el.offsetTop + el.offsetHeight / 2 - window.innerHeight / 2) / max));
  };

  const a = [0, 0, 0], b = [0, 0, 0];
  function coord(id, i, i3, t, out) {
    if (id === 0) { // cloud (with gentle drift)
      out[0] = initial[i3] + Math.sin(t * 0.3 + phase[i]) * 0.5;
      out[1] = initial[i3 + 1] + Math.cos(t * 0.25 + phase[i]) * 0.5;
      out[2] = initial[i3 + 2];
    } else if (id === 1) { out[0] = frame[i3]; out[1] = frame[i3 + 1]; out[2] = frame[i3 + 2]; }
    else if (id === 2) {
      const lx = ripple[i3], lz = ripple[i3 + 1], rad = ripple[i3 + 2];
      const wv = Math.sin(rad * 1.7 - t * 2.2) * 0.55; // traveling radial ripple
      out[0] = dcxCur + lx;
      out[1] = dcyCur + lz * Math.sin(TILT) + wv;
      out[2] = DZ + lz * Math.cos(TILT);
    }
    else {
      const gx = gridX[i], gz = gridZ[i];
      out[0] = gx;
      out[1] = Math.sin(gx * 0.35 + t * 0.6) * Math.cos(gz * 0.3 + t * 0.45) * 1.7;
      out[2] = gz;
    }
  }

  function frameTick(t) {
    prog += (scrollProgress() - prog) * 0.08;
    const Fp = sectionFrac(document.querySelector('section[data-screen-label="Philosophy"]'), 0.15);
    let Fm = sectionFrac(document.getElementById('matrimandir'), 0.32);
    Fm = Math.max(Fm, Fp + 0.05);

    let idA, idB, k, recede = 0;
    if (prog <= Fp) { idA = 0; idB = 1; k = Fp > 0 ? prog / Fp : 1; }
    else if (prog <= Fm) { idA = 1; idB = 2; k = (prog - Fp) / (Fm - Fp); }
    else { idA = 2; idB = 3; k = (prog - Fm) / (1 - Fm); recede = ease(k); }
    k = ease(k);

    // Center the ripple disc on the sphere's live on-screen position (inverse
    // of the camera projection at the disc plane z=DZ). One layout read/frame.
    const sEl = sphereEl || document.getElementById('sphere');
    if (sEl) {
      const r = sEl.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const tanHalf = Math.tan((62 * Math.PI / 180) / 2);
        const negViewZ = 7 - DZ; // camera at z=7, disc plane at z=DZ
        dcxCur = ((cx / w) * 2 - 1) * tanHalf * (w / h) * negViewZ;
        dcyCur = (-((cy / h) * 2 - 1)) * tanHalf * negViewZ;
      }
    }

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      coord(idA, i, i3, t, a);
      coord(idB, i, i3, t, b);
      pos[i3] = lerp(a[0], b[0], k);
      pos[i3 + 1] = lerp(a[1], b[1], k);
      pos[i3 + 2] = lerp(a[2], b[2], k);
    }
    posAttr.needsUpdate = true;

    camera.position.set(0, recede * 2.6, 7 + recede * 5.5);
    camera.lookAt(0, -recede * 0.9, -recede * 5.5);
    renderer.render(scene, camera);
  }

  if (reduce) {
    frameTick(0);
    window.addEventListener('scroll', () => frameTick(0), { passive: true });
  } else {
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => frameTick(clock.getElapsedTime()));
  }

  function onResize() {
    w = window.innerWidth; h = window.innerHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    if (reduce) frameTick(0);
  }
  window.addEventListener('resize', onResize);

  return {
    destroy() {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', onResize);
      geometry.dispose(); material.dispose(); renderer.dispose();
    },
  };
}
