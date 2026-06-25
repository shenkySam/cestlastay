// Boots the Earthen landing's WebGL: the interactive Matrimandir sphere and the
// scroll-driven particle scene. Loaded as a static ES module from /public, so
// Vite serves it untouched and the browser resolves `three` via the importmap
// in index.html. `particles.js` (a classic script) runs first and exposes
// window.Particles, which we use for the hero fireflies.
import { initSphere } from './sphere.js';
import { initScene } from './scene-earthen.js';

const sphereEl = document.getElementById('sphere');
if (sphereEl) {
  window.__sphere = initSphere(sphereEl, {
    color: 0xc9a23a,
    metalness: 0.95,
    roughness: 0.32,
    emissive: 0xc9a23a,
    emissiveIntensity: 0.07,
    exposure: 1.08,
    pointerFollow: true,
    sensitivity: 0.5,
  });
  window.dispatchEvent(new Event('sphereready'));
}

const fxEl = document.getElementById('fx-bg');
if (fxEl) {
  window.__scene = initScene(fxEl);
}

const heroCanvas = document.querySelector('.fx-hero');
if (heroCanvas && window.Particles) {
  window.Particles.fireflies(heroCanvas, {
    color: '#f0c982',
    count: 64,
    maxSize: 3.4,
    speed: 1.05,
    waves: false,
  });
}
