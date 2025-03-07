import { createUserSchema, loginSchema, getIdUserSchema, modifyUserSchema } from '../schemas/auth.schemas.js';
import { addUser, getUsers, getUser, deleteUser, modifyUser, login } from '../controllers/auth.controllers.js';
async function authRoutes(fastify) {
    fastify.get('/auth', getUsers);
    fastify.get('/auth/:id', { schema: { params: getIdUserSchema } }, getUser);
    fastify.post('/auth', { schema: { body: createUserSchema } }, addUser);
    fastify.put('/auth/:id', { schema: { params: getIdUserSchema, body: modifyUserSchema } }, modifyUser);
    fastify.delete('/auth/:id', { schema: { params: getIdUserSchema } }, deleteUser);
    fastify.post('/login', { schema: { body: loginSchema } }, login);
}
export default authRoutes;
