import { FastifyInstance } from 'fastify'
import matchRoutes from './match.routes.js'
import goalRoutes from './goal.routes.js'
import eloRoutes from './elo.routes.js'

export default async function routes(fastify: FastifyInstance) {
  // Register routes with their base paths
  fastify.register(matchRoutes, { prefix: '/matches' })
  fastify.register(goalRoutes, { prefix: '/goals' })
	fastify.register(eloRoutes, { prefix: '/elos' })
}
