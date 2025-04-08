import { getFriends, postFriend, patchFriend, deleteFriend, deleteFriends } from '../controllers/friends.controllers.js';
export default async function authRoutes(fastify) {
    fastify.get('/', {
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, getFriends);
    fastify.post('/', {
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, postFriend);
    fastify.patch('/', {
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, patchFriend);
    fastify.delete('/', {
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, deleteFriends);
    fastify.delete('/:id', {
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, deleteFriend);
    fastify.get('/check', {
        config: {
            auth: false
        }
    }, (request, reply) => { reply.code(200).send(); });
}
