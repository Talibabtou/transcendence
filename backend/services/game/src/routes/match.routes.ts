import { FastifyInstance } from 'fastify'
import { 
  getMatch, 
  getMatches, 
  createMatch, 
  updateMatch 
} from '../controllers/match.controller.js'
import { 
  getMatchSchema, 
  getMatchesSchema, 
  createMatchSchema, 
  updateMatchSchema 
} from '../schemas/match.schema.js'

export default async function matchRoutes(fastify: FastifyInstance) {
  // Get all matches with optional filters
  fastify.get('/', { 
    schema: {
      ...getMatchesSchema,
      tags: ['matches']
    }
  }, getMatches)
  
  // Get a specific match by ID
  fastify.get('/:id', { 
    schema: {
      ...getMatchSchema,
      tags: ['matches']
    }
  }, getMatch)
  
  // Create a new match
  fastify.post('/', { 
    schema: {
      ...createMatchSchema,
      tags: ['matches']
    }
  }, createMatch)
  
  // Update an existing match
  fastify.put('/:id', { 
    schema: {
      ...updateMatchSchema,
      tags: ['matches']
    }
  }, updateMatch)
}
