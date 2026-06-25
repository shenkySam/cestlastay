import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Warm earthen motes — clay, Matrimandir gold, amber, bronze, olive. Tuned to
// read on a LIGHT/cream page (normal blending, soft round sprites — not the
// additive glow used on a dark canvas).
const PALETTE: Array<[string, number]> = [
  ['#b1542e', 0.28], // clay / terracotta
  ['#c9a23a', 0.30], // matrimandir gold
  ['#c0792f', 0.20], // amber
  ['#8a4a26', 0.12], // deep bronze
  ['#7a7a3c', 0.10], // olive
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
 * Persistent, full-page WebGL background for the Earthen landing.
 *
 * A warm particle field that travels through three shapes as you scroll,
 * smoothly (eased), keyed to the real #matrimandir section:
 *   1. CLOUD   — gently floating embers (hero / top)
 *   2. RIPPLE  — a tilted concentric ripple disc that gathers BEHIND the
 *                Matrimandir sphere, reading like rings spreading from a drop
 *   3. TERRAIN — a wide undulating wave terrain, fully formed at the bottom
 *
 * Fixed behind all content; transparent so the cream page shows through.
 * Driven by window scroll (Lenis updates it). Honours reduced-motion.
 */
export default function SceneBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = prefersReducedMotion();
    const lerp = THREE.MathUtils.lerp;
    const ease = (t: number) => t * t * (3 - 2 * t);

    let w = window.innerWidth;
    let h = window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(62, w / h, 0.1, 100);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);

    const isMobile = w < 768;
    const COLS = isMobile ? 70 : 110;
    const ROWS = isMobile ? 46 : 68;
    const COUNT = COLS * ROWS;
    const GRID_W = 30;
    const GRID_D = 20;

    // Ripple disc placement — right of centre, behind where the sphere sits.
    const DCX = isMobile ? 0 : 3.4;
    const DCY = -0.2;
    const DZ = -0.6;
    const DISC_R = isMobile ? 3.6 : 4.6;
    const TILT = 1.02; // ~58° so the concentric rings read in perspective

    const initial = new Float32Array(COUNT * 3); // cloud
    const ripple = new Float32Array(COUNT * 3); // (localX, localZ, radius)
    const phase = new Float32Array(COUNT);
    const gridX = new Float32Array(COUNT);
    const gridZ = new Float32Array(COUNT);
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const c = new THREE.Color();

    const RINGS = isMobile ? 24 : 36;
    const SEG = Math.ceil(COUNT / RINGS);

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      initial[i3] = (Math.random() - 0.5) * 16;
      initial[i3 + 1] = (Math.random() - 0.5) * 10;
      initial[i3 + 2] = (Math.random() - 0.5) * 6;
      phase[i] = Math.random() * Math.PI * 2;

      // organised concentric ripple disc: rings of points (lx, lz, radius)
      const ring = Math.floor(i / SEG);
      const seg = i % SEG;
      const rad = (ring / (RINGS - 1)) * DISC_R;
      const ang = (seg / SEG) * Math.PI * 2 + ring * 0.18;
      ripple[i3] = rad * Math.cos(ang);
      ripple[i3 + 1] = rad * Math.sin(ang);
      ripple[i3 + 2] = rad;

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

    // round dot sprite — soft circles, not squares
    const dotCanvas = document.createElement('canvas');
    dotCanvas.width = dotCanvas.height = 64;
    const dg = dotCanvas.getContext('2d')!;
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
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.NormalBlending,
      vertexColors: true,
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const pos = posAttr.array as Float32Array;
    let prog = 0; // smoothed scroll progress

    const scrollProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    };
    // Scroll fraction where the Matrimandir section sits centred in the viewport.
    const domeFrac = () => {
      const sec = document.getElementById('matrimandir');
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (!sec || max <= 0) return 0.4;
      const center = sec.offsetTop + sec.offsetHeight / 2 - window.innerHeight / 2;
      return Math.min(0.85, Math.max(0.12, center / max));
    };

    const renderFrame = (t: number) => {
      prog += (scrollProgress() - prog) * 0.08; // eased, smooth — no snapping
      const A = domeFrac();
      const g = ease(prog <= A ? (A > 0 ? prog / A : 1) : 1); // cloud → ripple
      const s = ease(prog > A ? (prog - A) / (1 - A) : 0); // ripple → terrain

      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;
        // cloud (with gentle drift) → ripple disc
        const bob = (1 - g) * 0.5;
        const cx = initial[i3] + Math.sin(t * 0.3 + phase[i]) * bob;
        const cy = initial[i3 + 1] + Math.cos(t * 0.25 + phase[i]) * bob;
        const lx = ripple[i3];
        const lz = ripple[i3 + 1];
        const rad = ripple[i3 + 2];
        const wv = Math.sin(rad * 1.7 - t * 2.2) * 0.55; // travelling radial ripple
        const rx = DCX + lx;
        const ry = DCY + lz * Math.sin(TILT) + wv;
        const rz = DZ + lz * Math.cos(TILT);
        let bx = lerp(cx, rx, g);
        let by = lerp(cy, ry, g);
        let bz = lerp(initial[i3 + 2], rz, g);
        // ripple → wave terrain
        const gx = gridX[i];
        const gz = gridZ[i];
        const wave =
          Math.sin(gx * 0.35 + t * 0.6) * Math.cos(gz * 0.3 + t * 0.45) * 1.7;
        pos[i3] = lerp(bx, gx, s);
        pos[i3 + 1] = lerp(by, wave, s);
        pos[i3 + 2] = lerp(bz, gz, s);
      }
      posAttr.needsUpdate = true;

      // camera eases from a face-on cloud to a low, receding view of the terrain
      camera.position.set(0, s * 2.6, 7 + s * 5.5);
      camera.lookAt(0, -s * 0.9, -s * 5.5);
      renderer.render(scene, camera);
    };

    let clock: THREE.Clock | null = null;
    if (reduce) {
      prog = scrollProgress();
      renderFrame(0);
      const onScroll = () => renderFrame(0);
      window.addEventListener('scroll', onScroll, { passive: true });
      // store for cleanup
      (canvas as unknown as { __onScroll?: () => void }).__onScroll = onScroll;
    } else {
      clock = new THREE.Clock();
      renderer.setAnimationLoop(() => renderFrame(clock!.getElapsedTime()));
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

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', handleResize);
      const onScroll = (canvas as unknown as { __onScroll?: () => void }).__onScroll;
      if (onScroll) window.removeEventListener('scroll', onScroll);
      dotTex.dispose();
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
