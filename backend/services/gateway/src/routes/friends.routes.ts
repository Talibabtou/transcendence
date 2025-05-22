import { FastifyInstance } from 'fastify';
import {
  getFriendsSchema,
  getFriendsMeSchema,
  getStatusSchema,
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
import {
  routesConfigAuth,
  rateLimitConfigHigh,
  rateLimitConfigLow,
  rateLimitConfigMid,
} from '../config/routes.config.js';

export default async function friendsRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: IId }>(
    '/friends/all/:id',
    {
      schema: {
        ...getFriendsSchema,
        tags: ['friends'],
      },
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigMid,
      },
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
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigMid,
      },
    },
    getFriendsMe
  );

  fastify.get<{ Params: IId }>(
    '/friends/check/:id',
    {
      schema: {
        ...getStatusSchema,
        tags: ['friends'],
      },
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigHigh,
      },
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
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigMid,
      },
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
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigHigh,
      },
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
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigLow,
      },
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
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigLow,
      },
    },
    deleteFriend
  );
}
