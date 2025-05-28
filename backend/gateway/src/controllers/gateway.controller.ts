import { Server } from '../server.js';
import { sendError } from '../helper/friends.helper.js';
import { ErrorCodes } from '../shared/constants/error.const.js';
import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';

/**
 * Fastify pre-handler hook to check the health of required microservices before processing a request.
 * Returns 503 if any required service is unavailable.
 *
 * @param request - FastifyRequest object for the incoming request.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   503 - Service unavailable (ErrorCodes.SERVICE_UNAVAILABLE)
 */
export async function checkMicroservicesHook(request: FastifyRequest, reply: FastifyReply) {
  try {
    if (request.url.includes('/ws')) {
      request.server.log.info({
        request: request,
      });
    }
    if (
      request.url.includes(process.env.AUTH_ADDR || 'auth') &&
      (Server.microservices.get(process.env.AUTH_ADDR || 'auth') === false)
        // Server.microservices.get('game') === false ||
        // Server.microservices.get('profile') === false ||
        // Server.microservices.get('friends') === false)
    ) {
      return sendError(reply, 503, ErrorCodes.SERVICE_UNAVAILABLE);
    } else if (
      request.url.includes(process.env.PROFILE_ADDR || 'profile') &&
      (Server.microservices.get(process.env.AUTH_ADDR || 'auth') === false ||
        Server.microservices.get(process.env.PROFILE_ADDR || 'profile') === false ||
				Server.microservices.get(process.env.GAME_ADDR || 'game') === false)
    ) {
      return sendError(reply, 503, ErrorCodes.SERVICE_UNAVAILABLE);
    } else if (
      request.url.includes(process.env.FRIENDS_ADDR || 'friends') &&
      (Server.microservices.get('auth') === false ||
        Server.microservices.get(process.env.FRIENDS_ADDR || 'friends') === false)
    ) {
      return sendError(reply, 503, ErrorCodes.SERVICE_UNAVAILABLE);
    } else if (
      request.url.includes(process.env.GAME_ADDR || 'game') &&
      (Server.microservices.get('auth') === false ||
        Server.microservices.get(process.env.GAME_ADDR || 'game') === false)
    ) {
      return sendError(reply, 503, ErrorCodes.SERVICE_UNAVAILABLE);
    }
  } catch (err) {
    request.log.error('Error microservices hook:', err);
  }
}

/**
 * Checks the health of all microservices (profile, auth, game, friends) and updates their status in Server.microservices.
 *
 * @param fastify - FastifyInstance for logging.
 * @returns Promise<void>
 */
export async function checkMicroservices() {
  try {
    const [profileStatus, authStatus, gameStatus, friendsStatus] = await Promise.all([
      checkService(process.env.PROFILE_ADDR || 'localhost', process.env.PROFILE_PORT || '8081'),
      checkService(process.env.AUTH_ADDR || 'localhost', process.env.AUTH_PORT || '8082'),
      checkService(process.env.GAME_ADDR || 'localhost', process.env.GAME_PORT || '8083'),
      checkService(process.env.FRIENDS_ADDR || 'localhost', process.env.FRIENDS_PORT || '8084'),
    ]);

    Server.microservices.set(process.env.PROFILE_ADDR || 'profile', profileStatus);
    Server.microservices.set(process.env.AUTH_ADDR || 'auth', authStatus);
    Server.microservices.set(process.env.GAME_ADDR || 'game', gameStatus);
    Server.microservices.set(process.env.FRIENDS_ADDR || 'friends', friendsStatus);
  } catch (err) {
    console.error('Error checking microservices:', err);
  }
}

/**
 * Checks the health endpoint of a specific microservice.
 *
 * @param serviceName - The hostname or address of the service.
 * @param servicePort - The port of the service.
 * @returns Promise<boolean> - True if the service is healthy, false otherwise.
 */
async function checkService(serviceName: string, servicePort: string): Promise<boolean> {
  try {
    const serviceUrl = `http://${serviceName}:${servicePort}/health`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    return response.ok;
  } catch (err) {
    return false;
  }
}

/**
 * Returns the health status of all microservices.
 *
 * @param request - FastifyRequest object for the incoming request.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns an object with microservice statuses.
 */
export async function getHealth(request: FastifyRequest, reply: FastifyReply) {
  const microservices = Object.fromEntries(Server.microservices);
  reply.code(200).send(microservices);
}
