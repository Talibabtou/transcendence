import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
    getFriends,
    getFriend,
    getFriendsMe,
    postFriend,
    patchFriend,
    deleteFriend,
    deleteFriends,
} from '../controllers/friends.controllers.js';
import { IId } from '../shared/types/api.types.js';

export default async function authRoutes(
    fastify: FastifyInstance
): Promise<void> {
    fastify.get<{ Params: IId }>('/all/:id', getFriends);

    fastify.get<{ Params: IId }>('/all/me/:id', getFriendsMe);

    fastify.get<{ Querystring: IId; Params: IId }>('/check/:id', getFriend);

    fastify.post<{ Body: IId; Params: IId }>('/create/:id', postFriend);

    fastify.patch<{ Body: IId; Params: IId }>('/accept/:id', patchFriend);

    fastify.delete<{ Params: IId }>('/delete/all/:id', deleteFriends);

    fastify.delete<{ Querystring: IId; Params: IId }>(
        '/delete/:id',
        deleteFriend
    );

    fastify.get('/health', (request: FastifyRequest, reply: FastifyReply) => {
        reply.code(200).send();
    });
}
