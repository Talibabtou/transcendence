import { fastify } from 'fastify';
import authRoutes from './routes/auth.routes.js';
import fastifyJwt from '@fastify/jwt';

// const server = fastify({
// 	logger: true,
// 	http2: true,
// 	https: {
// 		key: readFileSync(path.join(path.resolve(), '/certs/key.pem')),
// 		cert: readFileSync(path.join(path.resolve(), '/certs/cert.pem'))
// 	}
// });

const server = fastify({ logger: false });

const start = async () => {
	try {
		await server.register(authRoutes, {prefix: '/api/v1/'});
		server.listen({ port: 8080, host: "localhost" }, (err: any, address: any) => {
			if (err)
				throw new Error("server.listen");
			console.log(`Server listening at ${address}`);
		})
	} catch (err: any) {
		console.error('Fatal error:', err);
		process.exit(1);
	}
}

const shutdownServer = async (signal: any) => {
	console.log(`\nReceived ${signal}. Shutting down gracefully...`);
	console.log('Server has been closed.');
	await server.close();
	process.exit(0);
};

process.on('SIGINT', () => shutdownServer('SIGINT'));
process.on('SIGTERM', () => shutdownServer('SIGTERM'));

start();