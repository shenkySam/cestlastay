import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Interactive faceted golden sphere — an abstraction of the Matrimandir.
 * Flat-shaded icosahedron in Matrimandir gold; turns toward the cursor.
 * Self-contained WebGL; pauses when offscreen. Honours reduced-motion.
 */
export default function MatrimandirSphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = prefersReducedMotion();

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 6.5);

    const geo = new THREE.IcosahedronGeometry(1.95, 3);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xc9a23a,
      metalness: 0.95,
      roughness: 0.32,
      flatShading: true,
      emissive: new THREE.Color(0xc9a23a),
      emissiveIntensity: 0.07,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.y = 0.94; // gently flattened, like the real structure
    scene.add(mesh);

    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(4, 6, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xfff2dc, 1.1);
    rim.position.set(-6, -1, -4);
    scene.add(rim);
    scene.add(new THREE.AmbientLight(0xffffff, 0.22));

    const controls = new OrbitControls(camera, canvas);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableRotate = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    // Pointer-follow: sphere turns toward the cursor's direction.
    const target = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      const maxAngle = 1.0;
      target.y = nx * maxAngle;
      target.x = ny * maxAngle * 0.55;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    const resize = () => {
      const cw = canvas.clientWidth || 1;
      const ch = canvas.clientHeight || 1;
      renderer.setSize(cw, ch, false);
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
    };

    let running = true;
    const io =
      'IntersectionObserver' in window
        ? new IntersectionObserver(([e]) => (running = e.isIntersecting), { threshold: 0.01 })
        : null;
    io?.observe(canvas);
    const ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
    ro?.observe(canvas);
    window.addEventListener('resize', resize);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!running) return;
      mesh.rotation.y += (target.y - mesh.rotation.y) * 0.07;
      mesh.rotation.x += (target.x - mesh.rotation.x) * 0.07;
      controls.update();
      renderer.render(scene, camera);
    };
    resize();
    if (reduce) renderer.render(scene, camera);
    else loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', resize);
      io?.disconnect();
      ro?.disconnect();
      controls.dispose();
      geo.dispose();
      mat.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab', touchAction: 'pan-y' }}
    />
  );
}
