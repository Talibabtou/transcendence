import { FastifyInstance } from 'fastify'
import matchRoutes from './match.routes.js'
import goalRoutes from './goal.routes.js'
import eloRoutes from './elo.routes.js'
import tournamentRoutes from './tournament.routes.js'
export default async function routes(server: FastifyInstance) {
	// Register feature-specific routes
	await server.register(matchRoutes, { prefix: '/matches' })
	await server.register(goalRoutes, { prefix: '/goals' })
	await server.register(eloRoutes, { prefix: '/elos' })
	await server.register(tournamentRoutes, { prefix: '/tournaments' })
}