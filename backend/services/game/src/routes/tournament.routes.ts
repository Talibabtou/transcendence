import { FastifyInstance } from 'fastify'
import { getTournament, getTournaments, getFinalMatches } from '../controllers/tournament.controller.js'
import { getTournamentSchema, getFinalMatchesSchema } from '../../../../shared/schemas/tournament.schema.js'

export default async function tournamentRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/:id', { 
    schema: {
      ...getTournamentSchema,
      tags: ['tournaments']
    }
  }, getTournament)
  fastify.get('/', { 
    schema: {
      ...getTournamentSchema,
      tags: ['tournaments']
    }
  }, getTournaments)
  fastify.get('/:id/final', { 
    schema: {
      ...getFinalMatchesSchema,
      tags: ['tournaments']
    }
  }, getFinalMatches)
}