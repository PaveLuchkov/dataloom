/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base: './' emits relative asset URLs so the production build also works when
// loaded from file:// inside the Electron asar (replaces CRA's homepage: ".").
// outDir 'build' + assetsDir 'static' keeps electron-builder's files:["build/**"]
// config working while avoiding a name clash with the copied public/assets/.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 3000 },
  build: {
    outDir: 'build',
    assetsDir: 'static',
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: false,
  },
});
