import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getHealthSchema, getCheckSchema } from '../schemas/gateway.schemas.js';
import { getHealth } from '../controllers/gateway.controller.js';

const auth = { auth: true, roles: ['user', 'admin'] };

export default async function gatewayRoutes(fastify: FastifyInstance) {
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

  fastify.put(
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

  fastify.delete(
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

  fastify.trace(
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
