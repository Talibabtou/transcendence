import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	root: 'src/pong',
	base: './',
	resolve: {
		alias: {
			'@pong': path.resolve(__dirname, './src/pong'),
			'@shared': path.resolve(__dirname, './src/shared')
		}
	},
	build: {
		outDir: '../../dist/pong',
		emptyOutDir: true,
		rollupOptions: {
			input: './main.ts',
			output: {
				entryFileNames: 'main.js',
				assetFileNames: '[name][extname]'
			}
		},
		minify: false
	}
});
