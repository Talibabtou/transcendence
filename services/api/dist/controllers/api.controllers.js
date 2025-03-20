import fs from "node:fs";
import path from "path";
import { Server } from "../server.js";
export async function getPic(request, reply) {
    const uploadDir = path.join(path.resolve(), "./srcs/shared/uploads");
    const existingFile = fs
        .readdirSync(uploadDir)
        .find((file) => file.startsWith(request.user.id));
    if (existingFile) {
        request.server.log.info(`Picture ${existingFile} found`);
        return reply.code(200).send({
            success: true,
            message: `Picture ${existingFile} found`,
            data: {
                link: `/uploads/${existingFile}`,
            },
        });
    }
    else {
        request.server.log.error("No picture found");
        return reply.code(404).send({
            success: false,
            message: "No picture found",
        });
    }
}
export async function handleWebsocket(connection, request) {
    const microserviceId = request.query.id;
    Server.microservices.set(microserviceId, {
        lastHeartbeat: Date.now(),
        connection,
    });
    console.log(`Microservice ${microserviceId} connecté`);
    connection.socket.on("message", (message) => {
        const data = JSON.parse(message);
        if (data.type === "heartbeat") {
            Server.microservices.get(microserviceId).lastHeartbeat = Date.now();
            console.log(`Heartbeat reçu de ${microserviceId}`);
        }
    });
    connection.socket.on("close", () => {
        Server.microservices.delete(microserviceId);
        console.log(`Microservice ${microserviceId} déconnecté`);
    });
}
export async function statusWebsocket(request, reply) {
    const status = {};
    Server.microservices.forEach((value, key) => {
        const isOnline = Date.now() - value.lastHeartbeat < 10000; // 10 secondes of tolerance
        status[key] = isOnline ? "online" : "offline";
    });
    reply.send(status);
}
