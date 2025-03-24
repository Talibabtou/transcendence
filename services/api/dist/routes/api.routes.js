import { getPic, getPics, webSocket } from "../controllers/api.controllers.js";
import { getIdSchema } from "../schemas/schemas.js";
export default async function apiRoutes(fastify) {
    fastify.get("/uploads", {
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, getPics);
    fastify.get("/uploads/:id", {
        schema: getIdSchema,
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, getPic);
    fastify.get('/ws', { websocket: true }, webSocket);
}
