import routes from './routes/profile.routes.js';
import fastifyMultipart from '@fastify/multipart';
import { fastify, FastifyInstance } from 'fastify';
import { fastifyConfig } from './config/fastify.config.js';
import { multipartConfig } from './config/multipart.config.js';
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
    try {
      process.once('SIGINT', () => Server.shutdown('SIGINT'));
      process.once('SIGTERM', () => Server.shutdown('SIGTERM'));
      await server.register(fastifyMultipart, multipartConfig);
      await server.register(routes);
      await server.listen({
        port: Number(process.env.PROFILE_PORT) || 8081,
        host: process.env.PROFILE_ADDR || 'localhost',
      });
      server.log.info(
        `Server listening at http://${process.env.PROFILE_ADDR || 'localhost'}:${process.env.PROFILE_PORT || 8081}`
      );
    } catch (err) {
      server.log.error('Startup error:');
      server.log.error(err);
    }
  }

  public static async shutdown(signal: string): Promise<void> {
    const server: FastifyInstance = Server.getInstance();
    server.log.info('Server has been closed.');
    server.log.info(`Received ${signal}.`);
    await server.close();
    process.exit(0);
  }
}

await startTelemetry();
Server.start();
