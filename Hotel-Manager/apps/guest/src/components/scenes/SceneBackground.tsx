import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Warm, on-brand light motes (sun glints / sea spray) + a few ocean glints.
const PALETTE: Array<[string, number]> = [
  ['#fff3d6', 0.30], // warm cream
  ['#ffd27a', 0.26], // soft gold
  ['#f7a52b', 0.18], // sunset
  ['#ffe9a8', 0.16], // pale sun
  ['#6fd6ec', 0.10], // ocean glint
];

function pickColor(): string {
  const r = Math.random();
  let acc = 0;
  for (const [hex, weight] of PALETTE) {
    acc += weight;
    if (r <= acc) return hex;
  }
  return PALETTE[0][0];
}

/**
 * Persistent, full-page WebGL background. A warm galaxy swirl that unwinds —
 * as you scroll the whole page — into a wide, gently undulating particle GRID
 * (a "wave terrain": a receding mesh in the centre with larger floating-wave
 * particles in the foreground). Fixed behind all content; transparent so the
 * dark body gradient shows through. Driven by window scroll (Lenis updates it),
 * with the rotation kept very slow so motion reads as smooth and scroll-led.
 */
export default function SceneBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = prefersReducedMotion();

    let w = window.innerWidth;
    let h = window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(62, w / h, 0.1, 100);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);

    /* ---- grid dimensions (cols * rows = particle count) ---- */
    const isMobile = w < 768;
    const COLS = isMobile ? 84 : 120;
    const ROWS = isMobile ? 56 : 76;
    const COUNT = COLS * ROWS;

    const GRID_W = 30; // terrain width
    const GRID_D = 20; // terrain depth

    const initial = new Float32Array(COUNT * 3); // galaxy swirl
    const gridX = new Float32Array(COUNT); // terrain target x
    const gridZ = new Float32Array(COUNT); // terrain target z (depth)
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);

    const c = new THREE.Color();

    // ---- "home" silhouette sampler: walls + roof + chimney, door & windows cut out ----
    const HCX = 1.3; // home sits right of the hero copy (applied as a position offset)
    const inDoor = (x: number, y: number) => x > -0.7 && x < 0.7 && y < -1.3;
    const inWindow = (x: number, y: number) =>
      y > -0.6 && y < 0.4 && ((x > -2.3 && x < -1.1) || (x > 1.1 && x < 2.3));
    const housePoint = (): [number, number] => {
      const pick = Math.random();
      let x: number;
      let y: number;
      if (pick < 0.64) {
        // walls — reject the door + window openings
        let tries = 0;
        do {
          x = -3 + Math.random() * 6;
          y = -4 + Math.random() * 4.6;
          tries += 1;
        } while ((inDoor(x, y) || inWindow(x, y)) && tries < 10);
      } else if (pick < 0.96) {
        // roof triangle: (-3.8,0.6) (3.8,0.6) (0,4)
        let a = Math.random();
        let b = Math.random();
        if (a + b > 1) {
          a = 1 - a;
          b = 1 - b;
        }
        x = -3.8 + a * 7.6 + b * 3.8;
        y = 0.6 + b * 3.4;
      } else {
        // chimney
        x = 1.5 + Math.random() * 0.7;
        y = 1.9 + Math.random() * 1.4;
      }
      return [x, y]; // centred at the local origin so it spins about itself
    };

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;

      // "home" shape (face-on, XY plane)
      const [hx, hy] = housePoint();
      initial[i3] = hx + (Math.random() - 0.5) * 0.12;
      initial[i3 + 1] = hy + (Math.random() - 0.5) * 0.12;
      initial[i3 + 2] = (Math.random() - 0.5) * 3.0; // depth, so the spin reads as 3D

      // terrain grid target (XZ plane, Y becomes the wave)
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      gridX[i] = (col / (COLS - 1) - 0.5) * GRID_W;
      gridZ[i] = (row / (ROWS - 1) - 0.5) * GRID_D;

      positions[i3] = initial[i3];
      positions[i3 + 1] = initial[i3 + 1];
      positions[i3 + 2] = initial[i3 + 2];

      c.set(pickColor());
      colors[i3] = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: isMobile ? 0.055 : 0.045,
      sizeAttenuation: true, // big foreground particles, small in the distance
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const pos = posAttr.array as Float32Array;

    const morph = { value: 0, target: 0 };
    // smoothed cursor position (-1..1) used to lean the home toward the pointer
    const pointer = { tx: 0, ty: 0, x: 0, y: 0 };

    const scrollProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    };

    const renderFrame = (t: number) => {
      // galaxy unwinds into the grid over the first ~45% of scroll, then the
      // wave terrain persists behind the rest of the page
      morph.target = Math.min(1, scrollProgress() / 0.45);
      morph.value += (morph.target - morph.value) * 0.05; // liquid, scroll-led ease
      const m = morph.value;

      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;
        const gx = gridX[i];
        const gz = gridZ[i];
        // gentle travelling wave across the terrain
        const wave =
          Math.sin(gx * 0.35 + t * 0.6) * Math.cos(gz * 0.3 + t * 0.45) * 1.7;
        pos[i3] = THREE.MathUtils.lerp(initial[i3], gx, m);
        pos[i3 + 1] = THREE.MathUtils.lerp(initial[i3 + 1], wave, m);
        pos[i3 + 2] = THREE.MathUtils.lerp(initial[i3 + 2], gz, m);
      }
      posAttr.needsUpdate = true;

      // the home turns slowly on its own axis AND leans toward the cursor
      // (smoothly eased, slow lag); all of it settles into the centred terrain
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      const home = 1 - m;
      // no auto-spin — the home only leans toward the cursor (smoothly eased);
      // the lean is scoped to the home and fades out as it becomes the terrain
      points.rotation.y = pointer.x * 0.5 * home;
      points.rotation.x = pointer.y * 0.28 * home;
      points.position.x = HCX * home;

      // camera eases (with scroll) from a face-on galaxy view to a low,
      // receding view across the wave terrain
      camera.position.set(0, m * 2.6, 7 + m * 5.5);
      camera.lookAt(0, -m * 0.9, -m * 5.5);

      renderer.render(scene, camera);
    };

    if (reduce) {
      renderFrame(0);
    } else {
      const clock = new THREE.Clock();
      renderer.setAnimationLoop(() => renderFrame(clock.getElapsedTime()));
    }

    const handleResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h, false);
      if (reduce) renderFrame(0);
    };
    window.addEventListener('resize', handleResize);

    const onPointer = (e: PointerEvent) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointer);

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', onPointer);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      scene.remove(points);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
