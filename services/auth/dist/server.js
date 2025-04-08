import { fastify } from "fastify";
import { initDb } from "./db.js";
import authRoutes from "./routes/auth.routes.js";
import { jwtPluginRegister, jwtPluginHook } from "./shared/plugins/jwtPlugin.js";
import fastifyJwt from "@fastify/jwt";
class Server {
    static instance;
    constructor() { }
    static getInstance() {
        if (!Server.instance)
            Server.instance = fastify({ logger: true });
        return Server.instance;
    }
    static async start() {
        const server = Server.getInstance();
        try {
            process.on("SIGINT", () => Server.shutdown("SIGINT"));
            process.on("SIGTERM", () => Server.shutdown("SIGTERM"));
            server.decorate("db", await initDb());
            await server.register(fastifyJwt, jwtPluginRegister);
            await server.register(authRoutes);
            server.addHook("preHandler", jwtPluginHook);
            server.listen({ port: Number(process.env.AUTH_PORT) || 8082, host: process.env.AUTH_ADD || "localhost" }, (err, address) => {
                if (err) {
                    server.log.error(`Failed to start server: ${err.message}`);
                    if (err instanceof Error && err.message.includes('EADDRINUSE'))
                        server.log.error(`Port ${Number(process.env.AUTH_PORT) || 8082} is already in use`);
                    process.exit(1);
                }
                server.log.info(`Server listening at ${address}`);
            });
        }
        catch (err) {
            server.log.error(err);
            process.exit(1);
        }
    }
    static async shutdown(signal) {
        const server = Server.getInstance();
        server.log.info("Server has been closed.");
        server.log.info(`Received ${signal}.`);
        await server.close();
        process.exit(0);
    }
}
Server.start();
