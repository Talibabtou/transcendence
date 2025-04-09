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
    fastify.post('/register', {
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
    fastify.get('/health', {
        config: {
            auth: false
        }
    }, (request, reply) => { reply.code(200).send(); });
}
