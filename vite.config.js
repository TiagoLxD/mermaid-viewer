import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base relativa: funciona em GitHub Pages (project site), Netlify, Vercel e file://
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: false },
  test: { setupFiles: ['src/test/setup.ts'] }
});
