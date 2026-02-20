import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'demo',
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    lib: {
      entry: {
        midday: resolve(__dirname, 'src/index.ts'),
        react: resolve(__dirname, 'src/react.ts'),
        vue: resolve(__dirname, 'src/vue.ts'),
        svelte: resolve(__dirname, 'src/svelte.ts'),
        solid: resolve(__dirname, 'src/solid.ts'),
      },
      formats: ['es'],
      fileName: (_, entryName) => `${entryName}.mjs`,
    },
    rollupOptions: {
      external: ['react', 'vue', 'solid-js'],
      output: {
        chunkFileNames: '[name].mjs',
      },
    },
  },
});
