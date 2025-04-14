import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getPicSchema, getPicsSchema } from "../schemas/api.schemas.js"
import { getPic, getPics, getHealth } from "../controllers/api.controllers.js";

const auth = { auth: true, roles: ['user', 'admin'] }

export default async function apiRoutes(fastify: FastifyInstance) {
  fastify.get("/pics", {
    schema: getPicsSchema,
    config: auth
    },
    getPics);

  fastify.get("/pics/:id", {
    schema: getPicSchema,
    config: auth
    },
    getPic);

  fastify.get("/health",
    getHealth);

  fastify.get("/check",
    (request: FastifyRequest, reply: FastifyReply ) => { reply.code(200).send({ check: 'ok' }) });
}
