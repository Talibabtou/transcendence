import { fastify } from 'fastify';
import { initDb } from './db.js';
import authRoutes from './routes/auth.routes.js';
import { jwtPluginRegister, jwtPluginHook } from './plugins/jwtPlugin.js';
import fastifyJwt from '@fastify/jwt';
const server = fastify({ logger: true });
const start = async () => {
    try {
        server.decorate('db', await initDb());
        await server.register(fastifyJwt, jwtPluginRegister);
        server.addHook('onRequest', jwtPluginHook);
        await server.register(authRoutes);
        server.listen({ port: 8082, host: 'localhost' }, (err, address) => {
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
