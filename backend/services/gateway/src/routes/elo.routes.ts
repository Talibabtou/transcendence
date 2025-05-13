import { FastifyInstance } from 'fastify';
import { IId } from '../shared/types/gateway.types.js';
import { GetElosQuery } from '../shared/types/elo.type.js';
import { getElo, getElos, getLeaderboard } from '../controllers/elo.controller.js';
import { getEloSchema, getElosSchema, getLeaderboardSchema } from '../schemas/elo.schemas.js';

const auth = { auth: true, roles: ['user', 'admin'] };

export default async function eloRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: GetElosQuery }>(
    '/game/elos',
    {
      schema: {
        ...getElosSchema,
        tags: ['elos'],
      },
      config: auth,
    },
    getElos
  );

  fastify.get<{ Params: IId }>(
    '/game/elo/:id',
    {
      schema: {
        ...getEloSchema,
        tags: ['elos'],
      },
      config: auth,
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
    },
    getLeaderboard
  );
}
