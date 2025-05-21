import { FastifyRequest } from 'fastify';

export const rateLimitConfig = {
  max: 200,
  timeWindow: '1 minute',
  keyGenerator: (request: FastifyRequest) => request.ip,
  errorResponseBuilder: (request: FastifyRequest, context: { after: string }) => {
    return {
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Retry in ${context.after}`,
    };
  },
};
