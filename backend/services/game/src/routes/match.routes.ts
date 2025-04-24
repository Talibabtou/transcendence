import { FastifyInstance } from 'fastify';
import {
  GetMatchesQuery,
  IId,
  CreateMatchRequest,
} from '../shared/types/match.type.js';
import {
  getMatch,
  getMatches,
  createMatch,
  matchTimeline,
  matchStats,
  matchSummary,
} from '../controllers/match.controller.js';

export default async function matchRoutes(
  fastify: FastifyInstance
): Promise<void> {
  fastify.get<{ Querystring: GetMatchesQuery }>('/', getMatches);

  fastify.get<{ Params: IId }>('/match/:id', getMatch);

  fastify.post<{ Body: CreateMatchRequest }>('/match', createMatch);

  fastify.get<{ Params: IId }>('/match/:id/stats', matchTimeline);

  fastify.get<{ Params: IId }>('/match/stats/:player_id', matchStats);

  fastify.get<{ Params: IId }>('/match/summary/:id', matchSummary);
}
