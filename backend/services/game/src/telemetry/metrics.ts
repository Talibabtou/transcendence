import { metrics, Counter, Histogram } from '@opentelemetry/api'

export let healthCheckCounter: Counter
export let matchCreationCounter: Counter
export let matchCompletionCounter: Counter
export let matchDurationHistogram: Histogram
export let matchQueriesCounter: Counter
export let databaseQueryDurationHistogram: Histogram
export let matchUpdatesCounter: Counter
export let matchTournamentCounter: Counter

export let goalCreationCounter: Counter
export let goalDurationHistogram: Histogram
export let eloCreationCounter: Counter
/**
 * Initializes all custom application metrics.
 * This function should be called *after* the OpenTelemetry SDK has started.
 */
export function initializeMetrics() {
  const meter = metrics.getMeter('game-service') // Get the meter *after* SDK start

	// System metrics
  healthCheckCounter = meter.createCounter('health_checks_total', {
    description: 'Total number of health checks performed'
  })
	databaseQueryDurationHistogram = meter.createHistogram('database_query_duration', {
		description: 'Duration of database queries in seconds',
		advice: {
			explicitBucketBoundaries: [0, 0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.11, 0.12, 0.13, 0.14, 0.15, 0.16, 0.17, 0.18, 0.19, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2, 3, 4, 5, 6, 7, 8, 9, 10]
		}
	});

	// Match-specific metrics
	matchCreationCounter = meter.createCounter('match_creation_total', {
		description: 'Total number of matches created',
	});
	matchCompletionCounter = meter.createCounter('match_completion_total', {
		description: 'Total number of matches completed',
	});
	matchTournamentCounter = meter.createCounter('match_tournament_total', {
		description: 'Total number of matches in a tournament',
	});
	matchDurationHistogram = meter.createHistogram('match_duration_seconds', {
		description: 'Duration of matches in seconds',
	});
  matchUpdatesCounter = meter.createCounter('match_updates_total', {
    description: 'Total number of updates for a specific match ID'
  });

	// Goal-specific metrics
	// max goal per match / user
	goalCreationCounter = meter.createCounter('goal_creation_total', {
		description: 'Total number of goals created for a specific match ID',
	});
	goalDurationHistogram = meter.createHistogram('goal_duration_seconds', {
		description: 'Duration of goals in seconds',
	});

	//Elo-specific metrics
	//diff match update / elo creation
	eloCreationCounter = meter.createCounter('elo_creation_total', {
		description: 'Total number of Elo creations for a specific match ID',
	});
}

// Optional: Export the meter getter if needed elsewhere,
// but generally import specific metrics where needed.
export function getMeter(name = 'game-service') {
  return metrics.getMeter(name);
} 

export function recordDatabaseMetrics(operation: string, table: string, duration: number) {
  databaseQueryDurationHistogram.record(duration, {
    operation,
    table
  });
} 