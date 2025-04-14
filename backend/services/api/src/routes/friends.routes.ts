import { FastifyInstance } from 'fastify';
import { getFriendsSchema, getFriendsMeSchema, getCheckSchema, postCreateSchema, patchAcceptSchema, deleteAllSchema, deleteFriendSchema,  } from '../schemas/friends.schemas.js';
import { IId } from '../shared/types/api.types.js'
import { getFriends, getFriendsMe, getFriend, postFriend, patchFriend, deleteFriend, deleteFriends } from '../controllers/friends.controllers.js'

const auth = { auth: true, roles: ['user', 'admin'] }

export default async function friendsRoutes(fastify: FastifyInstance) {
	
	fastify.get<{ Params: IId }>('friends/all/:id', {
		schema: getFriendsSchema,
		config: auth
		},
		getFriends);

	fastify.get('friends/all/me', {
		schema: getFriendsMeSchema,
		config: auth
		},
		getFriendsMe);

	fastify.get<{ Body: IId }>('friends/check', {
		schema: getCheckSchema,
		config: auth
		},
		getFriend);

	fastify.post<{ Body: IId }>('friends/create', {
		schema: postCreateSchema,
		config: auth
		},
		postFriend);

	fastify.patch<{ Body: IId }>('friends/accept', {
		schema: patchAcceptSchema,
		config: auth
		},
		patchFriend);

	fastify.delete('friends/delete/all', {
		schema: deleteAllSchema,
		config: auth
		},
		deleteFriends);
	
	fastify.delete<{ Querystring: IId }>('friends/delete', {
		schema: deleteFriendSchema,
		config: auth
		},
		deleteFriend);
}
