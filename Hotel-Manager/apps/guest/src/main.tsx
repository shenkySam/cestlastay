import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// Lazy so three.js ships in its own chunk — the landing page never loads it.
const HeroScene = lazy(() => import('./components/scenes/HeroScene'));

// Landing page by default; the WebGL lab lives at /#scene so it stays isolated.
const isScene = window.location.hash === '#scene';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isScene ? (
      <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#000010' }} />}>
        <HeroScene />
      </Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);

// Re-pick the root when the hash toggles between the site and the scene.
window.addEventListener('hashchange', () => window.location.reload());
