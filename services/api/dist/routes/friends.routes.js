import { getFriendsSchema, getFriendsMeSchema, getCheckSchema, postCreateSchema, patchAcceptSchema, deleteAllSchema, deleteFriendSchema, } from '../schemas/friends.schemas.js';
import { getFriends, getFriendsMe, getFriend, postFriend, patchFriend, deleteFriend, deleteFriends } from '../controllers/friends.controllers.js';
const auth = { auth: true, roles: ['user', 'admin'] };
export default async function friendsRoutes(fastify) {
    fastify.get('friends/all/:id', {
        schema: getFriendsSchema,
        config: auth
    }, getFriends);
    fastify.get('friends/all/me', {
        schema: getFriendsMeSchema,
        config: auth
    }, getFriendsMe);
    fastify.get('friends/check', {
        schema: getCheckSchema,
        config: auth
    }, getFriend);
    fastify.post('friends/create', {
        schema: postCreateSchema,
        config: auth
    }, postFriend);
    fastify.patch('friends/accept', {
        schema: patchAcceptSchema,
        config: auth
    }, patchFriend);
    fastify.delete('friends/delete/all', {
        schema: deleteAllSchema,
        config: auth
    }, deleteFriends);
    fastify.delete('friends/delete', {
        schema: deleteFriendSchema,
        config: auth
    }, deleteFriend);
}
