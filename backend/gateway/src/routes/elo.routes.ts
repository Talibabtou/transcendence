import { FastifyInstance } from 'fastify';
import { IId } from '../shared/types/gateway.types.js';
import { routesConfigAuth, rateLimitConfigHigh } from '../config/routes.config.js';
import { getElo, getLeaderboard } from '../controllers/elo.controller.js';
import { getEloSchema, getLeaderboardSchema } from '../schemas/elo.schemas.js';

export default async function eloRoutes(fastify: FastifyInstance) {

  fastify.get<{ Params: IId }>(
    '/game/elo/:id',
    {
      schema: {
        ...getEloSchema,
        tags: ['elos'],
      },
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigHigh,
      },
    },
    getElo
  );

  fastify.get(
    '/game/leaderboard',
    {
      schema: {
        ...getLeaderboardSchema,
        tags: ['elos'],
      },
      config: {
        rateLimit: rateLimitConfigHigh,
      },
    },
    getLeaderboard
  );
}
