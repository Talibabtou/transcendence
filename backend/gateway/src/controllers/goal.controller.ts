import { IId } from '../shared/types/gateway.types.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { sendError } from '../helper/friends.helper.js';
import { ErrorResponse } from '../shared/types/error.type.js';
import { ErrorCodes } from '../shared/constants/error.const.js';
import { GetGoalsQuery, CreateGoalRequest, Goal } from '../shared/types/goal.type.js';

/**
 * Retrieves a list of goals based on query parameters.
 *
 * @param request - FastifyRequest object containing query parameters.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns goals data (Goal[])
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function getGoals(request: FastifyRequest<{ Querystring: GetGoalsQuery }>, reply: FastifyReply) {
  try {
    const subpath = request.url.split('/game')[1];
    const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083${subpath}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const reponseData = (await response.json()) as Goal[] | ErrorResponse;
    return reply.code(response.status).send(reponseData);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Retrieves a specific goal by ID.
 *
 * @param request - FastifyRequest object containing the goal ID in params.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns goal data (Goal)
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function getGoal(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply) {
  try {
    const subpath = request.url.split('/game')[1];
    const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083${subpath}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const reponseData = (await response.json()) as Goal | null | ErrorResponse;
    return reply.code(response.status).send(reponseData);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Creates a new goal with the provided data.
 *
 * @param request - FastifyRequest object containing the goal ID in params and goal data in body.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns created goal data (Goal)
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function createGoal(
  request: FastifyRequest<{ Params: IId; Body: CreateGoalRequest }>,
  reply: FastifyReply
) {
  try {
    const subpath = request.url.split('/game')[1];
    const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083${subpath}`;
    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': request.headers['content-type'] || 'application/json',
      },
      body: JSON.stringify(request.body),
    });
    const responseData = (await response.json()) as Goal | ErrorResponse;
    return reply.code(response.status).send(responseData);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}
