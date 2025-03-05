import { createUserSchema, getIdUserSchema } from '../schemas/auth.schemas.js';
import { addUser, getUsers, getUser, deleteUser } from '../controllers/auth.controllers.js';
async function authRoutes(fastify) {
    fastify.get('/auth', getUsers);
    fastify.get('/auth/:id', { schema: { params: getIdUserSchema } }, getUser);
    fastify.post('/auth', { schema: { body: createUserSchema } }, addUser);
    fastify.put('/auth/:id', { schema: { params: getIdUserSchema } }, async (request, reply) => {
        reply.code(200).send({
            status: "success",
            message: "PUT /auth/:id reached"
        });
    });
    fastify.delete('/auth/:id', { schema: { params: getIdUserSchema } }, deleteUser);
}
export default authRoutes;
