import { getFriends, postFriend, patchFriend, deleteFriend, deleteFriends } from '../controllers/friends.controllers.js';
export default async function friendsRoutes(fastify) {
    fastify.get('friends/', {
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, getFriends);
    fastify.post('friends/', {
        config: {
            auth: false
        }
    }, postFriend);
    fastify.patch('friends/', {
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, patchFriend);
    fastify.delete('friends/', {
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, deleteFriends);
    fastify.delete('friends/:id', {
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, deleteFriend);
}
