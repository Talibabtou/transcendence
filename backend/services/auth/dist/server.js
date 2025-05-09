import { initDb } from './db.js';
import fastifyJwt from '@fastify/jwt';
import routes from './routes/auth.routes.js';
import { fastify } from 'fastify';
import { startTelemetry } from './telemetry/telemetry.js';
import { jwtPluginRegister } from './plugins/jwtPlugin.js';
class Server {
    static instance;
    constructor() { }
    static getInstance() {
        if (!Server.instance)
            Server.instance = fastify({
                logger: {
                    transport: {
                        target: 'pino-pretty',
                        options: {
                            colorize: true,
                            translateTime: 'SYS:standard',
                            ignore: 'pid,hostname',
                        },
                    },
                },
            });
        return Server.instance;
    }
    static async start() {
        const server = Server.getInstance();
        const metricsPort = process.env.OTEL_EXPORTER_PROMETHEUS_PORT || 9464;
        try {
            process.on('SIGINT', () => Server.shutdown('SIGINT'));
            process.on('SIGTERM', () => Server.shutdown('SIGTERM'));
            server.decorate('db', await initDb());
            await server.register(routes);
            await server.register(fastifyJwt, jwtPluginRegister);
            server.listen({
                port: Number(process.env.AUTH_PORT) || 8082,
                host: process.env.AUTH_ADDR || '0.0.0.0',
            }, (err, address) => {
                if (err) {
                    server.log.error(`Failed to start server: ${err.message}`);
                    if (err instanceof Error && err.message.includes('EADDRINUSE'))
                        server.log.error(`Port ${Number(process.env.AUTH_PORT) || 8082} is already in use`);
                    process.exit(1);
                }
                server.log.info(`Server listening at ${address}`);
                server.log.info(`Prometheus metrics exporter available at http://localhost:${metricsPort}/metrics`);
            });
        }
        catch (err) {
            server.log.error(err);
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
}
await startTelemetry();
Server.start();
