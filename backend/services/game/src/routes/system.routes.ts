import { FastifyInstance } from 'fastify'
import { trace, SpanStatusCode } from '@opentelemetry/api'
import { HEALTH_CHECK_PATH } from '../../../../shared/constants/path.const.js'
import { ErrorExamples } from '../../../../shared/constants/error.const.js'
import { errorResponseSchema } from '../../../../shared/schemas/error.schema.js'

export default async function systemRoutes(server: FastifyInstance) {
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

      // Ensure db is available on the request.server decorator
      // This assumes the databaseConnector plugin adds `db` to the server instance
      if (!request.server.db) {
         throw new Error('Database connection not available');
      }
      await request.server.db.get('SELECT 1')
      span.setStatus({ code: SpanStatusCode.OK })

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'game',
        version: process.env.SERVICE_VERSION || '1.0.0'
      }
    } catch (error) {
       server.log.error('Health check failed:', error)
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error during health check'
      })
      // Throwing the error here will let the Fastify error handler manage the 5xx response
      // If you need a specific 503 response structure defined in schema, handle it here.
      // Example: reply.code(503).send(createErrorResponse(ErrorCodes.serviceUnavailable, 'Database check failed'))
      throw error // Re-throw for Fastify's default error handling or a custom error handler
    } finally {
      span.end()
    }
  })
} 