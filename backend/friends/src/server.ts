import { dbConnector } from './db.js';
import { fastify, FastifyInstance } from 'fastify';
import friendsRoutes from './routes/friends.routes.js';
import { fastifyConfig } from './config/fastify.config.js';
import { startTelemetry } from './telemetry/telemetry.js';

class Server {
  private static instance: FastifyInstance;

  private constructor() {}

  public static getInstance(): FastifyInstance {
    if (!Server.instance) Server.instance = fastify(fastifyConfig);
    return Server.instance;
  }

  public static async start(): Promise<void> {
    const server = Server.getInstance();
		const metricsPort = process.env.OTEL_EXPORTER_PORT || 9464;
    try {
      process.once('SIGINT', () => Server.shutdown('SIGINT'));
      process.once('SIGTERM', () => Server.shutdown('SIGTERM'));
      await dbConnector(server);
      await server.register(friendsRoutes);
      await server.listen({
        port: Number(process.env.FRIENDS_PORT) || 8084,
        host: process.env.FRIENDS_ADDR || 'localhost',
      });
      server.log.info(
        `Server listening at http://${process.env.FRIENDS_ADDR || 'localhost'}:${process.env.FRIENDS_PORT || 8084}`
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
