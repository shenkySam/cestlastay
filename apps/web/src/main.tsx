import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
// Self-hosted fonts (bundled by Vite; no Google Fonts request)
import '@fontsource-variable/caveat';
import '@fontsource-variable/cormorant-garamond';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource-variable/jost';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: { background: '#363636', color: '#fff' },
        success: { style: { background: '#16a34a' } },
        error: { style: { background: '#dc2626' } },
      }}
    />
  </React.StrictMode>,
);
