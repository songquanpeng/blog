import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  build: {
    outDir: '../public/admin',
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
      '/static': 'http://localhost:3000',
    },
  },
});
