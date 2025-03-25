import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { IReply } from '../types/profil.types.js';
import { upload, deletePic } from '../controllers/profil.controllers.js';

export default async function profilRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Reply: IReply }>('/uploads',
    { config: { 
      auth: true, 
      roles: ['user', 'admin']
    }},
    upload);
  
  fastify.delete<{ Reply: IReply }>('/uploads',
    { config: { 
      auth: true, 
      roles: ['user', 'admin']
    }},
    deletePic);

  fastify.get('/check', {
    config: { 
      auth: false
    }},
    (request: FastifyRequest, reply: FastifyReply) => { reply.code(204).send(); });
}
