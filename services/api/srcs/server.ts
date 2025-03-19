import { fastify, FastifyInstance } from 'fastify';
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

class Server {
    private static instance: FastifyInstance;

    private constructor() { }

    public static getInstance(): FastifyInstance {
        if (!Server.instance) {
            Server.instance = fastify({ logger: true });
        }
        return Server.instance;
    }

    public static async start(): Promise<void> {
		const server: FastifyInstance = Server.getInstance();
		try {
			process.on('SIGINT', () => Server.shutdown('SIGINT'));
			process.on('SIGTERM', () => Server.shutdown('SIGTERM'));
			await server.register(fastifyMultipart, {
				limits: {
					fieldNameSize: 100, // Max field name size in bytes
					fieldSize: 100,     // Max field value size in bytes
					fields: 10,         // Max number of non-file fields
					fileSize: 1000000,  // For multipart forms, the max file size in bytes
					files: 1,           // Max number of file fields
					headerPairs: 2000,  // Max number of header key=>value pairs
					parts: 1000         // For multipart forms, the max number of parts (fields + files)
				  }
			});
			await server.register(fastifyJwt, jwtPluginRegister);
			// server.addHook('onRequest', jwtPluginHook)
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

	public static async shutdown(signal: any): Promise<void> {
		const server: FastifyInstance = Server.getInstance();
		server.log.info('Server has been closed.');
		server.log.info(`Received ${signal}.`);
		await server.close();
		process.exit(0);
	};
}

Server.start();