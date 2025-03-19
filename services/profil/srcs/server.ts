import { fastify, FastifyInstance } from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import profilRoutes from './routes/profil.routes.js';
import { jwtPluginRegister, jwtPluginHook } from './plugins/jwtPlugin.js'
import fastifyJwt from '@fastify/jwt';


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
			await server.register(profilRoutes);
			server.listen({ port: 8081, host: 'localhost' }, (err: any, address: any) => {
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