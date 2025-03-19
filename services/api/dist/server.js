import { fastify } from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import authRoutes from './routes/auth.routes.js';
import profilRoutes from './routes/profil.routes.js';
import fastifyJwt from '@fastify/jwt';
import { jwtPluginRegister } from './plugins/jwtPlugin.js';
// const server = fastify({
// 	logger: true,
// 	http2: true,
// 	https: {
// 		key: readFileSync(path.join(path.resolve(), '/certs/key.pem')),
// 		cert: readFileSync(path.join(path.resolve(), '/certs/cert.pem'))
// 	}
// });
class Server {
    static instance;
    constructor() { }
    static getInstance() {
        if (!Server.instance) {
            Server.instance = fastify({ logger: true });
        }
        return Server.instance;
    }
    static async start() {
        const server = Server.getInstance();
        try {
            process.on('SIGINT', () => Server.shutdown('SIGINT'));
            process.on('SIGTERM', () => Server.shutdown('SIGTERM'));
            await server.register(fastifyMultipart, {
                limits: {
                    fieldNameSize: 100, // Max field name size in bytes
                    fieldSize: 100, // Max field value size in bytes
                    fields: 10, // Max number of non-file fields
                    fileSize: 1000000, // For multipart forms, the max file size in bytes
                    files: 1, // Max number of file fields
                    headerPairs: 2000, // Max number of header key=>value pairs
                    parts: 1000 // For multipart forms, the max number of parts (fields + files)
                }
            });
            await server.register(fastifyJwt, jwtPluginRegister);
            // server.addHook('onRequest', jwtPluginHook)
            await server.register(authRoutes, { prefix: '/api/v1/' });
            await server.register(profilRoutes, { prefix: '/api/v1/' });
            server.listen({ port: 8080, host: "localhost" }, (err, address) => {
                if (err)
                    throw new Error("server listen");
                server.log.info(`Server listening at ${address}`);
            });
        }
        catch (err) {
            server.log.error('Fatal error', err.message);
            process.exit(1);
        }
    }
    static async shutdown(signal) {
        const server = Server.getInstance();
        server.log.info('Server has been closed.');
        server.log.info(`Received ${signal}.`);
        await server.close();
        process.exit(0);
    }
    ;
}
Server.start();
