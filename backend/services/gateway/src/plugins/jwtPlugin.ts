import { FastifyReply, FastifyRequest } from 'fastify';
import { ErrorResponse } from '../shared/types/error.type.js';
import { createErrorResponse, ErrorCodes } from '../shared/constants/error.const.js';

declare module 'fastify' {
  interface FastifyContextConfig {
    auth?: boolean;
    roles?: string[];
  }
}

export interface FastifyJWT {
  user: {
    id: string;
    role: string;
    jwtId?: string;
    twofa?: boolean;
  };
}

export const jwtPluginRegister = {
  secret: process.env.JWT_SECRET || 'super_secret',
  sign: {
    expiresIn: '72h',
  },
};

export async function jwtPluginHook(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.routeOptions.config || !request.routeOptions.config?.auth) return;
  try {
    // check header
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

    // check jwt
    await request.jwtVerify();

    // display it
    console.log({
      id: (request.user as FastifyJWT['user']).id,
      jwtId: (request.user as FastifyJWT['user']).jwtId,
      twofa: (request.user as FastifyJWT['user']).twofa,
      role: (request.user as FastifyJWT['user']).role,
    });

    // check user exist
    const id: string = (request.user as FastifyJWT['user']).id;
    const subpath = request.url.split('/auth')[1];
    const serviceUserUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}/${id}`;
    const user = await fetch(serviceUserUrl, { method: 'GET' });
    if (user.status >= 400) {
      const errorMessage = createErrorResponse(401, ErrorCodes.UNAUTHORIZED);
      return reply.code(401).send(errorMessage);
    }

    // check revoked
    const jwtId = (request.user as FastifyJWT['user']).jwtId;
    const serviceRevokedUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082/revoked/${jwtId}`;
    const revoked = await fetch(serviceRevokedUrl, { method: 'GET' });
    if (revoked.status >= 400) {
      const responseData = (await revoked.json()) as ErrorResponse;
      return reply.code(revoked.status).send(responseData);
    }

    // check role
    const requiredRoles = request.routeOptions.config?.roles;
    const userRole = (request.user as FastifyJWT['user']).role;
    if (requiredRoles && !requiredRoles.includes(userRole)) {
      request.server.log.warn('Insufficient permissions', {
        ip: request.ip,
        method: request.method,
        url: request.url,
        requiredRoles,
        userRole: userRole,
      });
      const errorMessage = createErrorResponse(403, ErrorCodes.JWT_INSUFFICIENT_PERMISSIIONS);
      return reply.code(403).send(errorMessage);
    }

    return;
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
