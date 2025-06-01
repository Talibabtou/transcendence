import { dbConnector } from './db.js';
import { routes } from './routes/index.routes.js';
import fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
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
    try {
      process.once('SIGINT', () => Server.shutdown('SIGINT'));
      process.once('SIGTERM', () => Server.shutdown('SIGTERM'));
      await dbConnector(server);
      await server.register(routes);
			server.addHook(
				'onRequest',
				async (request: FastifyRequest, reply: FastifyReply) => {
					if (!request.url.includes('health')) {
						server.log.info(
							`Incoming Request: ${request.method} ${request.url} from ${request.ip}`
						);
					}
				}
			);
      await server.listen({
        port: Number(process.env.GAME_PORT) || 8083,
        host: process.env.GAME_ADDR || 'localhost',
      });
      server.log.info(
        `Server listening at http://${process.env.GAME_ADDR || 'localhost'}:${process.env.GAME_PORT || 8083}`
      );
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
