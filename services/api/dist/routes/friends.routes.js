import { getFriends, getFriend, postFriend, patchFriend, deleteFriend, deleteFriends } from '../controllers/friends.controllers.js';
export default async function friendsRoutes(fastify) {
    fastify.get('friends/check', {
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, getFriend);
    fastify.get('friends/', {
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, getFriends);
    fastify.post('friends/create', {
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, postFriend);
    fastify.patch('friends/modify', {
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, patchFriend);
    fastify.delete('friends/delete', {
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, deleteFriends);
    fastify.delete('friends/delete/:id', {
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, deleteFriend);
}
