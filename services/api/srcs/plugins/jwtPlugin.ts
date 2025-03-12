import { FastifyReply, FastifyRequest }  from 'fastify';

declare module 'fastify' {
  interface FastifyContextConfig {
    auth?: boolean;
  }
}

export const jwtPluginRegister = {
    secret: "super_secret",
    sign: {
      expiresIn: '24h',
    }
}

export async function jwtPluginHook(request: FastifyRequest, reply: FastifyReply) {

    const authHeader = request.headers['authorization'];
    if (request.routeOptions?.config?.auth === false) {
      return;
    }

    // Check if Authorization header exists
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ message: 'Missing or invalid Authorization header' });
    }

    try {
      await request.jwtVerify();
    } catch (err: any) {
      // More specific error handling
      const message = err.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED' 
        ? 'Token expired' 
        : 'Unauthorized';
      return reply.status(401).send({ message });
    }
}
