import { FastifyInstance } from 'fastify'
import { 
  getElo, 
  getElos, 
  createElo
} from '../controllers/elo.controller.js'

import { 
  getEloSchema, 
  getElosSchema, 
  createEloSchema 
} from '../schemas/elo.schema.js'

export default async function goalRoutes(fastify: FastifyInstance) {
  // Get all goals with optional filters
  fastify.get('/', { 
    schema: {
      ...getElosSchema,
      tags: ['elos']
    }
  }, getElos)
  
  // Get a specific goal by ID
  fastify.get('/:id', { 
    schema: {
      ...getEloSchema,
      tags: ['elos']
    }
  }, getElo)
  
  // Create a new goal
  fastify.post('/', { 
    schema: {
      ...createEloSchema,
      tags: ['elos']
    }
  }, createElo)
}
