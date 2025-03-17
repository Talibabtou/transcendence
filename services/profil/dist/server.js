import { fastify } from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import profilRoutes from './routes/profil.routes.js';
import { jwtPluginRegister, jwtPluginHook } from './plugins/jwtPlugin.js';
import fastifyJwt from '@fastify/jwt';
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
        server.addHook('onRequest', jwtPluginHook);
        await server.register(profilRoutes);
        server.listen({ port: 8081, host: 'localhost' }, (err, address) => {
            if (err)
                throw new Error("server listen");
            server.log.info(`Server listening at ${address}`);
        });
    }
    catch (err) {
        server.log.error('Fatal error', err.message);
        process.exit(1);
    }
};
const shutdownServer = async (signal) => {
    server.log.info(`\nReceived ${signal}. Shutting down gracefully...`);
    server.log.info('Server has been closed.');
    await server.close();
    process.exit(0);
};
process.on('SIGINT', () => shutdownServer('SIGINT'));
process.on('SIGTERM', () => shutdownServer('SIGTERM'));
start();
