import { getMeter } from './telemetry.js';

// Get the meter instance once and export it
export const meter = getMeter();

// Create base metrics used across all controllers
export const httpRequestDurationHistogram = meter.createHistogram('http_request_duration_seconds', {
  description: 'Duration of HTTP requests in seconds',
});

export const httpRequestCounter = meter.createCounter('http_requests_total', {
  description: 'Total number of HTTP requests',
});

export const databaseQueryDurationHistogram = meter.createHistogram('database_query_duration_seconds', {
  description: 'Duration of database queries in seconds',
});

export const errorCounter = meter.createCounter('errors_total', {
  description: 'Total number of errors',
});