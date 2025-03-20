import { createUserSchema, loginSchema, modifyUserSchema } from '../schemas/auth.schemas.js';
import { addUser, getUsers, getUser, deleteUser, modifyUser, login } from '../controllers/auth.controllers.js';
const jwt = { auth: true };
const noJwt = { auth: false };
export default async function authRoutes(fastify) {
    fastify.get('/users', { config: jwt }, getUsers);
    fastify.get('/user', { config: jwt }, getUser);
    fastify.post('/user', { schema: createUserSchema, config: noJwt }, addUser);
    fastify.patch('/user', { schema: modifyUserSchema, config: jwt }, modifyUser);
    fastify.delete('/user', { config: jwt }, deleteUser);
    fastify.post('/login', { schema: loginSchema, config: noJwt }, login);
}
