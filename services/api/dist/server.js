import fastify from 'fastify';
import { readFileSync } from 'fs';
import path from 'path';
import authRoutes from './routes/auth.routes.js';
import checkRoutes from './routes/check.routes.js';
const server = fastify.fastify({
    logger: true,
    http2: true,
    https: {
        key: readFileSync(path.join(path.resolve(), '/certs/key.pem')),
        cert: readFileSync(path.join(path.resolve(), '/certs/cert.pem'))
    }
});
const start = async () => {
    try {
        await server.register(authRoutes, { prefix: '/api' });
        await server.register(checkRoutes, { prefix: '/api' });
        await server.listen({ port: 8080, host: "localhost" }, (err, address) => {
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
    console.log('Server has been closed.');
    process.exit(0);
};
process.on('SIGINT', () => shutdownServer('SIGINT'));
process.on('SIGTERM', () => shutdownServer('SIGTERM'));
start();
