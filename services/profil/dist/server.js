import { fastify } from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import profilRoutes from './routes/profil.routes.js';
import { jwtPluginRegister, jwtPluginHook } from './plugins/jwtPlugin.js';
import fastifyJwt from '@fastify/jwt';
class Server {
    static instance;
    constructor() { }
    static getInstance() {
        if (!Server.instance)
            Server.instance = fastify({ logger: true });
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
            await server.register(profilRoutes);
            server.addHook('preHandler', jwtPluginHook);
            server.listen({ port: Number(process.env.PROFIL_PORT) || 8081, host: process.env.PROFIL_ADD || 'localhost' }, (err, address) => {
                if (err) {
                    server.log.error(`Failed to start server: ${err.message}`);
                    if (err.code === 'EADDRINUSE')
                        server.log.error(`Port ${Number(process.env.API_PORT) || 8081} is already in use`);
                    process.exit(1);
                }
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
