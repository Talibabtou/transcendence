import { FastifyInstance } from 'fastify';
import { IId } from '../shared/types/gateway.types.js';
import { GetMatchesQuery, CreateMatchRequest } from '../shared/types/match.type.js';
import {
  getMatch,
  getMatches,
  createMatch,
  // matchTimeline,
  matchStats,
  matchSummary,
} from '../controllers/match.controller.js';
import {
  getMatchSchema,
  getMatchesSchema,
  createMatchSchema,
  // matchTimelineSchema,
  matchStatsSchema,
  matchSummarySchema,
} from '../schemas/match.schemas.js';
import { routesConfigAuth, rateLimitConfigHigh } from '../config/routes.config.js';

export default async function matchRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: GetMatchesQuery }>(
    '/game/matches',
    {
      schema: {
        ...getMatchesSchema,
        tags: ['matches'],
      },
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigHigh,
      },
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
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigHigh,
      },
    },
    getMatch
  );

  // fastify.get<{ Params: IId }>(
  //   '/game/match/:id/stats',
  //   {
  //     schema: {
  //       ...matchTimelineSchema,
  //       tags: ['matches'],
  //     },
  //     config: auth,
  //   },
  //   matchTimeline
  // );

  fastify.get<{ Params: IId }>(
    '/game/match/stats/:id',
    {
      schema: {
        ...matchStatsSchema,
        tags: ['matches'],
      },
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigHigh,
      },
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
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigHigh,
      },
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
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigHigh,
      },
    },
    createMatch
  );
}
