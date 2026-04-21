import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://192.168.0.201:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://192.168.0.201:3001',
        changeOrigin: true,
      },
    },
  },
});
