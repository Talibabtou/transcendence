import { getId, getUsers, getUser, getUserMe, postUser, patchUser, deleteUser, postLogin, postLoginGuest, postLogout, twofaGenerate, twofaValidate, twofaDisable, getUsername, } from '../controllers/auth.controller.js';
import { getUserSchema, getUserMeSchema, getUsersSchema, deleteUserSchema, createUserSchema, modifyUserSchema, loginGuestSchema, loginSchema, logoutSchema, twofaDisableSchema, twofaValidateSchema, twofaGenerateSchema, getIdSchema, getUsernameSchema, } from '../schemas/auth.schemas.js';
const auth = { auth: true, roles: ['user', 'admin'] };
const twofa = { auth: true, roles: ['user', 'admin', '2fa'] };
export default async function authRoutes(fastify) {
    fastify.get('/auth/id/:username', {
        schema: {
            ...getIdSchema,
            tags: ['auth'],
        },
        config: auth,
    }, getId);
    fastify.get('/auth/username/:id', {
        schema: {
            ...getUsernameSchema,
            tags: ['auth'],
        },
        config: auth,
    }, getUsername);
    fastify.get('/auth/users', {
        schema: {
            ...getUsersSchema,
            tags: ['auth'],
        },
        config: auth,
    }, getUsers);
    fastify.get('/auth/user/:id', {
        schema: {
            ...getUserSchema,
            tags: ['auth'],
        },
        config: auth,
    }, getUser);
    fastify.get('/auth/user/me', {
        schema: {
            ...getUserMeSchema,
            tags: ['auth'],
        },
        config: auth,
    }, getUserMe);
    fastify.get('/auth/2fa/generate', {
        schema: {
            ...twofaGenerateSchema,
            tags: ['2fa'],
        },
        config: auth,
    }, twofaGenerate);
    fastify.post('/auth/2fa/validate', {
        schema: {
            ...twofaValidateSchema,
            tags: ['2fa'],
        },
        config: twofa,
    }, twofaValidate);
    fastify.post('/auth/register', {
        schema: {
            ...createUserSchema,
            tags: ['auth'],
        },
    }, postUser);
    fastify.post('/auth/logout', {
        schema: {
            ...logoutSchema,
            tags: ['auth'],
        },
        config: auth,
    }, postLogout);
    fastify.post('/auth/login', {
        schema: {
            ...loginSchema,
            tags: ['auth'],
        },
    }, postLogin);
    fastify.post('/auth/login/guest', {
        schema: {
            ...loginGuestSchema,
            tags: ['auth'],
        },
    }, postLoginGuest);
    fastify.patch('/auth/user', {
        schema: {
            ...modifyUserSchema,
            tags: ['auth'],
        },
        config: auth,
    }, patchUser);
    fastify.patch('/auth/2fa/disable', {
        schema: {
            ...twofaDisableSchema,
            tags: ['2fa'],
        },
        config: auth,
    }, twofaDisable);
    fastify.delete('/auth/user', {
        schema: {
            ...deleteUserSchema,
            tags: ['auth'],
        },
        config: auth,
    }, deleteUser);
}
