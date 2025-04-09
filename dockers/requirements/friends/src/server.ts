import { fastify, FastifyInstance } from "fastify";
import { initDb } from "./db.js";
import friendsRoutes from "./routes/friends.routes.js";
import { jwtPluginRegister, jwtPluginHook } from "./shared/plugins/jwtPlugin.js";
import fastifyJwt from "@fastify/jwt";

class Server {
  private static instance: FastifyInstance;

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
      server.decorate("db", await initDb());
      await server.register(fastifyJwt, jwtPluginRegister);
      await server.register(friendsRoutes);
      server.addHook("preHandler", jwtPluginHook);
      server.listen(
        { port: Number(process.env.FRIENDS_PORT) || 8084, host: process.env.FRIENDS_ADD || "localhost" },
        (err, address) => {
          if (err) {
            server.log.error(`Failed to start server: ${err.message}`);
            if (err instanceof Error && err.message.includes('EADDRINUSE'))
              server.log.error(`Port ${Number(process.env.FRIENDS_PORT) || 8084} is already in use`);
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

  public static async shutdown(signal: string): Promise<undefined> {
    const server: FastifyInstance = Server.getInstance();
    server.log.info("Server has been closed.");
    server.log.info(`Received ${signal}.`);
    await server.close();
    process.exit(0);
  }
}

Server.start();
