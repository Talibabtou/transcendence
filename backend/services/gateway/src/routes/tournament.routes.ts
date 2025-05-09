import { FastifyInstance } from 'fastify';
import { getTournament, getTournaments, getFinalMatches } from '../controllers/tournament.controller.js';
import {
  getTournamentSchema,
  getFinalMatchesSchema,
  getTournamentsSchema,
} from '../schemas/tournament.schema.js';
import { IId, GetTournamentsQuery } from '../shared/types/match.type.js';

export default async function tournamentRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Params: IId }>(
    '/game/tournament/:id',
    {
      schema: {
        ...getTournamentSchema,
        tags: ['tournaments'],
      },
    },
    getTournament
  );
  fastify.get<{ Querystring: GetTournamentsQuery }>(
    '/game/tournaments',
    {
      schema: {
        ...getTournamentsSchema,
        tags: ['tournaments'],
      },
    },
    getTournaments
  );
  fastify.get<{ Params: IId }>(
    '/game/tournament/:id/final',
    {
      schema: {
        ...getFinalMatchesSchema,
        tags: ['tournaments'],
      },
    },
    getFinalMatches
  );
}
