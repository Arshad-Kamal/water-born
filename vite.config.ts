import { defineConfig } from 'vite';

// Relative base so the build works at any GitHub Pages sub-path.
export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
});
