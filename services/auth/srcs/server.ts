import { fastify, FastifyInstance } from "fastify";
import { initDb } from "./db.js";
import authRoutes from "./routes/auth.routes.js";
import { jwtPluginRegister, jwtPluginHook } from "./plugins/jwtPlugin.js";
import fastifyJwt from "@fastify/jwt";
import WebSocket from "ws";

function sendHeartbeat(ws: WebSocket) {
  if (ws.readyState === ws.OPEN) {
    const heartbeat = {
      type: 'heartbeat',
      serviceName: 'auth',
      date: new Date().toISOString()
    }
    ws.send(JSON.stringify(heartbeat));
  }
}

function connectWebSocket() {
  const connect = () => {
    try {
      const ws: WebSocket = new WebSocket("ws://localhost:8080/api/v1/ws", {
        headers: {
          Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NDI4MTczNDIsImV4cCI6MTc0MjkwMzc0Mn0.yY8m6ICGcy_condmG1jYlOmvpvB1qSWMApMYnNl3ass'
        }
      })
      ws.on('open', () => {
        console.log({
          message: 'Connected to API GATEWAY'
        })
        sendHeartbeat(ws)
        setInterval(() => sendHeartbeat(ws), 5000);
      }) ;
      ws.on('close', () => {
        console.log({
          message: 'Disconnected from API GATEWAY, reconnecting...'
        })
      });
      ws.on('error', (err: any) => {
        console.error({
          error: err.code
        })
        setTimeout(connect, 5000);
      });
    } catch (err: any) {
      console.error({
        error: err.message
      })
    }
  }
  connect();
}

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
    try {
      process.on("SIGINT", () => Server.shutdown("SIGINT"));
      process.on("SIGTERM", () => Server.shutdown("SIGTERM"));
      server.decorate("db", await initDb());
      await server.register(fastifyJwt, jwtPluginRegister);
      server.addHook("preHandler", jwtPluginHook);
      await server.register(authRoutes);
      connectWebSocket();
      server.listen(
        { port: Number(process.env.AUTH_PORT) || 8082, host: process.env.AUTH_ADD || "localhost" },
        (err: any, address: any) => {
          if (err) {
            server.log.error(`Failed to start server: ${err.message}`);
            if (err.code === 'EADDRINUSE') {
              server.log.error(`Port ${Number(process.env.API_PORT) || 8082} is already in use`);
            }
            process.exit(1);
          }
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
