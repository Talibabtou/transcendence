import { fastify } from 'fastify';
import friendsRoutes from './routes/friends.routes.js';
import { fastifyConfig } from './config/fastify.js';
import { dbConnector } from './db.js';
class Server {
    static instance;
    constructor() { }
    static getInstance() {
        if (!Server.instance)
            Server.instance = fastify(fastifyConfig);
        return Server.instance;
    }
    static async start() {
        const server = Server.getInstance();
        try {
            process.once('SIGINT', () => Server.shutdown('SIGINT'));
            process.once('SIGTERM', () => Server.shutdown('SIGTERM'));
            await dbConnector(server);
            await server.register(friendsRoutes);
            await server.listen({
                port: Number(process.env.AUTH_PORT) || 8084,
                host: process.env.AUTH_ADDR || 'localhost',
            });
            server.log.info(`Server listening at http://${process.env.AUTH_ADDR || 'localhost'}:${process.env.AUTH_PORT || 8084}`);
        }
        catch (err) {
            server.log.error('Startup error:');
            server.log.error(err);
        }
    }
    static async shutdown(signal) {
        const server = Server.getInstance();
        server.log.info('Server has been closed.');
        server.log.info(`Received ${signal}.`);
        await server.close();
        process.exit(0);
    }
}
Server.start();
