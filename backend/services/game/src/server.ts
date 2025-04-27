import eloRoutes from './routes/elo.routes.js';
import goalRoutes from './routes/goal.routes.js';
import fastify, { FastifyInstance } from 'fastify';
import matchRoutes from './routes/match.routes.js';
import systemRoutes from './routes/system.routes.js';
import databaseConnector from './db.js';
import { startTelemetry } from './telemetry/telemetry.js';
import tournamentRoutes from './routes/tournament.routes.js';

async function routes(server: FastifyInstance) {
  await server.register(eloRoutes);
  await server.register(goalRoutes);
  await server.register(matchRoutes);
  await server.register(tournamentRoutes);
  await server.register(systemRoutes);
}

class Server {
  private static instance: FastifyInstance;

  private constructor() {}

  public static getInstance(): FastifyInstance {
    if (!Server.instance) Server.instance = fastify({ logger: true });
    return Server.instance;
  }

  public static async start(): Promise<void> {
    const server: FastifyInstance = Server.getInstance();
    const metricsPort = process.env.OTEL_EXPORTER_PROMETHEUS_PORT || 9464;
    try {
      process.on('SIGINT', () => Server.shutdown('SIGINT'));
      process.on('SIGTERM', () => Server.shutdown('SIGTERM'));
      await server.register(databaseConnector);
      await server.register(routes);
      server.listen(
        {
          port: Number(process.env.GAME_PORT) || 8083,
          host: process.env.GAME_ADDR || '0.0.0.0',
        },
        (err, address) => {
          if (err) {
            server.log.error(`Failed to start server: ${err.message}`);
            if (err instanceof Error && err.message.includes('EADDRINUSE'))
              server.log.error(
                `Port ${Number(process.env.FRIENDS_PORT) || 8083} is already in use`
              );
            process.exit(1);
          }
          server.log.info(`Server listening at ${address}`);
          server.log.info(
            `Prometheus metrics exporter available at http://localhost:${metricsPort}/metrics`
          );
        }
      );
    } catch (err) {
      server.log.error(err);
      process.exit(1);
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
