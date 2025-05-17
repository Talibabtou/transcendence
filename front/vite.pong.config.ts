import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	root: path.resolve(__dirname, 'src/pong'),
	base: './',
	resolve: {
		alias: {
			'@pong': path.resolve(__dirname, './src/pong'),
			'@shared': path.resolve(__dirname, './src/shared'),
			'@website': path.resolve(__dirname, './src/website')
		}
	},
	build: {
		outDir: '../../dist/pong',
		emptyOutDir: true,
		rollupOptions: {
			input: path.resolve(__dirname, 'src/pong/main.ts'),
			output: {
				entryFileNames: 'main.js',
				assetFileNames: '[name][extname]'
			},
			external: [/^@website\/.*/]
		},
		minify: false
	}
});
