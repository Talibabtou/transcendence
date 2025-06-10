import {
  Match,
  PlayerMatchSummary,
  PlayerStats,
  CreateMatchRequest,
  IId,
  IMatchId,
} from '../shared/types/match.type.js';
import { UuidExist } from '../helper/auth.helper.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { sendError } from '../helper/friends.helper.js';
import { ErrorResponse } from '../shared/types/error.type.js';
import { ErrorCodes } from '../shared/constants/error.const.js';

/**
 * Retrieves a specific match by match ID.
 *
 * @param request - FastifyRequest object containing the match ID in params.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns match data (Match)
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function getMatch(request: FastifyRequest<{ Params: IMatchId }>, reply: FastifyReply) {
  try {
    const subpath = request.url.split('/game')[1];
    const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:${process.env.GAME_PORT || 8083}${subpath}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const reponseData = (await response.json()) as Match | null | ErrorResponse;
    return reply.code(response.status).send(reponseData);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Retrieves a summary of matches for a specific player by ID.
 *
 * @param request - FastifyRequest object containing the player ID in params.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns player match summary (PlayerMatchSummary)
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function matchSummary(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply) {
  try {
    try{
      if (!UuidExist(request.params.id)) return sendError(reply, 404, ErrorCodes.PLAYER_NOT_FOUND); 
    } catch (err) {
      return sendError(reply, 503, ErrorCodes.SERVICE_UNAVAILABLE);
    }
    const subpath = request.url.split('/game')[1];
    const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:${process.env.GAME_PORT || 8083}${subpath}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const reponseData = (await response.json()) as PlayerMatchSummary | ErrorResponse;
    return reply.code(response.status).send(reponseData);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Retrieves match statistics for a specific player by ID.
 *
 * @param request - FastifyRequest object containing the player ID in params.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns player stats (PlayerStats)
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function matchStats(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply) {
  try {
    try{
      if (!UuidExist(request.params.id)) return sendError(reply, 404, ErrorCodes.PLAYER_NOT_FOUND); 
    } catch (err) {
      return sendError(reply, 503, ErrorCodes.SERVICE_UNAVAILABLE);
    }
    const subpath = request.url.split('/game')[1];
    const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:${process.env.GAME_PORT || 8083}${subpath}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const reponseData = (await response.json()) as PlayerStats | ErrorResponse;
    return reply.code(response.status).send(reponseData);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Creates a new match with the provided data.
 *
 * @param request - FastifyRequest object containing match data in body.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns created match data (Match)
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function createMatch(
  request: FastifyRequest<{ Body: CreateMatchRequest }>,
  reply: FastifyReply
) {
  try {
    try{
      if (!UuidExist(request.body.player_1)) return sendError(reply, 404, ErrorCodes.PLAYER_NOT_FOUND);
      if (!UuidExist(request.body.player_2)) return sendError(reply, 404, ErrorCodes.PLAYER_NOT_FOUND); 
    } catch (err) {
      return sendError(reply, 503, ErrorCodes.SERVICE_UNAVAILABLE);
    }
    const subpath = request.url.split('/game')[1];
    const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:${process.env.GAME_PORT || 8083}${subpath}`;
    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': request.headers['content-type'] || 'application/json',
      },
      body: JSON.stringify(request.body),
    });
    const responseData = (await response.json()) as Match | ErrorResponse;
    return reply.code(response.status).send(responseData);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}
