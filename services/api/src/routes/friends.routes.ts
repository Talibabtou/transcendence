import { FastifyInstance } from 'fastify';
import {  } from '../shared/types/auth.types.js';
import {  } from '../schemas/auth.schemas.js';
import { getFriends, postFriend, patchFriend, deleteFriend } from '../controllers/friends.controllers.js'

export default async function friendsRoutes(fastify: FastifyInstance) {
	fastify.get('friends/', {
		config: { 
		  auth: true, 
		  roles: ['user', 'admin']
		}},
		getFriends);

	fastify.post('friends/', {
		config: { 
		  auth: false
		}},
		postFriend);

	fastify.patch('friends/', {
		config: { 
		  auth: true, 
		  roles: ['user', 'admin']
		}},
		patchFriend);

    fastify.delete('friends/', {
        config: { 
            auth: true, 
            roles: ['user', 'admin']
        }},
        deleteFriend);
}
