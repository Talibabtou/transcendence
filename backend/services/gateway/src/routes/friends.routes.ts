import { FastifyInstance } from 'fastify';
import {
  getFriendsSchema,
  getFriendsMeSchema,
  getCheckSchema,
  postCreateSchema,
  patchAcceptSchema,
  deleteAllSchema,
  deleteFriendSchema,
} from '../schemas/friends.schemas.js';
import { IId } from '../shared/types/gateway.types.js';
import {
  getFriends,
  getFriendsMe,
  getFriendStatus,
  postFriend,
  patchFriend,
  deleteFriend,
  deleteFriends,
} from '../controllers/friends.controller.js';

const auth = { auth: true, roles: ['user', 'admin'] };

export default async function friendsRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: IId }>(
    '/friends/all/:id',
    {
      schema: {
        ...getFriendsSchema,
        tags: ['friends'],
      },
      config: auth,
    },
    getFriends
  );

  fastify.get(
    '/friends/all/me',
    {
      schema: {
        ...getFriendsMeSchema,
        tags: ['friends'],
      },
      config: auth,
    },
    getFriendsMe
  );

  fastify.get<{ Params: IId }>(
    '/friends/check/:id',
    {
      schema: {
        ...getCheckSchema,
        tags: ['friends'],
      },
      config: auth,
    },
    getFriendStatus
  );

  fastify.post<{ Body: IId }>(
    '/friends/create',
    {
      schema: {
        ...postCreateSchema,
        tags: ['friends'],
      },
      config: auth,
    },
    postFriend
  );

  fastify.patch<{ Body: IId }>(
    '/friends/accept',
    {
      schema: {
        ...patchAcceptSchema,
        tags: ['friends'],
      },
      config: auth,
    },
    patchFriend
  );

  fastify.delete(
    '/friends/delete/all',
    {
      schema: {
        ...deleteAllSchema,
        tags: ['friends'],
      },
      config: auth,
    },
    deleteFriends
  );

  fastify.delete<{ Params: IId }>(
    '/friends/delete/:id',
    {
      schema: {
        ...deleteFriendSchema,
        tags: ['friends'],
      },
      config: auth,
    },
    deleteFriend
  );
}
