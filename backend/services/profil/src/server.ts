import { fastify, FastifyInstance } from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import routes from './routes/profil.routes.js';

const multipartParams = {
  limits: {
    fieldNameSize: 100, // Max field name size in bytes
    fieldSize: 100, // Max field value size in bytes
    fields: 10, // Max number of non-file fields
    fileSize: 1000000, // For multipart forms, the max file size in bytes
    files: 1, // Max number of file fields
    headerPairs: 2000, // Max number of header key=>value pairs
    parts: 1000, // For multipart forms, the max number of parts (fields + files)
  },
};

class Server {
  private static instance: FastifyInstance;

  private constructor() {}

  public static getInstance(): FastifyInstance {
    if (!Server.instance) Server.instance = fastify({ logger: true });
    return Server.instance;
  }

  public static async start(): Promise<void> {
    const server: FastifyInstance = Server.getInstance();
    try {
      process.on('SIGINT', () => Server.shutdown('SIGINT'));
      process.on('SIGTERM', () => Server.shutdown('SIGTERM'));
      await server.register(fastifyMultipart, multipartParams);
      await server.register(routes);
      server.listen(
        {
          port: Number(process.env.PROFIL_PORT) || 8081,
          host: process.env.PROFIL_ADDR || '0.0.0.0',
        },
        (err, address) => {
          if (err) {
            server.log.error(`Failed to start server: ${err.message}`);
            if (err.message.includes('EADDRINUSE'))
              server.log.error(
                `Port ${Number(process.env.PROFIL_PORT) || 8081} is already in use`
              );
            process.exit(1);
          }
          server.log.info(`Server listening at ${address}`);
        }
      );
    } catch (err) {
      server.log.error(err);
      process.exit(1);
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

Server.start();
