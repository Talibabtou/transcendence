import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getFriends, postFriend, patchFriend, deleteFriend } from '../controllers/friends.controllers.js';

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', {
    config: { 
      auth: true, 
      roles: ['user', 'admin']
    }},
    getFriends);

  fastify.post('/', {
    config: { 
      auth: true, 
      roles: ['user', 'admin']
    }},
    postFriend);

  fastify.patch('/', {
    config: { 
      auth: true, 
      roles: ['user', 'admin']
    }},
    patchFriend);

  fastify.delete('/', {
    config: { 
      auth: true, 
      roles: ['user', 'admin']
    }},
    deleteFriend);

  fastify.get('/check', {
    config: { 
      auth: false
    }},
    (request: FastifyRequest, reply: FastifyReply) => { reply.code(200).send(); });
}
