import { addUser, getUsers, getUser, getUserMe, deleteUser, modifyUser, logout, login, loginGuest, checkRevoked, twofaDisable, twofaGenerate, twofaValidate, getId, getUsername, } from '../controllers/auth.controller.js';
export default async function authRoutes(fastify) {
    fastify.get('/health', (request, reply) => {
        reply.code(200).send();
    });
    fastify.get('/id/:username', getId);
    fastify.get('/username/:id', getUsername);
    fastify.get('/users', getUsers);
    fastify.get('/user/:id', getUser);
    fastify.get('/user/me/:id', getUserMe);
    fastify.get('/revoked/:id', checkRevoked);
    fastify.get('/2fa/generate/:id', twofaGenerate);
    fastify.post('/2fa/validate/:id', twofaValidate);
    fastify.post('/register', addUser);
    fastify.post('/logout/:id', logout);
    fastify.post('/login', login);
    fastify.post('/login/guest', loginGuest);
    fastify.patch('/user/:id', modifyUser);
    fastify.patch('/2fa/disable/:id', twofaDisable);
    fastify.delete('/user/:id', deleteUser);
}
