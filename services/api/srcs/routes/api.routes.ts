import { FastifyInstance } from "fastify";
import { handleWebsocket, statusWebsocket } from "../controllers/api.controllers.js";
import { getPic } from "../controllers/api.controllers.js";
import { IReply } from "../types/types.js";

const jwt = { auth: true };

export default async function apiRoutes(fastify: FastifyInstance) {
  fastify.get<{ Reply: IReply }>("/uploads", { config: jwt }, getPic);

  fastify.get("/ws", { config: jwt, websocket: true }, handleWebsocket);

  fastify.get("/status", { config: jwt }, statusWebsocket);
}
