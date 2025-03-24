import { createUserSchema, loginSchema, modifyUserSchema } from '../schemas/auth.schemas.js';
import { addUser, getUsers, getUser, deleteUser, modifyUser, login } from '../controllers/auth.controllers.js';
export default async function authRoutes(fastify) {
    fastify.get('/users', {
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, getUsers);
    fastify.get('/user', {
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, getUser);
    fastify.post('/user', {
        schema: createUserSchema,
        config: {
            auth: false
        }
    }, addUser);
    fastify.patch('/user', {
        schema: modifyUserSchema,
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
        schema: loginSchema,
        config: {
            auth: false
        }
    }, login);
}
