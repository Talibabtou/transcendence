import { FastifyInstance } from "fastify";
import { getPicSchema, getPicsSchema } from "../schemas/api.schemas.js"
import { getPic, getPics, getStatus } from "../controllers/api.controllers.js";

export default async function apiRoutes(fastify: FastifyInstance) {
  fastify.get("/uploads", {
    schema: getPicsSchema,
    config: { 
      auth: true, 
      roles: ['user', 'admin']
    }},
    getPics);

  fastify.get<{ Params: { id: string } }>("/uploads/:id", {
    schema: getPicSchema,
    config: { 
      auth: true, 
      roles: ['user', 'admin']
    }},
    getPic);

  fastify.get("/status", {
    config: { 
      auth: false
    }},
    getStatus);
}
