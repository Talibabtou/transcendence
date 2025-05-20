import { metrics, Counter, Histogram } from '@opentelemetry/api';

export let matchCreationCounter: Counter;
export let matchDurationHistogram: Histogram;
export let fastQueryDurationHistogram: Histogram;
export let mediumQueryDurationHistogram: Histogram;
export let slowQueryDurationHistogram: Histogram;
export let matchTournamentCounter: Counter;

export let goalDurationHistogram: Histogram;
export let eloHistogram: Histogram;
/**
 * Initializes all custom application metrics.
 * This function should be called *after* the OpenTelemetry SDK has started.
 */
export function initializeMetrics() {
  const meter = metrics.getMeter('game-service'); // Get the meter *after* SDK start

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

  // Match-specific metrics
  matchCreationCounter = meter.createCounter('match_creation_total', {
    description: 'Total number of matches created',
  });
  matchTournamentCounter = meter.createCounter('match_tournament_total', {
    description: 'Total number of matches in a tournament',
  });
  matchDurationHistogram = meter.createHistogram('match_duration_seconds', {
    description: 'Duration of matches in seconds',
  });

  goalDurationHistogram = meter.createHistogram('goal_duration_seconds', {
    description: 'Duration of goals in seconds',
    advice: {
      explicitBucketBoundaries: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    },
  });
  //Elo-specific metrics
  //diff match update / elo creation
  eloHistogram = meter.createHistogram('elo_creation', {
    description: 'Elo creations for a specific match ID',
    advice: {
      explicitBucketBoundaries: [
        500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250, 1300, 1350,
        1400, 1450, 1500,
      ],
    },
  });
}

// Optional: Export the meter getter if needed elsewhere,
// but generally import specific metrics where needed.
export function getMeter(name = 'game-service') {
  return metrics.getMeter(name);
}

export function recordFastDatabaseMetrics(operation: string, table: string, duration: number) {
  console.log({ message: 'start metrics' });
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
