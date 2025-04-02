import { FastifyInstance } from "fastify";
import { getPic, getPics, getStatus } from "../controllers/api.controllers.js";
import { getPicSchema, getPicsSchema } from "../schemas/api.schemas.js"
import { IGetPicResponse, IGetPicsResponse } from "../types/api.types.js";

export default async function apiRoutes(fastify: FastifyInstance) {
  fastify.get<{ Body: IGetPicsResponse }>("/uploads", {
    schema: getPicsSchema,
    config: { 
      auth: true, 
      roles: ['user', 'admin']
    }},
    getPics);

  fastify.get<{ Params: { id: string }, Body: IGetPicResponse }>("/uploads/:id", {
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
