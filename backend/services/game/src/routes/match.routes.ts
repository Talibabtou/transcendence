import { FastifyInstance } from 'fastify'
import { 
  getMatch, 
  getMatches, 
  createMatch, 
  updateMatch,
	matchTimeline,
	matchStats,
	matchSummary
} from '../controllers/match.controller.js'
import { 
  getMatchSchema, 
  getMatchesSchema, 
  createMatchSchema, 
  updateMatchSchema,
	matchTimelineSchema,
	matchStatsSchema,
	matchSummarySchema
} from '../schemas/match.schema.js'

export default async function matchRoutes(fastify: FastifyInstance): Promise<void> {
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
    },
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute'
      }
    }
  }, createMatch)
  
  // Update an existing match
  fastify.put('/:id', { 
    schema: {
      ...updateMatchSchema,
      tags: ['matches']
    }
  }, updateMatch)

	fastify.get('/:id/stats', { 
    schema: {
      ...matchTimelineSchema,
      tags: ['matches']
    }
  }, matchTimeline)

	fastify.get('/stats/:player_id', { 
    schema: {
      ...matchStatsSchema,
      tags: ['matches']
    }
  }, matchStats)

	fastify.get('/summary/:player_id', { 
    schema: {
      ...matchSummarySchema,
      tags: ['matches']
    }
  }, matchSummary)
}
