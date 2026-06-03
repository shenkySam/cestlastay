import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The internal Hotel-Manager web app runs on :5173 — keep the guest landing on its
// own port so both can run side by side during development.
export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
  preview: { port: 5174 },
});
