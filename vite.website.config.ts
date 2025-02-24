import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'src/website',
  base: './',
  resolve: {
    alias: {
      '@pong': path.resolve(__dirname, '../pong'),
      '@website': path.resolve(__dirname, '.'),
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  build: {
    outDir: '../../dist/website',
    emptyOutDir: true,
    rollupOptions: {
      input: './index.html',
      output: {
        entryFileNames: '[name].js',
        assetFileNames: 'assets/[name][extname]'
      }
    }
  }
});
