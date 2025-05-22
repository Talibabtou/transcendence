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
    iat?: number;
    exp?: number;
  };
}

const customExtractToken = (request: FastifyRequest): string | null => {
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return token;
  }
  if (request.query && typeof (request.query as { token?: string }).token === 'string') {
    const token = (request.query as { token: string }).token;
    return token;
  }
  return null;
};

export const jwtRegister = {
  secret: process.env.JWT_SECRET || 'super_secret',
  sign: {
    expiresIn: '72h',
  },
};

export async function jwtHook(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.routeOptions.config || !request.routeOptions.config?.auth) {
    request.server.log.info('[jwtHook] No auth required for this route.');
    return;
  }
  request.server.log.info('[jwtHook] Auth required for this route.');
  // Check jwt
  try {
    let tokenToVerify: string | null = null;
    let userPayload: FastifyJWT['user'] | null = null;

    tokenToVerify = customExtractToken(request);

    if (!tokenToVerify) {
      const errorMessage = createErrorResponse(401, ErrorCodes.JWT_BAD_HEADER);
      return reply.code(401).send(errorMessage);
    }
    try {
      userPayload = await request.server.jwt.verify<FastifyJWT['user']>(tokenToVerify);
      request.user = userPayload;
    } catch (jwtError: any) {
      request.server.log.error('[jwtHook] server.jwt.verify() failed.', {
        errorMsg: jwtError.message,
        errorCode: jwtError.code,
        name: jwtError.name,
      });
      const errorCode = jwtError.message.includes('expired')
        ? ErrorCodes.JWT_EXP_TOKEN
        : ErrorCodes.UNAUTHORIZED;
      const errorMessage = createErrorResponse(401, errorCode);
      return reply.code(401).send(errorMessage);
    }

    if (!request.user) {
      const errorMessage = createErrorResponse(401, ErrorCodes.UNAUTHORIZED);
      return reply.code(401).send(errorMessage);
    }
    // Check if user exist
    const id: string = (request.user as FastifyJWT['user']).id;
    const serviceUserUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082/user/${id}`;
    const user = await fetch(serviceUserUrl, { method: 'GET' });
    if (user.status >= 400) {
      request.server.log.warn(`[jwtHook] User check failed (status ${user.status}) for ID: ${id}`);
      const errorMessage = createErrorResponse(401, ErrorCodes.UNAUTHORIZED);
      return reply.code(401).send(errorMessage);
    }
    request.server.log.info(`[jwtHook] User check successful for ID: ${id}`);
    // Check if revoked
    const jwtId = (request.user as FastifyJWT['user']).jwtId;
    if (jwtId) {
      request.server.log.info(`[jwtHook] Checking revoked status for JWT ID: ${jwtId}`);
      const serviceRevokedUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082/revoked/${jwtId}`;
      const revoked = await fetch(serviceRevokedUrl, { method: 'GET' });
      if (revoked.status >= 400) {
        request.server.log.warn(
          `[jwtHook] Revoked check failed (status ${revoked.status}) for JWT ID: ${jwtId}`
        );
        const responseData = (await revoked.json()) as ErrorResponse;
        return reply.code(revoked.status).send(responseData);
      }
      request.server.log.info(`[jwtHook] Revoked check successful for JWT ID: ${jwtId}`);
    } else {
      request.server.log.info('[jwtHook] No jwtId found in token, skipping revoked check.');
    }
    // Check role
    const requiredRoles = request.routeOptions.config?.roles;
    const userRole = (request.user as FastifyJWT['user']).role;
    if (requiredRoles && !requiredRoles.includes(userRole)) {
      request.server.log.warn('[jwtHook] Insufficient permissions', {
        ip: request.ip,
        url: request.url,
        requiredRoles,
        userRole: userRole,
      });
      const errorMessage = createErrorResponse(403, ErrorCodes.JWT_INSUFFICIENT_PERMISSIIONS);
      return reply.code(403).send(errorMessage);
    }
    return;
  } catch (err: any) {
    request.server.log.error('[jwtHook] UNEXPECTED error in hook processing', {
      errorMsg: err.message,
      errorCode: err.code,
      name: err.name,
      ip: request.ip,
      url: request.url,
      stack: err.stack?.substring(0, 300),
    });
    const errorMessage = createErrorResponse(500, ErrorCodes.UNAUTHORIZED);
    return reply.code(500).send(errorMessage);
  }
}
