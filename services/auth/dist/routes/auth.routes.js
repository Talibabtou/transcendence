import { createUserSchema, loginSchema, getIdUserSchema, modifyUserSchema } from '../schemas/auth.schemas.js';
import { addUser, getUsers, getUser, deleteUser, modifyUser, login } from '../controllers/auth.controllers.js';
const jwt = { auth: true };
const noJwt = { auth: false };
export default async function authRoutes(fastify) {
    fastify.get('/users', { config: jwt }, getUsers);
    fastify.get('/user/:id', { schema: getIdUserSchema, config: jwt }, getUser);
    fastify.post('/users', { schema: createUserSchema, config: noJwt }, addUser);
    fastify.patch('/user/:id', { schema: { ...getIdUserSchema, ...modifyUserSchema }, config: jwt }, modifyUser);
    fastify.delete('/user/:id', { schema: getIdUserSchema, config: jwt }, deleteUser);
    fastify.post('/login', { schema: loginSchema, config: noJwt }, login);
}
