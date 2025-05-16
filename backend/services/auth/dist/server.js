import { dbConnector } from './db.js';
import fastifyJwt from '@fastify/jwt';
import routes from './routes/auth.routes.js';
import { fastify } from 'fastify';
import { fastifyConfig } from './config/fastify.js';
import { startTelemetry } from './telemetry/telemetry.js';
import { jwtPluginRegister } from './plugins/jwtPlugin.js';
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
        const metricsPort = process.env.OTEL_EXPORTER_PROMETHEUS_PORT || 9464;
        try {
            process.once('SIGINT', () => Server.shutdown('SIGINT'));
            process.once('SIGTERM', () => Server.shutdown('SIGTERM'));
            await dbConnector(server);
            await server.register(routes);
            await server.register(fastifyJwt, jwtPluginRegister);
            await server.listen({
                port: Number(process.env.AUTH_PORT) || 8082,
                host: process.env.AUTH_ADDR || 'localhost',
            });
            server.log.info(`Server listening at http://${process.env.AUTH_ADDR || 'localhost'}:${process.env.AUTH_PORT || 8082}`);
            server.log.info(`Prometheus metrics exporter available at http://localhost:${metricsPort}/metrics`);
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
await startTelemetry();
Server.start();
