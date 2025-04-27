import { IId } from '../shared/types/api.types.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { ErrorResponse } from '../shared/types/error.type.js';
import { Match, GetTournamentsQuery, FinalResultObject } from '../shared/types/match.type.js';
import { ErrorCodes, createErrorResponse } from '../shared/constants/error.const.js';

export async function getTournament(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply) {
  try {
    const subpath = request.url.split('/v1')[1];
    const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083${subpath}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const reponseData = (await response.json()) as Match[] | null | ErrorResponse;
    return reply.code(response.status).send(reponseData);
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

export async function getTournaments(
  request: FastifyRequest<{ Querystring: GetTournamentsQuery }>,
  reply: FastifyReply
) {
  try {
    const subpath = request.url.split('/v1')[1];
    const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083${subpath}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const reponseData = (await response.json()) as Match[] | ErrorResponse;
    return reply.code(response.status).send(reponseData);
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

export async function getFinalMatches(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply) {
  try {
    const subpath = request.url.split('/v1')[1];
    const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083${subpath}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const reponseData = (await response.json()) as FinalResultObject | ErrorResponse;
    return reply.code(response.status).send(reponseData);
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}
