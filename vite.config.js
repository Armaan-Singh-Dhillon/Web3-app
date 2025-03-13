import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/thingsboard': {
        target: 'http://eu.thingsboard.cloud',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/thingsboard/, '')
      }
    }
  }
});
