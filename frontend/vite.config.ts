import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // split out three.js - let Vite handle everything else
          if (id.includes('node_modules/three/')) {
            return 'three';
          }
        },
      },
    },
  },
});
