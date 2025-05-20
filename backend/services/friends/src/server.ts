import { fastify, FastifyInstance } from 'fastify';
import friendsRoutes from './routes/friends.routes.js';
import { fastifyConfig } from './config/fastify.js';
import { dbConnector } from './db.js';

/**
 * Server class for managing the Fastify server instance.
 * Provides methods to start and gracefully shut down the server.
 */
class Server {
  private static instance: FastifyInstance;

  /**
   * Private constructor to prevent direct instantiation.
   */
  private constructor() {}

  /**
   * Returns the singleton Fastify server instance.
   * If the instance does not exist, it creates one using the provided configuration.
   *
   * @returns The FastifyInstance singleton.
   */
  public static getInstance(): FastifyInstance {
    if (!Server.instance) Server.instance = fastify(fastifyConfig);
    return Server.instance;
  }

  /**
   * Starts the Fastify server, registers plugins and routes, and listens for incoming requests.
   * Also sets up graceful shutdown handlers for SIGINT and SIGTERM signals.
   *
   * @returns Promise<void>
   */
  public static async start(): Promise<void> {
    const server = Server.getInstance();
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
    } catch (err) {
      server.log.error('Startup error:');
      server.log.error(err);
    }
  }

  /**
   * Gracefully shuts down the Fastify server and exits the process.
   *
   * @param signal - The signal that triggered the shutdown (e.g., 'SIGINT', 'SIGTERM').
   * @returns Promise<undefined>
   */
  public static async shutdown(signal: string): Promise<undefined> {
    const server: FastifyInstance = Server.getInstance();
    server.log.info('Server has been closed.');
    server.log.info(`Received ${signal}.`);
    await server.close();
    process.exit(0);
  }
}

Server.start();
