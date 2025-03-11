import { FastifyInstance, FastifyReply, FastifyRequest }  from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';

declare module 'fastify' {
  interface FastifyContextConfig {
    auth?: boolean;
  }
}

async function jwtPlugin(fastify: FastifyInstance) {
  
  fastify.register(fastifyJwt, {
    secret: "super_secret",
    sign: {
      expiresIn: '24h',
    },
  });

  fastify.decorate('generateToken', function (payload: object) {
    return fastify.jwt.sign(payload);
  });

  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.routeOptions?.config?.auth !== false) {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.status(401).send({ message: 'Unauthorized' });
      }
    }
  });
}

module.exports = fp(jwtPlugin, { name: 'jwtPlugin' });