import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Interactive faceted golden sphere — an abstraction of the Matrimandir.
// opts: { color, metalness, roughness, emissive, emissiveIntensity, exposure, bg,
//         pointerFollow, sensitivity }
// Returns a live control API: { setColor, setEmissive, setMetalness, setRoughness,
//         setMotion('cursor'|'auto'), setSensitivity }
export function initSphere(mount, opts = {}) {
  const {
    color = 0xc9a05c,
    metalness = 0.95,
    roughness = 0.3,
    emissive = 0x000000,
    emissiveIntensity = 0,
    exposure = 1.0,
    bg = null,
    pointerFollow = false,
  } = opts;

  let sens = opts.sensitivity ?? 0.5;
  let follow = pointerFollow;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: bg === null });
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%;cursor:grab';
  mount.appendChild(canvas);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;

  const scene = new THREE.Scene();
  if (bg !== null) scene.background = new THREE.Color(bg);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 6.5);

  // Faceted sphere — flat shading reads like the Matrimandir's disc-clad skin.
  const geo = new THREE.IcosahedronGeometry(1.95, 3);
  const mat = new THREE.MeshStandardMaterial({
    color, metalness, roughness, flatShading: true,
    emissive: new THREE.Color(emissive), emissiveIntensity,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.y = 0.94; // gently flattened, like the real structure
  scene.add(mesh);

  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(4, 6, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xfff2dc, 1.1); rim.position.set(-6, -1, -4); scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.22));

  const controls = new OrbitControls(camera, canvas);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.autoRotate = !follow;
  controls.enableRotate = !follow;
  controls.autoRotateSpeed = 0.9;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minPolarAngle = Math.PI * 0.30;
  controls.maxPolarAngle = Math.PI * 0.70;

  // Pointer-follow: sphere turns toward the cursor's direction.
  const target = { x: 0, y: 0 };
  function onPointer(e) {
    if (!follow) return;
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    const maxAngle = 0.45 + sens * 1.1; // sensitivity scales swing
    target.y = nx * maxAngle;
    target.x = ny * maxAngle * 0.55;
  }
  window.addEventListener('pointermove', onPointer, { passive: true });

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // Continuous Y-axis auto-spin, layered under the cursor-follow so both motions
  // co-exist. AUTO_SPIN is the single knob: radians/sec (negative reverses).
  const AUTO_SPIN = 0.18; // ≈ 10°/s, gentle (tunable)
  let spin = 0, followY = 0, followX = 0;
  const clock = new THREE.Clock();

  let running = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { running = e.isIntersecting; }, { threshold: 0.01 }).observe(canvas);
  }
  if ('ResizeObserver' in window) {
    new ResizeObserver(resize).observe(canvas);
  }
  window.addEventListener('resize', resize);

  function loop() {
    requestAnimationFrame(loop);
    const dt = clock.getDelta();
    if (!running) return;
    if (follow) {
      spin += AUTO_SPIN * dt;                  // continuous Y-axis auto-spin
      followY += (target.y - followY) * 0.07;  // unchanged cursor-follow easing
      followX += (target.x - followX) * 0.07;
      mesh.rotation.y = spin + followY;        // spin + cursor offset on Y
      mesh.rotation.x = followX;               // cursor tilt unchanged
    } else {
      controls.update();
    }
    renderer.render(scene, camera);
  }
  resize();
  loop();

  return {
    setColor(c) { mat.color.set(c); },
    setEmissive(c) { mat.emissive.set(c); },
    setMetalness(v) { mat.metalness = v; },
    setRoughness(v) { mat.roughness = v; },
    setSensitivity(v) { sens = v; },
    setMotion(mode) {
      follow = mode === 'cursor';
      controls.autoRotate = !follow;
      controls.enableRotate = !follow;
    },
  };
}
