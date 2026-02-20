import { defineConfig } from 'vite';

export default defineConfig({
  root: 'demo',
  base: '/midday.js/',
  build: {
    outDir: '../demo-dist',
    emptyOutDir: true,
  },
});
