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

/**
 * Checks if a UUID exists by making a GET request to an authentication service.
 *
 * @param id The UUID to check. Can be `string` or `undefined`.
 * @returns `true` if the UUID exists (i.e., the service returns a status less than 400), `false` otherwise.
 * @throws `Error` with message 'SERVICE_UNAVAILABLE' if the fetch operation fails (e.g., network error, service not reachable).
 */
export function UuidExist(id: string | undefined): boolean {
  try {
    if (id === undefined) return false;
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:${process.env.AUTH_PORT || 8082}/username/${id}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    if (response.status >= 400) return false;
    return true;
  } catch (err) {
    throw new Error('SERVICE_UNAVAILABLE');
  }
}
