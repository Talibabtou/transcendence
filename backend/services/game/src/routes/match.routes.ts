import { FastifyInstance } from 'fastify'
import { 
  getMatch, 
  getMatches, 
  createMatch,
	matchTimeline,
	matchStats,
	matchSummary
} from '../controllers/match.controller.js'

export default async function matchRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/match/',
  getMatches)
  
  fastify.get('/match/:id',
  getMatch)
  
  fastify.post('/match/',
  createMatch)

	fastify.get('/match/:id/stats',
  matchTimeline)

	fastify.get('/match/stats/:player_id',
  matchStats)

	fastify.get('/match/summary/:player_id',
  matchSummary)
}
