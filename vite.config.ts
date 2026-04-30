import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// HTTPS in dev so getUserMedia works on iPhone over LAN; relative base in
// build so the same bundle works under any sub-path (GitHub Pages,
// Netlify drag-and-drop, etc.).
export default defineConfig(({ command }) => ({
  plugins: [react(), ...(command === 'serve' ? [basicSsl()] : [])],
  base: './',
  server: {
    host: true,
    https: true,
    port: 5173,
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
}));
