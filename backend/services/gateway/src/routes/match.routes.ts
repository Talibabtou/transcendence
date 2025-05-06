import { FastifyInstance } from 'fastify';
import { IId } from '../shared/types/gateway.types.js';
import { GetMatchesQuery, CreateMatchRequest } from '../shared/types/match.type.js';
import {
  getMatch,
  getMatches,
  createMatch,
  matchTimeline,
  matchStats,
  matchSummary,
} from '../controllers/match.controller.js';
import {
  getMatchSchema,
  getMatchesSchema,
  createMatchSchema,
  matchTimelineSchema,
  matchStatsSchema,
  matchSummarySchema,
} from '../schemas/match.schemas.js';

const auth = { auth: true, roles: ['user', 'admin'] };

export default async function matchRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: GetMatchesQuery }>(
    '/game/matches',
    {
      schema: {
        ...getMatchesSchema,
        tags: ['matches'],
      },
      config: auth,
    },
    getMatches
  );

  fastify.get<{ Params: IId }>(
    '/game/match/:id',
    {
      schema: {
        ...getMatchSchema,
        tags: ['matches'],
      },
      config: auth,
    },
    getMatch
  );

  fastify.get<{ Params: IId }>(
    '/game/match/:id/stats',
    {
      schema: {
        ...matchTimelineSchema,
        tags: ['matches'],
      },
      config: auth,
    },
    matchTimeline
  );

  fastify.get<{ Params: IId }>(
    '/game/match/stats/:id',
    {
      schema: {
        ...matchStatsSchema,
        tags: ['matches'],
      },
      config: auth,
    },
    matchStats
  );

  fastify.get<{ Params: IId }>(
    '/game/match/summary/:id',
    {
      schema: {
        ...matchSummarySchema,
        tags: ['matches'],
      },
      config: auth,
    },
    matchSummary
  );

  fastify.post<{ Body: CreateMatchRequest }>(
    '/game/match',
    {
      schema: {
        ...createMatchSchema,
        tags: ['matches'],
      },
      config: auth,
    },
    createMatch
  );
}
