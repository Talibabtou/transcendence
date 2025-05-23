import { IId } from '../shared/types/gateway.types.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { sendError } from '../helper/friends.helper.js';
import { ErrorResponse } from '../shared/types/error.type.js';
import { ErrorCodes } from '../shared/constants/error.const.js';
import { Match, GetTournamentsQuery, FinalResultObject } from '../shared/types/match.type.js';

/**
 * Retrieves a specific tournament by ID.
 *
 * @param request - FastifyRequest object containing the tournament ID in params.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns tournament data (Match[])
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function getTournament(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply) {
  try {
    const subpath = request.url.split('/game')[1];
    const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083${subpath}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const reponseData = (await response.json()) as Match[] | null | ErrorResponse;
    return reply.code(response.status).send(reponseData);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Retrieves a list of tournaments based on query parameters.
 *
 * @param request - FastifyRequest object containing query parameters.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns tournaments data (Match[])
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function getTournaments(
  request: FastifyRequest<{ Querystring: GetTournamentsQuery }>,
  reply: FastifyReply
) {
  try {
    const subpath = request.url.split('/game')[1];
    const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083${subpath}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const reponseData = (await response.json()) as Match[] | ErrorResponse;
    return reply.code(response.status).send(reponseData);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Retrieves the final matches for a specific tournament.
 *
 * @param request - FastifyRequest object containing the tournament ID in params.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns final match results (FinalResultObject)
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function getFinalMatches(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply) {
  try {
    const subpath = request.url.split('/game')[1];
    const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083${subpath}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const reponseData = (await response.json()) as FinalResultObject | ErrorResponse;
    return reply.code(response.status).send(reponseData);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}
