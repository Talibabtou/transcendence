import { addUser, getUsers, getUser, deleteUser, modifyUser, login } from '../controllers/auth.controllers.js';
export default async function authRoutes(fastify) {
    fastify.get('/users', {
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, getUsers);
    fastify.get('/user/:id', {
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, getUser);
    fastify.post('/user', {
        config: {
            auth: false
        }
    }, addUser);
    fastify.patch('/user', {
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, modifyUser);
    fastify.delete('/user', {
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, deleteUser);
    fastify.post('/login', {
        config: {
            auth: false
        }
    }, login);
    fastify.get('/check', {
        config: {
            auth: false
        }
    }, (request, reply) => { reply.code(204).send(); });
}
