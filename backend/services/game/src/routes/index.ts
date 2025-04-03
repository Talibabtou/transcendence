import { FastifyInstance } from 'fastify'
import matchRoutes from './match.routes.js'
import goalRoutes from './goal.routes.js'

export default async function routes(server: FastifyInstance) {
	// Register feature-specific routes
	await server.register(matchRoutes, { prefix: '/matches' })
	await server.register(goalRoutes, { prefix: '/goals' })
}
