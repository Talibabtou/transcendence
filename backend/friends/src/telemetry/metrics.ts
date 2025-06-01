import { metrics, Counter, Histogram } from '@opentelemetry/api';

export let fastQueryDurationHistogram: Histogram;
export let mediumQueryDurationHistogram: Histogram;
export let slowQueryDurationHistogram: Histogram;
export let friendsRequestCreationCounter: Counter;

/**
 * Initializes all custom application metrics.
 * This function should be called *after* the OpenTelemetry SDK has started.
 */
export function initializeMetrics() {
  const meter = metrics.getMeter('friends-service');

  fastQueryDurationHistogram = meter.createHistogram('fast_query_duration', {
    description: 'Duration of fast queries in ms',
    advice: {
      explicitBucketBoundaries: [
        0, 0.005, 0.01, 0.015, 0.02, 0.025, 0.03, 0.035, 0.04, 0.045, 0.05, 0.055, 0.06, 0.065, 0.07, 0.075,
        0.08, 0.085, 0.09, 0.095, 0.1,
      ],
    },
  });
  mediumQueryDurationHistogram = meter.createHistogram('medium_query_duration', {
    description: 'Duration of medium queries in ms',
    advice: {
      explicitBucketBoundaries: [
        0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2, 2.1,
        2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3,
      ],
    },
  });
  slowQueryDurationHistogram = meter.createHistogram('slow_query_duration', {
    description: 'Duration of slow queries in ms',
    advice: {
      explicitBucketBoundaries: [
        1.3, 1.6, 1.9, 2.2, 2.5, 2.8, 3.1, 3.4, 3.7, 4, 4.3, 4.6, 4.9, 5.2, 5.5, 5.8, 6.1, 6.4, 6.7, 7, 7.3,
        7.6, 7.9, 8.2, 8.5, 8.8, 9.1, 9.4, 9.7, 10,
      ],
    },
  });

	friendsRequestCreationCounter = meter.createCounter('friends_request_total', {
		description: 'Total number of friends requests',
	});
}

export function getMeter(name = 'friends-service') {
  return metrics.getMeter(name);
}

export function recordFastDatabaseMetrics(operation: string, table: string, duration: number) {
  fastQueryDurationHistogram.record(duration, {
    operation,
    table,
  });
}

export function recordMediumDatabaseMetrics(operation: string, table: string, duration: number) {
  mediumQueryDurationHistogram.record(duration, {
    operation,
    table,
  });
}

export function recordSlowDatabaseMetrics(operation: string, table: string, duration: number) {
  slowQueryDurationHistogram.record(duration, {
    operation,
    table,
  });
}
