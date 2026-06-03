import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const PARTICLE_COUNT = 15000;
const NEON_GREEN = '#39ff14';

/**
 * Scroll-driven WebGL hero: a 15k-particle neon galaxy that morphs into a
 * waving grid as you scroll, with a camera dolly down the Z-axis and
 * GSAP-driven text overlays. Entire three.js lifecycle lives in one useEffect.
 */
export default function HeroScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    /* ---------- sizes ---------- */
    const sizes = { width: window.innerWidth, height: window.innerHeight };

    /* ---------- scene / camera / renderer ---------- */
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#000010', 0.05);

    const camera = new THREE.PerspectiveCamera(70, sizes.width / sizes.height, 0.1, 100);
    camera.position.set(0, 4.2, 7); // elevated 3/4 view of the spiral
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    /* ---------- geometry: spiral (initial) + grid (target) + live ---------- */
    const initial = new Float32Array(PARTICLE_COUNT * 3);
    const grid = new Float32Array(PARTICLE_COUNT * 3);
    const positions = new Float32Array(PARTICLE_COUNT * 3);

    // galaxy params
    const BRANCHES = 5;
    const RADIUS = 5;
    const SPIN = 1.15;
    const RANDOMNESS = 0.45;
    const RANDOM_POWER = 2.6;

    // grid params (COLS * ROWS must equal PARTICLE_COUNT)
    const COLS = 150;
    const ROWS = PARTICLE_COUNT / COLS; // 100
    const GRID_W = 14;
    const GRID_D = 9;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // --- spiral / galaxy ---
      const radius = Math.pow(Math.random(), 0.65) * RADIUS;
      const branchAngle = ((i % BRANCHES) / BRANCHES) * Math.PI * 2;
      const spinAngle = radius * SPIN;
      const scatter = () =>
        Math.pow(Math.random(), RANDOM_POWER) *
        (Math.random() < 0.5 ? 1 : -1) *
        RANDOMNESS *
        radius;

      initial[i3] = Math.cos(branchAngle + spinAngle) * radius + scatter();
      initial[i3 + 1] = scatter() * 0.6;
      initial[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + scatter();

      // --- flat grid target ---
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      grid[i3] = (col / (COLS - 1) - 0.5) * GRID_W;
      grid[i3 + 1] = 0; // wave added per-frame in the render loop
      grid[i3 + 2] = (row / (ROWS - 1) - 0.5) * GRID_D;

      positions[i3] = initial[i3];
      positions[i3 + 1] = initial[i3 + 1];
      positions[i3 + 2] = initial[i3 + 2];
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(NEON_GREEN),
      size: 0.035,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    /* ---------- scroll-driven state ---------- */
    const morph = { value: 0 }; // 0 = spiral, 1 = grid
    const cameraRoll = { value: 0 };

    /* ---------- GSAP timeline + ScrollTrigger (scoped for clean teardown) ---------- */
    const overlays = overlayRefs.current;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: container,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
        },
      });

      tl.to(morph, { value: 1, duration: 10 }, 0)
        .to(camera.position, { y: 1.4, z: 3.2, duration: 10 }, 0)
        .to(cameraRoll, { value: 0.3, duration: 10 }, 0);

      if (overlays[0]) tl.to(overlays[0], { autoAlpha: 0, y: -40, duration: 2.5 }, 0.8);
      if (overlays[1])
        tl.fromTo(overlays[1], { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 2 }, 3.2).to(
          overlays[1],
          { autoAlpha: 0, y: -40, duration: 2 },
          5.6,
        );
      if (overlays[2])
        tl.fromTo(overlays[2], { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 2.2 }, 7.6);
    });

    /* ---------- resize ---------- */
    const handleResize = () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();
      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    window.addEventListener('resize', handleResize);

    /* ---------- render loop ---------- */
    const clock = new THREE.Clock();
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const pos = posAttr.array as Float32Array;

    renderer.setAnimationLoop(() => {
      const t = clock.getElapsedTime();
      const m = morph.value;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        const gx = grid[i3];
        const gz = grid[i3 + 2];
        const gy = Math.sin(gx * 0.6 + t * 1.5) * Math.cos(gz * 0.5 + t * 1.2) * 0.9;

        pos[i3] = THREE.MathUtils.lerp(initial[i3], gx, m);
        pos[i3 + 1] = THREE.MathUtils.lerp(initial[i3 + 1], gy, m);
        pos[i3 + 2] = THREE.MathUtils.lerp(initial[i3 + 2], gz, m);
      }
      posAttr.needsUpdate = true;

      points.rotation.y = t * 0.06 * (1 - m);

      camera.lookAt(0, 0, 0);
      camera.rotateZ(cameraRoll.value);
      renderer.render(scene, camera);
    });

    /* ---------- cleanup ---------- */
    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', handleResize);
      ctx.revert();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      scene.remove(points);
    };
  }, []);

  return (
    <div ref={containerRef} style={styles.container}>
      <canvas ref={canvasRef} style={styles.canvas} />

      <div style={styles.overlay}>
        <div ref={(el) => { overlayRefs.current[0] = el; }} style={styles.block}>
          <p style={styles.kicker}>Scroll to enter</p>
          <h1 style={styles.h1}>
            The Galaxy
            <br />
            Unwinds
          </h1>
        </div>

        <div ref={(el) => { overlayRefs.current[1] = el; }} style={{ ...styles.block, opacity: 0 }}>
          <h2 style={styles.h2}>
            Fifteen thousand points,
            <br />
            one fluid motion.
          </h2>
        </div>

        <div ref={(el) => { overlayRefs.current[2] = el; }} style={{ ...styles.block, opacity: 0 }}>
          <h2 style={styles.h2}>
            From spiral
            <br />
            to wave.
          </h2>
          <p style={styles.kicker}>Three.js · GSAP ScrollTrigger</p>
        </div>
      </div>
    </div>
  );
}

/* self-contained styles (no external CSS needed) */
const styles: Record<string, CSSProperties> = {
  container: { position: 'relative', height: '500vh', background: '#000010' },
  canvas: { position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', zIndex: 0 },
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1,
    pointerEvents: 'none',
    color: '#eafff0',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  block: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'min(90vw, 900px)',
    textAlign: 'center',
  },
  kicker: {
    margin: 0,
    letterSpacing: '0.4em',
    textTransform: 'uppercase',
    fontSize: '0.8rem',
    color: NEON_GREEN,
  },
  h1: { margin: '0.3em 0 0', fontSize: 'clamp(2.5rem, 9vw, 7rem)', lineHeight: 1.02, fontWeight: 700 },
  h2: { margin: 0, fontSize: 'clamp(1.8rem, 5vw, 3.6rem)', lineHeight: 1.1, fontWeight: 600 },
};
