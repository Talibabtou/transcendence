import { meter } from './base-metrics.js';

// Match-specific metrics
export const matchCreationCounter = meter.createCounter('match_creation_total', {
  description: 'Total number of matches created',
});

export const matchCompletionCounter = meter.createCounter('match_completion_total', {
  description: 'Total number of matches completed',
});

export const matchDurationHistogram = meter.createHistogram('match_duration_seconds', {
  description: 'Duration of matches in seconds',
});

export const matchQueriesCounter = meter.createCounter('match_queries_total', {
  description: 'Total number of match queries',
});