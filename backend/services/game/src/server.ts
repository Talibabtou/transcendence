import fastify from 'fastify'
import databaseConnector from './database/database.js'
import routes from './routes/index.js'
import fastifyHelmet from '@fastify/helmet'
import fastifyCors from '@fastify/cors'
import fastifyRateLimit from '@fastify/rate-limit'
import dotenv from 'dotenv'
import { API_PREFIX, HEALTH_CHECK_PATH } from '../../../shared/constants/path.const.js'

dotenv.config()

// Create the server instance
const server = fastify({
	logger: true
})

// Register security plugins
await server.register(fastifyHelmet)
await server.register(fastifyCors, {
	origin: process.env.NODE_ENV === 'production'
		? (process.env.ALLOWED_ORIGINS || false)
		: true  // Allow all origins in development
})
await server.register(fastifyRateLimit, {
	max: 100,
	timeWindow: '1 minute'
})

// Register plugins
await server.register(databaseConnector)

// Register API routes
// When you call server.register(routes, { prefix: '/api' }), 
// you're telling Fastify to use the routes defined in your 
// routes/index.js file and prefix all those routes with /api.
await server.register(routes, { prefix: API_PREFIX })

// Health check route
server.get(HEALTH_CHECK_PATH, async (request, reply) => {
	return { status: 'ok' }
})

// Start the server
const start = async () => {
	try {
		const port = process.env.PORT || 8082
		await server.listen({ port: Number(port), host: '0.0.0.0' })
		
		const address = server.server.address()
		if (address) {
			// Handle the case when address is an object (IP socket)
			const addressInfo = typeof address === 'string' 
				? address 
				: `${address.address}:${address.port}`
			console.log(`Server listening on ${addressInfo}`)
		} else {
			console.log(`Server started successfully`)
		}
	} catch (err) {
		server.log.error(err)
		process.exit(1)
	}
}

start()