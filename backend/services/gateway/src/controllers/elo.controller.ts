import { IId } from '../shared/types/gateway.types.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { sendError } from '../helper/friends.helper.js';
import { ErrorResponse } from '../shared/types/error.type.js';
import { ErrorCodes } from '../shared/constants/error.const.js';
import { Elo, LeaderboardEntry, GetElosQuery } from '../shared/types/elo.type.js';

/**
 * Retrieves a list of ELO ratings based on query parameters.
 *
 * @param request - FastifyRequest object containing query parameters.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns ELO data (Elo[])
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function getElos(request: FastifyRequest<{ Querystring: GetElosQuery }>, reply: FastifyReply) {
  try {
    const subpath = request.url.split('/game')[1];
    const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083${subpath}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const reponseData = (await response.json()) as Elo[] | ErrorResponse;
    return reply.code(response.status).send(reponseData);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Retrieves the ELO rating for a specific user by ID.
 *
 * @param request - FastifyRequest object containing the user ID in params.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns ELO data (Elo)
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function getElo(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply) {
  try {
    const subpath = request.url.split('/game')[1];
    const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083${subpath}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const reponseData = (await response.json()) as Elo | ErrorResponse;
    return reply.code(response.status).send(reponseData);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Retrieves the leaderboard with ELO rankings.
 *
 * @param request - FastifyRequest object.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns leaderboard data (LeaderboardEntry[])
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function getLeaderboard(request: FastifyRequest, reply: FastifyReply) {
  try {
    const subpath = request.url.split('/game')[1];
    const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083${subpath}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const reponseData = (await response.json()) as LeaderboardEntry[] | ErrorResponse;
    return reply.code(response.status).send(reponseData);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}
