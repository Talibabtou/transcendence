import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getPicSchema, getPicsSchema, getHealthSchema, getCheckSchema } from '../schemas/api.schemas.js';
import { getPic, getPics, getHealth } from '../controllers/api.controller.js';

const auth = { auth: true, roles: ['user', 'admin'] };

export default async function apiRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/pics',
    {
      schema: {
        ...getPicsSchema,
        tags: ['api'],
      },
      config: auth,
    },
    getPics
  );

  fastify.get(
    '/pics/:id',
    {
      schema: {
        ...getPicSchema,
        tags: ['api'],
      },
      config: auth,
    },
    getPic
  );

  fastify.get(
    '/health',
    {
      schema: {
        ...getHealthSchema,
        tags: ['system'],
      },
    },
    getHealth
  );

  fastify.get(
    '/check',
    {
      schema: {
        ...getCheckSchema,
        tags: ['system'],
      },
    },
    (request: FastifyRequest, reply: FastifyReply) => {
      reply.code(200).send({ check: 'ok' });
    }
  );
}
