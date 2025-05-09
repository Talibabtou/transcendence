import { trace, SpanStatusCode } from '@opentelemetry/api';
import { HEALTH_CHECK_PATH } from '../shared/constants/path.const.js';
import { ErrorExamples } from '../shared/constants/error.const.js';
import { errorResponseSchema } from '../shared/schemas/error.schema.js';
const healthSchema = {
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
                    version: { type: 'string' },
                },
            },
            503: {
                ...errorResponseSchema,
                example: ErrorExamples.serviceUnavailable,
            },
        },
    },
};
export default async function systemRoutes(server) {
    server.get(HEALTH_CHECK_PATH, healthSchema, async (request, reply) => {
        const span = trace.getTracer('game-service').startSpan('health-check');
        try {
            if (!request.server.db) {
                throw new Error('Database connection not available');
            }
            await request.server.db.get('SELECT 1');
            span.setStatus({ code: SpanStatusCode.OK });
            return {
                status: 'ok',
                timestamp: new Date().toISOString(),
                service: 'game',
                version: process.env.SERVICE_VERSION || '1.0.0',
            };
        }
        catch (error) {
            server.log.error('Health check failed:', error);
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error instanceof Error ? error.message : 'Unknown error during health check',
            });
            throw error;
        }
        finally {
            span.end();
        }
    });
}
