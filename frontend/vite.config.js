import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        analysis: resolve(__dirname, 'analysis.html'),
        sensors: resolve(__dirname, 'sensors.html'),
        sync: resolve(__dirname, 'sync.html'),
      },
    },
  },
  server: {
    port: 3000,
  },
});
