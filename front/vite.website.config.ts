import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	root: path.resolve(__dirname, 'src/website'),
	base: './',
	resolve: {
		alias: {
			'@pong': path.resolve(__dirname, './src/pong'),
			'@website': path.resolve(__dirname, './src/website'),
			'@shared': path.resolve(__dirname, './src/shared')
		}
	},
	build: {
		outDir: '../../dist/website',
		emptyOutDir: true,
		rollupOptions: {
			input: path.resolve(__dirname, 'src/website/index.html'),
			output: {
				entryFileNames: '[name].js',
				assetFileNames: 'assets/[name][extname]'
			}
		}
	}
});
