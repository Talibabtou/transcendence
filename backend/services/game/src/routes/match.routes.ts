import { FastifyInstance } from 'fastify';
import { GetMatchesQuery, IId, CreateMatchRequest, GetPageQuery } from '../shared/types/match.type.js';
import {
  getMatch,
  getMatches,
  createMatch,
  getMatchHistory,
  matchStats,
  matchSummary,
} from '../controllers/match.controller.js';

export default async function matchRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: GetMatchesQuery }>('/matches', getMatches);

  fastify.get<{ Params: IId }>('/match/:id', getMatch);

  fastify.get<{ Params: IId; Querystring: GetPageQuery }>('/match/history/:id', getMatchHistory);

  fastify.post<{ Body: CreateMatchRequest }>('/match', createMatch);

  // fastify.get<{ Params: IId }>('/match/:id/stats', matchTimeline);

  fastify.get<{ Params: IId }>('/match/stats/:id', matchStats);

  fastify.get<{ Params: IId }>('/match/summary/:id', matchSummary);
}
