import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // chessground's package "exports" hides its CSS; point straight at the files
    alias: { 'chessground-assets': fileURLToPath(new URL('./node_modules/chessground/assets', import.meta.url)) },
  },
  server: {
    port: 5173,
    // the API server (npm run server) owns all progress and answers
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: false } },
  },
});
