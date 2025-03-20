import { handleWebsocket, statusWebsocket } from "../controllers/api.controllers.js";
import { getPic } from "../controllers/api.controllers.js";
const jwt = { auth: true };
export default async function apiRoutes(fastify) {
    fastify.get("/uploads", { config: jwt }, getPic);
    fastify.get("/ws", { config: jwt, websocket: true }, handleWebsocket);
    fastify.get("/status", { config: jwt }, statusWebsocket);
}
