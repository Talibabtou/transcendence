import { FastifyRequest, FastifyReply } from 'fastify';
import { recordHttpMetrics } from '../telemetry/index.js';
import { errorCounter } from '../telemetry/index.js';

export async function telemetryMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const startTime = performance.now();
  
  // Continue with request processing
  reply.raw.on('finish', () => {
    const duration = (performance.now() - startTime) / 1000; // Convert to seconds
    
    recordHttpMetrics(
      request.routeOptions.url || '/', 
      request.method, 
      reply.statusCode, 
      duration
    );

    if (reply.statusCode >= 400) {
      errorCounter.add(1, {
        status_code: reply.statusCode.toString(),
        route: request.routeOptions.url,
        method: request.method
      });
    }
  });
} 