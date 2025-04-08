import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getFriends, postFriend, patchFriend, deleteFriend, deleteFriends } from '../controllers/friends.controllers.js';

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', {
    config: { 
      auth: false, 
      // roles: ['user', 'admin']
    }},
    getFriends);

  fastify.post('/', {
    config: { 
      auth: false, 
      // roles: ['user', 'admin']
    }},
    postFriend);

  fastify.patch('/', {
    config: { 
      auth: false, 
      // roles: ['user', 'admin']
    }},
    patchFriend);

  fastify.delete('/', {
    config: { 
      auth: false, 
      // roles: ['user', 'admin']
    }},
    deleteFriends);

  fastify.delete('/:id', {
    config: { 
      auth: false, 
      // roles: ['user', 'admin']
    }},
    deleteFriend);

  fastify.get('/check', {
    config: { 
      auth: false
    }},
    (request: FastifyRequest, reply: FastifyReply) => { reply.code(200).send(); });
}
