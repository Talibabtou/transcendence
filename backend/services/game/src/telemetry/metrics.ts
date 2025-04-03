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
	databaseQueryDurationHistogram = meter.createHistogram('database_query_duration_seconds', {
		description: 'Duration of database queries in seconds',
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