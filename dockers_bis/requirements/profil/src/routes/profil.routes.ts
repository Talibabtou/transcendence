import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { upload, deletePic } from '../controllers/profil.controllers.js';

export default async function profilRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/uploads', {
    config: { 
      auth: true, 
      roles: ['user', 'admin']
    }},
    upload);
  
  fastify.delete('/uploads', {
    config: { 
      auth: true, 
      roles: ['user', 'admin']
    }},
    deletePic);

  fastify.get('/health', {
    config: { 
      auth: false
    }},
    (request: FastifyRequest, reply: FastifyReply) => { reply.code(204).send(); });
}
