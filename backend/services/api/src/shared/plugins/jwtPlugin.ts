import { FastifyReply, FastifyRequest } from 'fastify';
import { createErrorResponse, ErrorCodes } from '../constants/error.const.js';

declare module 'fastify' {
  interface FastifyContextConfig {
    auth?: boolean;
    roles?: string[];
  }
}

export interface FastifyJWT {
  user: {
    id: string;
  };
}

export const jwtPluginRegister = {
  secret: process.env.JWT_SECRET || 'super_secret',
  sign: {
    expiresIn: '24h',
  },
};

export async function jwtPluginHook(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.routeOptions.config || !request.routeOptions.config?.auth) return;
  const authHeader: string | undefined = request.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    request.server.log.warn('Missing or invalid Authorization header', {
      ip: request.ip,
      method: request.method,
      url: request.url,
    });
    const errorMessage = createErrorResponse(401, ErrorCodes.JWT_BAD_HEADER);
    return reply.code(401).send(errorMessage);
  }
  try {
    await request.jwtVerify();
    // const requiredRoles = request.routeOptions.config?.roles;
    // const userRole = (request.user as { role: string }).role;
    // if (requiredRoles && !requiredRoles.includes(userRole)) {
    //   request.server.log.warn("Insufficient permissions", {
    //     ip: request.ip,
    //     method: request.method,
    //     url: request.url,
    //     requiredRoles,
    //     userRole: userRole
    //   });
    //   const errorMessage = createErrorResponse(403, ErrorCodes.JWT_INSUFFICIENT_PERMISSIIONS)
    //   return reply.code(403).send(errorMessage);
    // }
  } catch (err) {
    if (err instanceof Error && err.message.includes('expired')) {
      request.server.log.error('JWT verification failed', {
        error: err.message,
        ip: request.ip,
        method: request.method,
        url: request.url,
      });
      const errorMessage = createErrorResponse(401, ErrorCodes.JWT_EXP_TOKEN);
      return reply.code(401).send(errorMessage);
    }
    const errorMessage = createErrorResponse(401, ErrorCodes.UNAUTHORIZED);
    return reply.code(401).send(errorMessage);
  }
}
