import { FastifyInstance } from 'fastify';
import {  } from '../shared/types/auth.types.js';
import {  } from '../schemas/auth.schemas.js';
import { IId } from '../shared/types/api.types.js'
import { getFriends, getFriendsMe, getFriend, postFriend, patchFriend, deleteFriend, deleteFriends } from '../controllers/friends.controllers.js'

const auth = { auth: true, roles: ['user', 'admin'] }

export default async function friendsRoutes(fastify: FastifyInstance) {
	
	fastify.get<{ Body: IId }>('friends/all', {
		config: auth
		},
		getFriends);

	fastify.get<{ Body: IId }>('friends/all/me', {
		config: auth
		},
		getFriendsMe);

	fastify.get<{ Body: IId }>('friends/check', {
		config: auth
		},
		getFriend);

	fastify.post<{ Body: IId }>('friends/create', {
		config: auth
		},
		postFriend);

	fastify.patch<{ Body: IId }>('friends/accept', {
		config: auth
		},
		patchFriend);

	fastify.delete<{ Querystring: IId }>('friends/delete/all', {
		config: auth
		},
		deleteFriends);
	
	fastify.delete('friends/delete', {
		config: auth
		},
		deleteFriend);
}
