import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getPicSchema, getPicsSchema, getHealthSchema, getCheckSchema } from '../schemas/gateway.schemas.js';
import { getPic, getPics, getHealth } from '../controllers/gateway.controller.js';

const auth = { auth: true, roles: ['user', 'admin'] };

export default async function gatewayRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/pics',
    {
      schema: {
        ...getPicsSchema,
        tags: ['gateway'],
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
        tags: ['gateway'],
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
