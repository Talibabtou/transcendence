import { startTelemetry } from './telemetry/telemetry.js'
await startTelemetry() // Start telemetry collection

import fastify from 'fastify'
import databaseConnector from './database/database.js'
import routes from './routes/index.js'
import fastifyHelmet from '@fastify/helmet'
import fastifyCors from '@fastify/cors'
import fastifyRateLimit from '@fastify/rate-limit'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import dotenv from 'dotenv'
import { API_PREFIX, HEALTH_CHECK_PATH } from '../../../shared/constants/path.const.js'
import { createErrorResponse, ErrorCodes, ErrorExamples } from '../../../shared/constants/error.const.js'
import { errorResponseSchema } from '../../../shared/schemas/error.schema.js'
import { metrics, trace, SpanStatusCode } from '@opentelemetry/api' // Import the metrics API and trace API
import { telemetryMiddleware } from './middleware/telemetry.middleware.js'

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
await server.register(routes, { prefix: API_PREFIX })

// Get a meter instance (adjust 'game-service-meter' as needed)
const meter = metrics.getMeter('game-service-meter')

// Create a counter metric for health checks
const healthCheckCounter = meter.createCounter('health_checks_total', {
  description: 'Total number of health checks performed'
})

// Health check route
server.get(HEALTH_CHECK_PATH, {
  schema: {
    tags: ['system'],
    description: 'Health check endpoint',
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          timestamp: { type: 'string' },
          service: { type: 'string' },
          version: { type: 'string' }
        }
      },
			503: {
				...errorResponseSchema,
				example: ErrorExamples.serviceUnavailable
			}
    }
  }
}, async (request, reply) => {
  const span = trace.getTracer('game-service').startSpan('health-check')
  
  try {
    healthCheckCounter.add(1, { 'service.status': 'attempt' })
    span.addEvent('Starting health check')
    
    await request.server.db.get('SELECT 1')
    span.setStatus({ code: SpanStatusCode.OK })
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'game',
      version: process.env.SERVICE_VERSION || '1.0.0'
    }
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  } finally {
    span.end()
  }
})

// Add Prometheus metrics endpoint
// The Prometheus exporter typically exposes metrics on /metrics by default
// You might need to explicitly create the route depending on the exporter version and Fastify
// Check the exporter documentation if /metrics doesn't work automatically
server.get('/metrics', async (request, reply) => {
  // This route might be automatically handled by the PrometheusExporter depending on version.
  // If not automatically handled, you would need to manually retrieve metrics
  // from the meterProvider's metricReader and format them.
  // For now, assume the exporter handles it. Add a placeholder if needed.
  // Example placeholder if manual retrieval is needed:
  // const metrics = await prometheusExporter.getMetricsRequestHandler(request.raw, reply.raw);
  // reply.type('text/plain').send(metrics);
  // For simplicity, let's assume the exporter handles this route implicitly for now.
  // If you get 404 on /metrics, you'll need to implement manual retrieval.
  return reply.code(200).send('Metrics endpoint - Check Prometheus Exporter configuration if no metrics show.')
})

// Add global middleware for metrics
server.addHook('onRequest', telemetryMiddleware)

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