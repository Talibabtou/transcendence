import { createUserSchema, loginSchema, getIdUserSchema, modifyUserSchema } from '../schemas/auth.schemas.js';
import { addUser, getUsers, getUser, deleteUser, modifyUser, login } from '../controllers/auth.controllers.js';
const jwt = { auth: true };
const noJwt = { auth: false };
export default async function authRoutes(fastify) {
    fastify.get('/auth', { config: jwt }, getUsers);
    fastify.get('/auth/:id', { schema: getIdUserSchema, config: jwt }, getUser);
    fastify.post('/auth', { schema: createUserSchema, config: noJwt }, addUser);
    fastify.patch('/auth/:id', { schema: { ...getIdUserSchema, ...modifyUserSchema }, config: jwt }, modifyUser);
    fastify.delete('/auth/:id', { schema: getIdUserSchema, config: noJwt }, deleteUser);
    fastify.post('/login', { schema: loginSchema, config: noJwt }, login);
}
