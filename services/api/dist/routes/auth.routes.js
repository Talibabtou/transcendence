import { getUsers, getUser, postUser, patchUser, deleteUser, postLogin } from '../controllers/auth.controllers.js';
const jwt = { auth: true };
const noJwt = { auth: false };
export default async function authRoutes(fastify) {
    fastify.get('/auth/user', { config: jwt }, getUser);
    fastify.get('/auth/users', { config: jwt }, getUsers);
    fastify.post('/auth/user', { config: noJwt }, postUser);
    fastify.patch('/auth/user', { config: jwt }, patchUser);
    fastify.delete('/auth/user', { config: jwt }, deleteUser);
    fastify.post('/auth/login', { config: noJwt }, postLogin);
}
