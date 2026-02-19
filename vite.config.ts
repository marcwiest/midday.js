import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'demo',
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'midday',
      formats: ['es', 'umd'],
      fileName: (format) => format === 'es' ? 'midday.mjs' : 'midday.umd.js',
    },
  },
});
