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

export async function jwtPluginHook(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const authHeader: string | undefined = request.headers['authorization'];
    if (request.routeOptions?.config?.auth === false) {
      return;
    }
    if (!authHeader?.startsWith('Bearer ')) {
      request.server.log.error("Missing or invalid Authorization header");
      return reply.status(401).send({ 
        success: false,
        message: 'Missing or invalid Authorization header'
      });
    }
    try {
      await request.jwtVerify();
    } catch (err: any) {
      const message: string = err.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED' 
        ? 'Token expired' 
        : 'Unauthorized';
      request.server.log.error(message, err);
      return reply.status(401).send({
        success: false,
        message: message
      });
    }
}
