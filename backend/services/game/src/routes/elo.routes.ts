import { FastifyInstance } from 'fastify'
import { 
  getElo, 
  getElos,
	createElo,
	getLeaderboard
} from '../controllers/elo.controller.js'

export default async function eloRoutes(fastify: FastifyInstance) {
  fastify.get('/elo/',
  getElos)

	fastify.post('/elo/',
  createElo)

  fastify.get('/elo/:id',
  getElo)

	fastify.get('/elo/leaderboard',
  getLeaderboard)
}



