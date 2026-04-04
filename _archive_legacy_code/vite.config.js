const path = require('path');
const react = require('@vitejs/plugin-react');

/** @type {import('vite').UserConfig} */
module.exports = {
  root: path.resolve(__dirname, 'frontend'),
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:3000',
      '/auth': 'http://localhost:3000'
    }
  },
  build: {
    outDir: path.resolve(__dirname, 'frontend', 'dist'),
    emptyOutDir: true
  }
};

