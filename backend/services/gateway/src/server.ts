import path from 'path';
import cors from '@fastify/cors';
// import helmet from '@fastify/helmet';
import fastifyJwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import fastifySwagger from '@fastify/swagger';
import gatewayRoutes from './routes/gateway.routes.js';
import eloRoutes from './routes/elo.routes.js';
import goalRoutes from './routes/goal.routes.js';
import authRoutes from './routes/auth.routes.js';
import tournamentRoutes from './routes/tournament.routes.js';
import fastifyMultipart from '@fastify/multipart';
import matchRoutes from './routes/match.routes.js';
import { fastify, FastifyInstance } from 'fastify';
import fastifySwaggerUi from '@fastify/swagger-ui';
import profilRoutes from './routes/profil.routes.js';
import friendsRoutes from './routes/friends.routes.js';
import { API_PREFIX } from './shared/constants/path.const.js';
import { jwtPluginHook, jwtPluginRegister } from './plugins/jwtPlugin.js';
import { checkMicroservices, checkMicroservicesHook } from './controllers/gateway.controller.js';

// const server = fastify({
// 	logger: true,
// 	http2: true,
// 	https: {
// 		key: readFileSync(path.join(path.resolve(), '/certs/key.pem')),
// 		cert: readFileSync(path.join(path.resolve(), '/certs/cert.pem'))
// 	}
// });

async function routes(server: FastifyInstance) {
  await server.register(eloRoutes, { prefix: API_PREFIX });
  await server.register(gatewayRoutes, { prefix: API_PREFIX });
  await server.register(authRoutes, { prefix: API_PREFIX });
  await server.register(goalRoutes, { prefix: API_PREFIX });
  await server.register(matchRoutes, { prefix: API_PREFIX });
  await server.register(profilRoutes, { prefix: API_PREFIX });
  await server.register(friendsRoutes, { prefix: API_PREFIX });
  await server.register(tournamentRoutes, { prefix: API_PREFIX });
}

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

const staticParams = {
  root: path.join(path.resolve(), process.env.UPLOADS_DIR || '/uploads'),
  prefix: '/uploads',
};

const rateLimitParams = {
  max: 100,
  timeWindow: '1 minute',
};

const corsConfig = {
  origin: '*', // Allow all origins (or specify your frontend's origin)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Allowed HTTP methods
  // allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
};

export class Server {
  private static instance: FastifyInstance;
  public static microservices: Map<string, boolean> = new Map();

  private constructor() {}

  public static getInstance(): FastifyInstance {
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

  public static async start(): Promise<void> {
    const server: FastifyInstance = Server.getInstance();
    try {
      process.on('SIGINT', () => Server.shutdown('SIGINT'));
      process.on('SIGTERM', () => Server.shutdown('SIGTERM'));
      await server.register(fastifySwagger, {
        openapi: {
          info: {
            title: 'Game Service API',
            description: 'API documentation for the Game microservice',
            version: '1.0.0',
          },
          servers: [
            {
              url: `http://localhost:${process.env.API_PORT || 8080}${API_PREFIX}`,
              description: 'Local development server',
            },
          ],
          components: {
            securitySchemes: {
              bearerAuth: {
                type: 'http', // Change to https later
                scheme: 'bearer',
              },
            },
          },
          security: [{ bearerAuth: [] }],
          tags: [
            { name: 'gateway', description: 'Main API endpoints' },
            {
              name: 'auth',
              description: 'Authentication and authorization endpoints',
            },
            {
              name: '2fa',
              description: '2fa authentication endpoints',
            },
            {
              name: 'friends',
              description: 'Endpoints for managing friends and connections',
            },
            {
              name: 'matches',
              description: 'Match management endpoints',
            },
            {
              name: 'goals',
              description: 'Goal tracking endpoints',
            },
            {
              name: 'elos',
              description: 'Elo rating management endpoints',
            },
            {
              name: 'system',
              description: 'System and health check endpoints',
            },
            {
              name: 'profil',
              description: 'User profile management endpoints',
            },
            {
              name: 'tournaments',
              description: 'Tournament management endpoints',
            },
          ],
        },
      });
      await server.register(fastifySwaggerUi, {
        routePrefix: '/documentation',
        uiConfig: { docExpansion: 'list', deepLinking: true },
        staticCSP: true,
      });
      await server.register(rateLimit, rateLimitParams);
      await server.register(fastifyMultipart, multipartParams);
      await server.register(fastifyStatic, staticParams);
      // await server.register(helmet, { global: true });
      server.register(cors, corsConfig);
      await server.register(fastifyJwt, jwtPluginRegister);
      await server.register(routes);
      server.addHook('onRequest', jwtPluginHook);
      server.addHook('preValidation', checkMicroservicesHook);
      server.listen(
        {
          port: Number(process.env.API_PORT) || 8080,
          host: process.env.API_ADDR || '0.0.0.0',
        },
        (err, address) => {
          if (err) {
            server.log.error(`Failed to start server: ${err.message}`);
            if (err.message.includes('EADDRINUSE'))
              server.log.error(`Port ${Number(process.env.API_PORT) || 8080} is already in use`);
            process.exit(1);
          }
          server.log.info(`Server listening at ${address}`);
        }
      );
      setInterval(checkMicroservices, 2000);
    } catch (err) {
      server.log.error('Fatal error', err);
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
