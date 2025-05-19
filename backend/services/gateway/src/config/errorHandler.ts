import { FastifyReply, FastifyRequest } from 'fastify';

interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  validation?: unknown[];
  validationContext?: string;
}

export default function errorHandler(error: Error, request: FastifyRequest, reply: FastifyReply) {
  const customError = error as CustomError;
  let status = customError.statusCode || 500;

  // Fastify schema validation error
  if (customError.validation) {
    status = 400;
  }

  const errorResponse = {
    statusCode: status,
    code: customError.code || 'INTERNAL_SERVER_ERROR',
    error: customError.name || (customError.validation ? 'ValidationError' : 'InternalServerError'),
    message: customError.message || 'An unexpected error occurred',
    ...(customError.validation && {
      validation: customError.validation,
      validationContext: customError.validationContext,
    }),
  };

  // Special handling for payload too large
  if (status === 413 || customError.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
    errorResponse.error = 'PayloadTooLarge';
    errorResponse.message = 'Payload too large';
  }

  request.server.log.error(error);
  return reply.status(status).send(errorResponse);
}
