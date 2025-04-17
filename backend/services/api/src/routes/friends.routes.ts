import { FastifyInstance } from 'fastify';
import { getFriendsSchema, getFriendsMeSchema, getCheckSchema, postCreateSchema, patchAcceptSchema, deleteAllSchema, deleteFriendSchema,  } from '../schemas/friends.schemas.js';
import { IId } from '../shared/types/api.types.js'
import { getFriends, getFriendsMe, getFriend, postFriend, patchFriend, deleteFriend, deleteFriends } from '../controllers/friends.controllers.js'

const auth = { auth: true, roles: ['user', 'admin'] }

export default async function friendsRoutes(fastify: FastifyInstance) {
	
	fastify.get<{ Params: IId }>('/friends/all/:id', {
		schema: {
			...getFriendsSchema,
			tags: ['friends']
		},
		config: auth
		},
		getFriends);

	fastify.get('/friends/all/me', {
		schema: {
			...getFriendsMeSchema,
			tags: ['friends']
		},
		config: auth
		},
		getFriendsMe);

	fastify.get<{ Params: IId }>('/friends/check/:id', {
		schema: {
			...getCheckSchema,
			tags: ['friends']
		},
		config: auth
		},
		getFriend);

	fastify.post<{ Body: IId }>('/friends/create', {
		schema: {
			...postCreateSchema,
			tags: ['friends']
		},
		config: auth
		},
		postFriend);

	fastify.patch<{ Body: IId }>('/friends/accept', {
		schema: {
			...patchAcceptSchema,
			tags: ['friends']
		},
		config: auth
		},
		patchFriend);

	fastify.delete('/friends/delete/all', {
		schema: {
			...deleteAllSchema,
			tags: ['friends']
		},
		config: auth
		},
		deleteFriends);
	
	fastify.delete<{ Querystring: IId }>('/friends/delete', {
		schema: {
			...deleteFriendSchema,
			tags: ['friends']
		},
		config: auth
		},
		deleteFriend);
}
