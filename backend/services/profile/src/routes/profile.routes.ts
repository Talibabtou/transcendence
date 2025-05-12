import { IId } from '../shared/types/gateway.types.js';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { postPic, deletePic, getSummary, getPic } from '../controllers/profile.controller.js';

export default async function profilRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Params: IId }>('/pics/:id', getPic);
  
  fastify.get<{ Params: IId }>('/summary/:id', getSummary);

  fastify.post<{ Body: FormData; Params: IId }>('/uploads/:id', postPic);

  fastify.delete<{ Params: IId }>('/uploads/:id', deletePic);

  fastify.get('/health', (request: FastifyRequest, reply: FastifyReply) => {
    reply.code(204).send();
  });
}
