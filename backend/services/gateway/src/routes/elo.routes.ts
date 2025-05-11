import { FastifyInstance } from 'fastify';
import { getElo, getElos, createElo, getLeaderboard } from '../controllers/elo.controller.js';
import {
  getEloSchema,
  getElosSchema,
  createEloSchema,
  getLeaderboardSchema,
} from '../schemas/elo.schemas.js';
import { IId } from '../shared/types/gateway.types.js';
import { GetElosQuery } from '../shared/types/elo.type.js';

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

  fastify.post(
    '/game/elo',
    {
      schema: {
        ...createEloSchema,
        tags: ['elos'],
      },
      config: auth,
    },
    createElo
  );
}
