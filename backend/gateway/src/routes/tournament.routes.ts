import {
  getTournamentSchema,
  getFinalMatchesSchema,
} from '../schemas/tournament.schema.js';
import { FastifyInstance } from 'fastify';
import { IId} from '../shared/types/match.type.js';
import { rateLimitConfigHigh, routesConfigAuth } from '../config/routes.config.js';
import { getTournament, getFinalMatches } from '../controllers/tournament.controller.js';

export default async function tournamentRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Params: IId }>(
    '/game/tournament/:id',
    {
      schema: {
        ...getTournamentSchema,
        tags: ['tournaments'],
      },
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigHigh,
      },
    },
    getTournament
  );
  fastify.get<{ Params: IId }>(
    '/game/tournament/:id/final',
    {
      schema: {
        ...getFinalMatchesSchema,
        tags: ['tournaments'],
      },
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigHigh,
      },
    },
    getFinalMatches
  );
}
