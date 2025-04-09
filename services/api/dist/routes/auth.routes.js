import { getUsers, getUser, postUser, patchUser, deleteUser, postLogin } from '../controllers/auth.controllers.js';
import { getUserSchema, getUsersSchema, deleteUserSchema, createUserSchema, modifyUserSchema, loginSchema } from '../schemas/auth.schemas.js';
export default async function authRoutes(fastify) {
    fastify.get('/auth/user/:id', {
        schema: getUserSchema,
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, getUser);
    fastify.get('/auth/users', {
        schema: getUsersSchema,
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, getUsers);
    fastify.post('/auth/register', {
        schema: createUserSchema,
        config: {
            auth: false
        }
    }, postUser);
    fastify.patch('/auth/user', {
        schema: modifyUserSchema,
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, patchUser);
    fastify.delete('/auth/user', {
        schema: deleteUserSchema,
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, deleteUser);
    fastify.post('/auth/login', {
        schema: loginSchema,
        config: {
            auth: false
        }
    }, postLogin);
}
