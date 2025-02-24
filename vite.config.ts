import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'src/website',
  server: {
    port: 3000,
    open: true,
    watch: {
      ignored: ['!**/node_modules/**', '**/dist/**']
    }
  },
  resolve: {
    alias: {
      '@pong': path.resolve(__dirname, './src/pong'),
      '@website': path.resolve(__dirname, './src/website'),
      '@shared': path.resolve(__dirname, './src/shared')
    }
  }
});
