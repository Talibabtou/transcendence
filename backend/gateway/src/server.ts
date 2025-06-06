import {
  corsConfig,
  helmetConfig,
  staticConfig,
  fastifyConfig,
  multipartConfig,
  rateLimitConfig,
  swaggerConfig,
  swaggerUiConfig,
} from './config/index.config.js';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fastifyJwt from '@fastify/jwt';
import fastifyStatic from '@fastify/static';
import rateLimit from '@fastify/rate-limit';
import routes from './routes/index.routes.js';
import fastifySwagger from '@fastify/swagger';
import websocketPlugin from '@fastify/websocket';
import fastifyMultipart from '@fastify/multipart';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { fastify, FastifyInstance } from 'fastify';
import websocketRoutes from './middleware/websocket.js';
import { jwtHook, jwtRegister } from './middleware/jwt.js';
import errorHandler from './config/errorHandler.config.js';
import { addHeaders, blockHeaders } from './config/headers.config.js';
import { checkMicroservices, checkMicroservicesHook } from './controllers/gateway.controller.js';
import { startTelemetry } from './telemetry/telemetry.js';

export class Server {
  private static instance: FastifyInstance;
  public static microservices: Map<string, boolean> = new Map();

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
      server.setErrorHandler(errorHandler);
      server.addHook('onRequest', jwtHook);
      server.addHook('onRequest', blockHeaders);
      server.addHook('preValidation', checkMicroservicesHook);
      server.addHook('onSend', addHeaders);
      await server.register(fastifySwagger, swaggerConfig);
      await server.register(fastifySwaggerUi, swaggerUiConfig);
      await server.register(rateLimit, rateLimitConfig);
      await server.register(fastifyMultipart, multipartConfig);
      await server.register(fastifyStatic, staticConfig);
      await server.register(helmet, helmetConfig);
      await server.register(cors, corsConfig);
      await server.register(fastifyJwt, jwtRegister);
      await server.register(websocketPlugin);
      await server.register(routes);
      await server.register(websocketRoutes);

      server.addHook('onRequest', async (request, reply) => {
        if (request.url !== '/api/v1/health') {
          server.log.info(
            `Incoming Request: ${request.method} ${request.url} from ${request.ip}`
          );
        }
      });

      await server.listen({
        port: Number(process.env.GATEWAY_PORT) || 8085,
        host: '0.0.0.0',
      });
      server.log.info(
        `Server listening at https://${process.env.GATEWAY_ADDR || '0.0.0.0'}:${process.env.GATEWAY_PORT || 8085}`
      );
      setInterval(checkMicroservices, 2000);
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
