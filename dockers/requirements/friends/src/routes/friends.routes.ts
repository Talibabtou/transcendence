import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getFriends,getFriend, postFriend, patchFriend, deleteFriend, deleteFriends } from '../controllers/friends.controllers.js';

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', {
    config: { 
      auth: true, 
      roles: ['user', 'admin']
    }},
    getFriends);

  fastify.get('/check', {
    config: { 
      auth: true, 
      roles: ['user', 'admin']
    }},
    getFriend);

  fastify.post('/create', {
    config: { 
      auth: true, 
      roles: ['user', 'admin']
    }},
    postFriend);

  fastify.patch('/modify', {
    config: { 
      auth: true, 
      roles: ['user', 'admin']
    }},
    patchFriend);

  fastify.delete('/delete', {
    config: { 
      auth: true, 
      roles: ['user', 'admin']
    }},
    deleteFriends);

  fastify.delete('/delete/:id', {
    config: { 
      auth: true, 
      roles: ['user', 'admin']
    }},
    deleteFriend);

  fastify.get('/health', {
    config: { 
      auth: false
    }},
    (request: FastifyRequest, reply: FastifyReply) => { reply.code(200).send(); });
}
