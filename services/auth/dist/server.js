import { fastify } from 'fastify';
import { initDb } from './db.js';
import authRoutes from './routes/auth.routes.js';
import { jwtPluginRegister } from './plugins/jwtPlugin.js';
import fastifyJwt from '@fastify/jwt';
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
            server.decorate('db', await initDb());
            await server.register(fastifyJwt, jwtPluginRegister);
            // server.addHook('onRequest', jwtPluginHook)
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
