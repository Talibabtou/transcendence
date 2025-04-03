import { startTelemetry } from './telemetry/telemetry.js'
import fastify from 'fastify'
import databaseConnector from './database/database.js'
import apiRoutes from './routes/index.js'
import systemRoutes from './routes/system.routes.js'
import fastifyHelmet from '@fastify/helmet'
import fastifyCors from '@fastify/cors'
import fastifyRateLimit from '@fastify/rate-limit'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import dotenv from 'dotenv'
import { API_PREFIX } from '../../../shared/constants/path.const.js'

dotenv.config()

// Start the telemetry before any server operations
await startTelemetry() // Ensure telemetry is initialized

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
	max: 2000,
	timeWindow: '1 minute'
})

// Register Swagger plugins
await server.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'Game Service API',
      description: 'API documentation for the Game microservice',
      version: '1.0.0'
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 8082}${API_PREFIX}`,
        description: 'Local development server'
      }
    ],
    tags: [
      { name: 'matches', description: 'Match management endpoints' },
      { name: 'goals', description: 'Goal tracking endpoints' },
      { name: 'system', description: 'System and health check endpoints' }
    ]
  }
})

await server.register(fastifySwaggerUi, {
  routePrefix: '/documentation',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true
  },
  staticCSP: true
})

// Register plugins
await server.register(databaseConnector)

// Register API routes
// When you call server.register(routes, { prefix: '/api' }), 
// you're telling Fastify to use the routes defined in your 
// routes/index.js file and prefix all those routes with /api.
await server.register(apiRoutes, { prefix: API_PREFIX })

await server.register(systemRoutes)

// Start the server
const start = async () => {
	try {
		const port = process.env.PORT || 8082
		const metricsPort = process.env.OTEL_EXPORTER_PROMETHEUS_PORT || 9464 // Ensure this doesn't clash if running on same host
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
		console.log(`Prometheus metrics exporter available at http://localhost:${metricsPort}/metrics`) // Log metrics endpoint
	} catch (err) {
		server.log.error(err)
		process.exit(1)
	}
}

start()