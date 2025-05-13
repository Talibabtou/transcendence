// import fs from 'fs';
import path from 'path';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyStatic from '@fastify/static';
import rateLimit from '@fastify/rate-limit';
// import { Http2SecureServer } from 'http2';
import fastifySwagger from '@fastify/swagger';
import eloRoutes from './routes/elo.routes.js';
import goalRoutes from './routes/goal.routes.js';
import authRoutes from './routes/auth.routes.js';
import fastifyMultipart from '@fastify/multipart';
import matchRoutes from './routes/match.routes.js';
import { fastify } from 'fastify';
import fastifySwaggerUi from '@fastify/swagger-ui';
import profileRoutes from './routes/profile.routes.js';
import gatewayRoutes from './routes/gateway.routes.js';
import friendsRoutes from './routes/friends.routes.js';
import tournamentRoutes from './routes/tournament.routes.js';
import { API_PREFIX } from './shared/constants/path.const.js';
import { jwtPluginHook, jwtPluginRegister } from './plugins/jwtPlugin.js';
async function routes(server) {
    await server.register(eloRoutes, { prefix: API_PREFIX });
    await server.register(gatewayRoutes, { prefix: API_PREFIX });
    await server.register(authRoutes, { prefix: API_PREFIX });
    await server.register(goalRoutes, { prefix: API_PREFIX });
    await server.register(matchRoutes, { prefix: API_PREFIX });
    await server.register(profileRoutes, { prefix: API_PREFIX });
    await server.register(friendsRoutes, { prefix: API_PREFIX });
    await server.register(tournamentRoutes, { prefix: API_PREFIX });
}
const swaggerConfig = {
    swagger: {
        info: {
            title: 'Game Service API',
            description: 'API documentation for the Game microservice',
            version: '1.0.0',
        },
        host: `localhost:${process.env.API_PORT || 8085}`,
        schemes: ['http'],
        securityDefinitions: {
            bearerAuth: {
                type: 'apiKey',
                name: 'Authorization',
                in: 'header',
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
                name: 'profile',
                description: 'User profile management endpoints',
            },
            {
                name: 'tournaments',
                description: 'Tournament management endpoints',
            },
        ],
    },
};
const multipartConfig = {
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
const staticConfig = {
    root: path.join(path.resolve(), process.env.UPLOADS_DIR || '/uploads'),
    prefix: '/uploads',
};
const rateLimitConfig = {
    max: 100,
    timeWindow: '1 minute',
};
const helmetConfig = {
    global: true,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:'],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"], // anti clickjacking
            upgradeInsecureRequests: [], // force https
        },
    },
    strictTransportSecurity: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    referrerPolicy: { policy: 'no-referrer' },
    permissionsPolicy: {
        features: {
            geolocation: ['none'],
            camera: ['none'],
            microphone: ['none'],
            fullscreen: ['self'],
            payment: ['none'],
            usb: ['none'],
        },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
};
const corsConfig = {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};
const fastifyConfig = {
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
    bodyLimit: 1024 * 1024, // 1 Mo
    // http2: true,
    // https: {
    //   key: fs.readFileSync(path.join(path.resolve(), '/certs/key.pem')),
    //   cert: fs.readFileSync(path.join(path.resolve(), '/certs/cert.pem')),
    // },
};
async function addHeaders(request, reply) {
    reply.header('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), fullscreen=(self), payment=(), usb=()');
    reply.header('Cache-Control', 'no-store');
    reply.header('Vary', 'Origin');
}
async function blockHeaders(request, reply) {
    const forbiddenMethods = ['TRACE', 'TRACK', 'CONNECT', 'PUT'];
    if (forbiddenMethods.includes(request.raw.method || '')) {
        reply.code(405).send({ error: 'Method Not Allowed' });
    }
}
export class Server {
    // FastifyInstance<Http2SecureServer> for https
    static instance;
    static microservices = new Map();
    constructor() { }
    // FastifyInstance<Http2SecureServer> for https
    static getInstance() {
        if (!Server.instance)
            Server.instance = fastify(fastifyConfig);
        return Server.instance;
    }
    static async start() {
        const server = Server.getInstance();
        try {
            process.on('SIGINT', () => Server.shutdown('SIGINT'));
            process.on('SIGTERM', () => Server.shutdown('SIGTERM'));
            await server.register(fastifySwagger, swaggerConfig);
            await server.register(fastifySwaggerUi, {
                routePrefix: '/documentation',
                uiConfig: { docExpansion: 'list', deepLinking: true },
                staticCSP: true,
            });
            await server.register(rateLimit, rateLimitConfig);
            await server.register(fastifyMultipart, multipartConfig);
            await server.register(fastifyStatic, staticConfig);
            // await server.register(helmet, helmetConfig);
            await server.register(cors, corsConfig);
            await server.register(fastifyJwt, jwtPluginRegister);
            await server.register(routes);
            server.addHook('onRequest', jwtPluginHook);
            server.addHook('onRequest', blockHeaders);
            // server.addHook('preValidation', checkMicroservicesHook);
            server.addHook('onSend', addHeaders);
            server.listen({
                port: Number(process.env.GATEWAY_PORT) || 8085,
                host: process.env.GATEWAY_ADDR || 'localhost',
            }, (err, address) => {
                if (err) {
                    server.log.error(`Failed to start server: ${err.message}`);
                    if (err.message.includes('EADDRINUSE'))
                        server.log.error(`Port ${Number(process.env.API_PORT) || 8085} is already in use`);
                    process.exit(1);
                }
                server.log.info(`Server listening at ${address}`);
            });
            // setInterval(checkMicroservices, 2000);
        }
        catch (err) {
            server.log.error(err);
            process.exit(1);
        }
    }
    static async shutdown(signal) {
        // FastifyInstance<Http2SecureServer> for https
        const server = Server.getInstance();
        server.log.info('Server has been closed.');
        server.log.info(`Received ${signal}.`);
        await server.close();
        process.exit(0);
    }
}
Server.start();
