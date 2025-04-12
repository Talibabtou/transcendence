import { addUser, getUsers, getUser, getUserMe, deleteUser, modifyUser, login } from '../controllers/auth.controllers.js';
export default async function authRoutes(fastify) {
    fastify.get('/users', getUsers);
    fastify.get('/user/:id', getUser);
    fastify.get('/user/me/:id', getUserMe);
    fastify.post('/register', addUser);
    fastify.patch('/user/:id', modifyUser);
    fastify.delete('/user/:id', deleteUser);
    fastify.post('/login', login);
    fastify.get('/health', (request, reply) => { reply.code(200).send(); });
}
