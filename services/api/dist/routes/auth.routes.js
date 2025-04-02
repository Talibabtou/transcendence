import { getUsers, getUser, postUser, patchUser, deleteUser, postLogin } from '../controllers/auth.controllers.js';
import { getUserSchema } from '../schemas/auth.schemas.js';
export default async function authRoutes(fastify) {
    fastify.get('/auth/user/:id', {
        schema: getUserSchema,
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, getUser);
    fastify.get('/auth/users', {
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, getUsers);
    fastify.post('/auth/user', {
        config: {
            auth: false
        }
    }, postUser);
    fastify.patch('/auth/user', {
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, patchUser);
    fastify.delete('/auth/user', {
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, deleteUser);
    fastify.post('/auth/login', {
        config: {
            auth: false
        }
    }, postLogin);
}
