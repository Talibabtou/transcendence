import {
  getMatchSchema,
  getMatchesSchema,
  createMatchSchema,
  matchStatsSchema,
  matchSummarySchema,
} from '../schemas/match.schemas.js';
import { FastifyInstance } from 'fastify';
import {
  getMatch,
  getMatches,
  createMatch,
  matchStats,
  matchSummary,
} from '../controllers/match.controller.js';
import { IId } from '../shared/types/gateway.types.js';
import { GetMatchesQuery, CreateMatchRequest } from '../shared/types/match.type.js';
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
