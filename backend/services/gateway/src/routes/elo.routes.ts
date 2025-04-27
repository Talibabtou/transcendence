import { FastifyInstance } from 'fastify';
import { getElo, getElos, createElo, getLeaderboard } from '../controllers/elo.controller.js';
import { getEloSchema, getElosSchema, createEloSchema } from '../schemas/elo.schemas.js';
import { IId } from '../shared/types/api.types.js';
import { GetElosQuery } from '../shared/types/elo.type.js';

const auth = { auth: true, roles: ['user', 'admin'] };

export default async function eloRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: GetElosQuery }>(
    '/elos',
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
    '/elo/:id',
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
    '/leaderboard',
    {
      schema: {
        tags: ['elos'],
      },
      config: auth,
    },
    getLeaderboard
  );

  fastify.post(
    '/elo',
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
