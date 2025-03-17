import { fastify } from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import authRoutes from './routes/auth.routes.js';
import profilRoutes from './routes/profil.routes.js';
import fastifyJwt from '@fastify/jwt';
import { jwtPluginHook, jwtPluginRegister } from './plugins/jwtPlugin.js';

// const server = fastify({
// 	logger: true,
// 	http2: true,
// 	https: {
// 		key: readFileSync(path.join(path.resolve(), '/certs/key.pem')),
// 		cert: readFileSync(path.join(path.resolve(), '/certs/cert.pem'))
// 	}
// });

const server = fastify({ logger: true });

const start = async () => {
	try {
		await server.register(fastifyMultipart, {
			limits: {
			  fieldNameSize: 100,
			  fieldSize: 100,
			  fields: 10,
			  fileSize: 1000000,
			  files: 1,
			  headerPairs: 2000,
			  parts: 1000
			}
		});
		await server.register(fastifyJwt, jwtPluginRegister);
		server.addHook('onRequest', jwtPluginHook)
		await server.register(authRoutes, { prefix: '/api/v1/' });
		await server.register(profilRoutes, { prefix: '/api/v1/' });
		server.listen({ port: 8080, host: "localhost" }, (err: any, address: any) => {
			if (err)
				throw new Error("server listen");
			server.log.info(`Server listening at ${address}`);
		})
	} catch (err: any) {
		server.log.error('Fatal error', err.message);
		process.exit(1);
	}
}

const shutdownServer = async (signal: any) => {
	server.log.info(`\nReceived ${signal}. Shutting down gracefully...`);
	server.log.info('Server has been closed.');
	await server.close();
	process.exit(0);
};

process.on('SIGINT', () => shutdownServer('SIGINT'));
process.on('SIGTERM', () => shutdownServer('SIGTERM'));

start();