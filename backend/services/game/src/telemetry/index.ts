// Re-export everything from the base metrics
export * from './base-metrics.js';

// Re-export service-specific metrics
export * from './match-metrics.js';

// Import the metrics explicitly
import { httpRequestCounter, httpRequestDurationHistogram, databaseQueryDurationHistogram } from './base-metrics.js';

// Export any shared utility functions for telemetry
export function recordHttpMetrics(route: string, method: string, statusCode: number, duration: number) {
  httpRequestCounter.add(1, {
    route,
    method,
    status_code: statusCode.toString()
  });
  console.log('Recorded HTTP metrics:', { route, method, statusCode, duration });
  httpRequestDurationHistogram.record(duration, {
    route,
    method,
    status_code: statusCode.toString()
  });
}

export function recordDatabaseMetrics(operation: string, table: string, duration: number) {
  databaseQueryDurationHistogram.record(duration, {
    operation,
    table
  });
} 