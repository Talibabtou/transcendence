import { FastifyInstance } from "fastify";
import { getPic, getPics, webSocket } from "../controllers/api.controllers.js";
import { IReply, IGetId } from "../types/types.js";
import { getIdSchema } from "../schemas/schemas.js";

export default async function apiRoutes(fastify: FastifyInstance) {
  fastify.get<{ Reply: IReply }>("/uploads", {
    config: { 
      auth: true, 
      roles: ['user', 'admin']
    }},
    getPics);

  fastify.get<{ Params: IGetId, Reply: IReply }>("/uploads/:id", {
    schema: getIdSchema,
    config: { 
      auth: true, 
      roles: ['user', 'admin']
    }},
    getPic);

    fastify.get('/ws', { websocket: true },
      webSocket)
}
