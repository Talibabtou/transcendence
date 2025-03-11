import { createUserSchema, loginSchema, getIdUserSchema, modifyUserSchema } from '../schemas/auth.schemas.js';
import { addUser, getUsers, getUser, deleteUser, modifyUser, login } from '../controllers/auth.controllers.js';
async function authRoutes(fastify) {
    const jwt = { auth: false };
    const noJwt = { auth: true };
    fastify.get('/auth', { config: jwt }, getUsers);
    fastify.get('/auth/:id', { schema: getIdUserSchema, config: jwt }, getUser);
    fastify.post('/auth', { schema: createUserSchema, config: noJwt }, addUser);
    fastify.put('/auth/:id', { schema: { ...getIdUserSchema, ...modifyUserSchema },
        config: jwt }, modifyUser);
    fastify.delete('/auth/:id', { schema: getIdUserSchema, config: jwt }, deleteUser);
    fastify.post('/login', { schema: loginSchema, config: noJwt }, login);
}
export default authRoutes;
