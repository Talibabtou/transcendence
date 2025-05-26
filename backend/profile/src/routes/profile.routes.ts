import { IId } from '../shared/types/gateway.types.js';
import { GetPageQuery } from '../shared/types/match.type.js';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { postPic, deletePic, getSummary, getPic, getHistory } from '../controllers/profile.controller.js';

export default async function profilRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Params: IId }>('/pics/:id', getPic);

  fastify.get<{ Params: IId }>('/summary/:id', getSummary);

  fastify.get<{ Params: IId; Querystring: GetPageQuery }>('/history/:id', getHistory);

  fastify.post<{ Body: FormData; Params: IId }>('/uploads/:id', postPic);

  fastify.delete<{ Params: IId }>('/uploads/:id', deletePic);

  fastify.get('/health', (request: FastifyRequest, reply: FastifyReply) => {
    reply.code(200).send({ status: 'ok' });
  });
}
