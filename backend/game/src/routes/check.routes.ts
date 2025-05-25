import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export default async function checkRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', (request: FastifyRequest, reply: FastifyReply) => {
    reply.code(200).send();
  });
}
