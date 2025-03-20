import { fastify, FastifyInstance } from "fastify";
import { initDb } from "./db.js";
import authRoutes from "./routes/auth.routes.js";
import WebSocket from "ws";
import { jwtPluginRegister, jwtPluginHook } from "./plugins/jwtPlugin.js";
import fastifyJwt from "@fastify/jwt";

class Server {
  private static instance: FastifyInstance;

  private constructor() {}

  public static getInstance(): FastifyInstance {
    if (!Server.instance) {
      Server.instance = fastify({ logger: true });
    }
    return Server.instance;
  }

  public static async start(): Promise<void> {
    const server: FastifyInstance = Server.getInstance();
    const microserviceId = "microservice-auth";
    try {
      const ws: WebSocket = new WebSocket("ws://localhost:8080/ws?id=" + microserviceId);
      ws.on("open", () => {
        console.log("Connecté au serveur WebSocket");

        // Envoyer un heartbeat toutes les 5 secondes
        setInterval(() => {
          ws.send(JSON.stringify({ type: "heartbeat" }));
        }, 5000);
      });
      ws.on("close", () => {
        console.log("Déconnecté du serveur WebSocket");
      });
      process.on("SIGINT", () => Server.shutdown("SIGINT"));
      process.on("SIGTERM", () => Server.shutdown("SIGTERM"));
      server.decorate("db", await initDb());
      await server.register(fastifyJwt, jwtPluginRegister);
      server.addHook("onRequest", jwtPluginHook);
      await server.register(authRoutes);
      server.listen(
        { port: 8082, host: "localhost" },
        (err: any, address: any) => {
          if (err) throw new Error("server listen");
          server.log.info(`Server listening at ${address}`);
        }
      );
    } catch (err: any) {
      server.log.error("Fatal error", err.message);
      process.exit(1);
    }
  }

  public static async shutdown(signal: any): Promise<undefined> {
    const server: FastifyInstance = Server.getInstance();
    server.log.info("Server has been closed.");
    server.log.info(`Received ${signal}.`);
    await server.close();
    process.exit(0);
  }
}

Server.start();
