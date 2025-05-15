import { dbConnector } from './db.js';
import { routes } from './routes/index.js';
import fastify, { FastifyInstance } from 'fastify';
import { startTelemetry } from './telemetry/telemetry.js';
import { fastifyConfig } from './config/fastify.js';

class Server {
  private static instance: FastifyInstance;

  private constructor() {}

  public static getInstance(): FastifyInstance {
    if (!Server.instance) Server.instance = fastify(fastifyConfig);
    return Server.instance;
  }

  public static async start(): Promise<void> {
    const server = Server.getInstance();
    const metricsPort = process.env.OTEL_EXPORTER_PROMETHEUS_PORT || 9464;
    try {
      process.once('SIGINT', () => Server.shutdown('SIGINT'));
      process.once('SIGTERM', () => Server.shutdown('SIGTERM'));
      await dbConnector(server);
      await server.register(routes);
      await server.listen({
        port: Number(process.env.AUTH_PORT) || 8083,
        host: process.env.AUTH_ADDR || 'localhost',
      });
      server.log.info(
        `Server listening at http://${process.env.AUTH_ADDR || 'localhost'}:${process.env.AUTH_PORT || 8083}`
      );
      server.log.info(`Prometheus metrics exporter available at http://localhost:${metricsPort}/metrics`);
    } catch (err) {
      server.log.error('Startup error:');
      server.log.error(err);
    }
  }

  public static async shutdown(signal: string): Promise<undefined> {
    const server: FastifyInstance = Server.getInstance();
    server.log.info('Server has been closed.');
    server.log.info(`Received ${signal}.`);
    await server.close();
    process.exit(0);
  }
}

await startTelemetry();
Server.start();
