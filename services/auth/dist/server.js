import { fastify, } from 'fastify';
import authRoutes from './routes/auth.routes.js';
import checkRoutes from './routes/check.routes.js';
const server = fastify({ logger: true });
const start = async () => {
    try {
        await server.register(authRoutes);
        await server.register(checkRoutes);
        await server.listen({ port: 8082, host: 'localhost' }, (err, address) => {
            if (err)
                throw new Error("server.listen");
            console.log(`Server listening at ${address}`);
        });
    }
    catch (e) {
        console.error({ error: e.message });
        process.exit(1);
    }
};
const shutdownServer = async (signal) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    await server.close();
    console.log('Server has been closed.');
    process.exit(0);
};
process.on('SIGINT', () => shutdownServer('SIGINT'));
process.on('SIGTERM', () => shutdownServer('SIGTERM'));
start();
