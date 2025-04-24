import { IId } from '../shared/types/api.types.js';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { upload, deletePic } from '../controllers/profil.controller.js';

export default async function profilRoutes(
  fastify: FastifyInstance
): Promise<void> {
  fastify.post<{ Body: FormData; Params: IId }>('/uploads/:id', upload);

  fastify.delete<{ Params: IId }>('/uploads/:id', deletePic);

  fastify.get('/health', (request: FastifyRequest, reply: FastifyReply) => {
    reply.code(204).send();
  });
}
