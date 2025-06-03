import { FastifyReply } from 'fastify';
import { createErrorResponse, ErrorCodes } from '../shared/constants/error.const.js';

/**
 * Sends a standardized error response using Fastify's reply object.
 *
 * @param reply - The FastifyReply object to send the response with.
 * @param code - The HTTP status code to use for the response.
 * @param errorCode - The application-specific error code to include in the response body.
 * @returns The result of reply.code().send() with the error response.
 */
export function sendError(reply: FastifyReply, code: number, errorCode: ErrorCodes) {
  return reply.code(code).send(createErrorResponse(code, errorCode));
}

/**
 * Checks if the provided id is a non-empty string after trimming whitespace.
 *
 * @param id - The id to validate.
 * @returns True if id is a non-empty string, false otherwise.
 */
export function isValidId(id: string | undefined): boolean {
  return typeof id === 'string' && id.trim().length > 0;
}
