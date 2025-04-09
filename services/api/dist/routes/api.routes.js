import { getPicSchema, getPicsSchema } from "../schemas/api.schemas.js";
import { getPic, getPics, getHealth } from "../controllers/api.controllers.js";
export default async function apiRoutes(fastify) {
    fastify.get("/uploads", {
        schema: getPicsSchema,
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, getPics);
    fastify.get("/uploads/:id", {
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
}
