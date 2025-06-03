import { FastifyInstance } from 'fastify';
import {
  getMatch,
  createMatch,
  getMatchHistory,
  matchStats,
  matchSummary,
} from '../controllers/match.controller.js';
import { IId, CreateMatchRequest, GetPageQuery } from '../shared/types/match.type.js';

export default async function matchRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Params: IId }>('/match/:id', getMatch);
	
  fastify.get<{ Params: IId; Querystring: GetPageQuery }>('/match/history/:id', getMatchHistory);

  fastify.post<{ Body: CreateMatchRequest }>('/match', createMatch);

  fastify.get<{ Params: IId }>('/match/stats/:id', matchStats);

  fastify.get<{ Params: IId }>('/match/summary/:id', matchSummary);
}
