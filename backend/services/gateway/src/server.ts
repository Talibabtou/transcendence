import {
  corsConfig,
  helmetConfig,
  staticConfig,
  fastifyConfig,
  multipartConfig,
  rateLimitConfig,
  swaggerConfig,
  swaggerUiConfig,
} from './config/index.js';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fastifyJwt from '@fastify/jwt';
import routes from './routes/index.js';
import fastifyStatic from '@fastify/static';
import rateLimit from '@fastify/rate-limit';
// import { Http2SecureServer } from 'http2';
import fastifySwagger from '@fastify/swagger';
import websocketPlugin from '@fastify/websocket';
import fastifyMultipart from '@fastify/multipart';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { fastify, FastifyInstance } from 'fastify';
import errorHandler from './config/errorHandler.js';
import websocketRoutes from './plugins/websocketPlugin.js';
import { addHeaders, blockHeaders } from './config/headers.js';
import { jwtPluginHook, jwtPluginRegister } from './plugins/jwtPlugin.js';
import { checkMicroservices, checkMicroservicesHook } from './controllers/gateway.controller.js';

export class Server {
  // FastifyInstance<Http2SecureServer> for https
  private static instance: FastifyInstance;
  public static microservices: Map<string, boolean> = new Map();

  private constructor() {}

  // FastifyInstance<Http2SecureServer> for https
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
      server.addHook('onRequest', jwtPluginHook);
      server.addHook('onRequest', blockHeaders);
      // server.addHook('preValidation', checkMicroservicesHook);
      server.addHook('onSend', addHeaders);
      await server.register(fastifySwagger, swaggerConfig);
      await server.register(fastifySwaggerUi, swaggerUiConfig);
      await server.register(rateLimit, rateLimitConfig);
      await server.register(fastifyMultipart, multipartConfig);
      await server.register(fastifyStatic, staticConfig);
      // await server.register(helmet, helmetConfig);
      await server.register(cors, corsConfig);
      await server.register(fastifyJwt, jwtPluginRegister);
      await server.register(websocketPlugin);
      await server.register(routes);
      await server.register(websocketRoutes);

      await server.listen({
        port: Number(process.env.GATEWAY_PORT) || 8085,
        host: process.env.GATEWAY_ADDR || 'localhost',
      });
      server.log.info(
        `Server listening at http://${process.env.GATEWAY_ADDR || 'localhost'}:${process.env.GATEWAY_PORT || 8085}`
      );
      // setInterval(checkMicroservices, 2000);
    } catch (err) {
      server.log.error(err);
    }
  }

  public static async shutdown(signal: string): Promise<void> {
    // FastifyInstance<Http2SecureServer> for https
    const server: FastifyInstance = Server.getInstance();
    server.log.info('Server has been closed.');
    server.log.info(`Received ${signal}.`);
    await server.close();
    process.exit(0);
  }
}

Server.start();
