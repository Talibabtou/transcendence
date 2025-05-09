import { getFriends, getFriendStatus, getFriendsMe, postFriend, patchFriend, deleteFriend, deleteFriends, } from '../controllers/friends.controller.js';
export default async function authRoutes(fastify) {
    fastify.get('/all/:id', getFriends);
    fastify.get('/all/me/:id', getFriendsMe);
    fastify.get('/check/:id', getFriendStatus);
    fastify.post('/create/:id', postFriend);
    fastify.patch('/accept/:id', patchFriend);
    fastify.delete('/delete/all/:id', deleteFriends);
    fastify.delete('/delete/:id', deleteFriend);
    fastify.get('/health', (request, reply) => {
        reply.code(200).send();
    });
}
