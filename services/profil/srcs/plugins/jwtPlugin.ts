import { FastifyReply, FastifyRequest, FastifyContextConfig }  from 'fastify';

declare module 'fastify' {
  interface FastifyContextConfig {
    auth?: boolean;
    roles?: string[];
  }
}

export const jwtPluginRegister = {
    secret: process.env.JWT_SECRET || "super_secret",
    sign: {
      expiresIn: '24h',
    }
}

export async function jwtPluginHook(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (request.routeOptions.config?.auth === false) {
      return;
    }
    const authHeader: string | undefined = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer')) {
      request.server.log.warn("Missing or invalid Authorization header", {
        ip: request.ip,
        method: request.method,
        url: request.url
      });
      return reply.status(401).send({ 
        success: false,
        message: 'Missing or invalid Authorization header'
      });
    }
    try {
      await request.jwtVerify();
      const requiredRoles = request.routeOptions.config?.roles;
      const userRole = (request.user as { role: string }).role;
      if (requiredRoles && !requiredRoles.includes(userRole)) {
        request.server.log.warn("Insufficient permissions", {
          ip: request.ip,
          method: request.method,
          url: request.url,
          requiredRoles,
          userRole: userRole
        });
        return reply.status(403).send({
          success: false,
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }
    } catch (err: any) {
      const errorCode = err.code || 'JWT_VERIFICATION_ERROR';
      const message: string = err.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED' 
        ? 'Token expired' 
        : 'Unauthorized';
        request.server.log.error("JWT verification failed", {
          error: err.message,
          code: errorCode,
          ip: request.ip,
          method: request.method,
          url: request.url
        });
      return reply.status(401).send({
        success: false,
        message: message
      });
    }
}
