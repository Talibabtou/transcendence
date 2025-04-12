import { getPicSchema, getPicsSchema } from "../schemas/api.schemas.js";
import { getPic, getPics, getHealth } from "../controllers/api.controllers.js";
export default async function apiRoutes(fastify) {
    fastify.get("/pics", {
        schema: getPicsSchema,
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, getPics);
    fastify.get("/pics/:id", {
        schema: getPicSchema,
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, getPic);
    fastify.get("/health", {
        config: {
            auth: false
        }
    }, getHealth);
    fastify.get("/check", {
        config: {
            auth: false
        }
    }, (request, reply) => { reply.code(200).send({ check: 'ok' }); });
}
