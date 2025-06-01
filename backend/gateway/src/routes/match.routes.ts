import { FastifyInstance } from 'fastify';
import { IId } from '../shared/types/gateway.types.js';
import { CreateMatchRequest } from '../shared/types/match.type.js';
import {
  getMatch,
  createMatch,
  matchStats,
  matchSummary,
} from '../controllers/match.controller.js';
import {
  getMatchSchema,
  createMatchSchema,
  matchStatsSchema,
  matchSummarySchema,
} from '../schemas/match.schemas.js';
import { routesConfigAuth, rateLimitConfigHigh } from '../config/routes.config.js';

export default async function matchRoutes(fastify: FastifyInstance): Promise<void> {

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
