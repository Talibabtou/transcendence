import path from "path";
import fastifyJwt from "@fastify/jwt";
import rateLimit from '@fastify/rate-limit'
import fastifyStatic from "@fastify/static";
import apiRoutes from "./routes/api.routes.js";
import authRoutes from "./routes/auth.routes.js";
import fastifyMultipart from "@fastify/multipart";
import { fastify, FastifyInstance } from "fastify";
import profilRoutes from "./routes/profil.routes.js";
import { jwtPluginHook, jwtPluginRegister } from "./shared/plugins/jwtPlugin.js";
import { checkMicroservices, checkMicroservicesHook } from './controllers/api.controllers.js'

// const server = fastify({
// 	logger: true,
// 	http2: true,
// 	https: {
// 		key: readFileSync(path.join(path.resolve(), '/certs/key.pem')),
// 		cert: readFileSync(path.join(path.resolve(), '/certs/cert.pem'))
// 	}
// });

export class Server {
  private static instance: FastifyInstance;
  public static microservices: Map<string, boolean> = new Map();

  private constructor() {}

  public static getInstance(): FastifyInstance {
    if (!Server.instance)
      Server.instance = fastify({ logger: true });
    return Server.instance;
  }

  public static async start(): Promise<void> {
    const server: FastifyInstance = Server.getInstance();
    try {
      process.on("SIGINT", () => Server.shutdown("SIGINT"));
      process.on("SIGTERM", () => Server.shutdown("SIGTERM"));
      await server.register(rateLimit, {
        max: 100,
        timeWindow: '1 minute'
      })
      await server.register(fastifyMultipart, {
        limits: {
          fieldNameSize: 100, // Max field name size in bytes
          fieldSize: 100, // Max field value size in bytes
          fields: 10, // Max number of non-file fields
          fileSize: 1000000, // For multipart forms, the max file size in bytes
          files: 1, // Max number of file fields
          headerPairs: 2000, // Max number of header key=>value pairs
          parts: 1000, // For multipart forms, the max number of parts (fields + files)
        },
      });
      await server.register(fastifyStatic, {
        root: path.join(path.resolve(), process.env.UPLOADS_DIR || "./srcs/shared/uploads"),
        prefix: "/uploads",
      });
      await server.register(fastifyJwt, jwtPluginRegister);
      await server.register(apiRoutes, { prefix: "/api/v1/" });
      await server.register(authRoutes, { prefix: "/api/v1/" });
      await server.register(profilRoutes, { prefix: "/api/v1/" });
      server.addHook("preValidation", checkMicroservicesHook);
      server.addHook("preHandler", jwtPluginHook);
      server.listen(
        { port: Number(process.env.API_PORT) || 8090, host: "localhost" },
        (err: any, address: any) => {
          if (err) {
            server.log.error(`Failed to start server: ${err.message}`);
            if (err.code === 'EADDRINUSE')
              server.log.error(`Port ${Number(process.env.API_PORT) || 8080} is already in use`);
            process.exit(1);
          }
          server.log.info(`Server listening at ${address}`);
        }
      );
      setInterval(checkMicroservices, 2000);
    } catch (err: any) {
      server.log.error("Fatal error", err.message);
      process.exit(1);
    }
  }

  public static async shutdown(signal: any): Promise<void> {
    const server: FastifyInstance = Server.getInstance();
    server.log.info("Server has been closed.");
    server.log.info(`Received ${signal}.`);
    await server.close();
    process.exit(0);
  }
}

Server.start();
