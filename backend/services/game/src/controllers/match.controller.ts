import { FastifyRequest, FastifyReply } from 'fastify'
import { ErrorCodes, createErrorResponse } from '../../../../shared/constants/error.const.js'
import { matchCreationCounter, recordFastDatabaseMetrics, recordSlowDatabaseMetrics, recordMediumDatabaseMetrics, matchTournamentCounter} from '../telemetry/metrics.js'
import { 
  Match, 
  CreateMatchRequest, 
  GetMatchesQuery,
	PlayerStats,
	PlayerMatchSummary,
	DailyPerformance
} from '@shared/types/match.type.js'
import { MatchGoals } from '@shared/types/goal.type.js'

//check if player 1 = player 2
// Get a single match by ID
export async function getMatch(request: FastifyRequest<{
  Params: { id: string }
}>, reply: FastifyReply): Promise<void> {
  const { id } = request.params
  try {
    const startTime = performance.now();
    const match = await request.server.db.get('SELECT * FROM matches WHERE id = ?', id) as Match | null
    recordFastDatabaseMetrics('SELECT', 'matches', (performance.now() - startTime));
    if (!match) {
      const errorResponse = createErrorResponse(404, ErrorCodes.MATCH_NOT_FOUND)
      return reply.code(404).send(errorResponse)
    }
    return reply.code(200).send(match)
  } catch (error) {
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
    return reply.code(500).send(errorResponse)
  }
}

// Get multiple matches with optional filters
export async function getMatches(request: FastifyRequest<{
  Querystring: GetMatchesQuery
}>, reply: FastifyReply): Promise<void> {
  const { player_id, active, limit = 10, offset = 0 } = request.query
  try {
    let query = 'SELECT * FROM matches WHERE 1=1'
    const params = []
    if (player_id !== undefined) {
      query += ' AND (player_1 = ? OR player_2 = ?)'
      params.push(player_id, player_id)
    }
    if (active !== undefined) {
      query += ' AND active = ?'
      params.push(active)
    }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)
		//parameterized queries
    const startTime = performance.now();
    const matches = await request.server.db.all(query, params) as Match[]
    recordFastDatabaseMetrics('SELECT', 'matches', (performance.now() - startTime));
    return reply.code(200).send(matches)
  } catch (error) {
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
    return reply.code(500).send(errorResponse)
  }
}
// if tournament not more than 4 players
//avoid 7 matchs not being a final
//avoid 8 matches
export async function createMatch(request: FastifyRequest<{
  Body: CreateMatchRequest
}>, reply: FastifyReply): Promise<void> {
	//Request Body Extraction
	// destructuring to extract the required fields
	// match the CreateMatchRequest interface
  const { player_1, player_2, tournament_id } = request.body
  
  try {
    let startTime = performance.now();

    const prevMatches = await request.server.db.all('SELECT *, CAST((julianday(\'now\') - julianday(created_at)) * 24 * 60 * 60 AS INTEGER) as duration_seconds FROM matches WHERE (player_1 = ? OR player_2 = ?) AND active = TRUE', 
      [player_1, player_2]) as (Match & { duration_seconds: number })[];
		recordFastDatabaseMetrics('SELECT', 'matches', (performance.now() - startTime)); // Record metric
    // Update any old active matches (10 minutes timeout)
    if (prevMatches && prevMatches.length > 0) {
      for (const match of prevMatches) {
        // Check if duration is over 600 seconds (10 minutes)
        if (match.duration_seconds > 600) {
					startTime = performance.now(); // Start timer
          await request.server.db.run(
            `UPDATE matches SET active = FALSE, duration = NULL WHERE id = ?`,
            match.id
          );
					recordFastDatabaseMetrics('UPDATE', 'matches', (performance.now() - startTime)); // Record metric
        }
      }
    }

    // Create new match
		startTime = performance.now(); // Start timer
    const newMatch = await request.server.db.get(
      'INSERT INTO matches (player_1, player_2, tournament_id) VALUES (?, ?, ?) RETURNING *',
      [player_1, player_2, tournament_id || null]
    ) as Match;
    
    // Record metrics
    recordSlowDatabaseMetrics('INSERT', 'matches', (performance.now() - startTime));
    matchCreationCounter.add(1, { 'match.status': 'created' });
    if (tournament_id) {
      matchTournamentCounter.add(1, { 'match.tournament_id': tournament_id });
    }
    
    return reply.code(201).send(newMatch);
  } catch (error) {
    request.log.error({
      msg: 'Error in createMatch',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    });
    
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorResponse);
  }
}

export async function matchTimeline(request: FastifyRequest<{
		Params: { id: string }
	}>, reply: FastifyReply): Promise<void> {
		const { id } = request.params
		try {
      const startTime = performance.now();
			const goals = await request.server.db.all('SELECT match_id, player, duration FROM goal WHERE match_id = ?', id) as MatchGoals[]
      recordSlowDatabaseMetrics('SELECT', 'match_timeline', (performance.now() - startTime));
			return reply.code(200).send(goals)
		} catch (error) {
			const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
			return reply.code(500).send(errorResponse)
		}
	}

// New function to get match summary for a player
export async function matchSummary(request: FastifyRequest<{
  Params: { player_id: string }
}>, reply: FastifyReply): Promise<void> {
  const { player_id } = request.params
  try {
    // Get player match summary
    const startTime = performance.now();
    const matchSummaryResult = await request.server.db.get(
      'SELECT total_matches, elo, active_matches, victories, win_ratio FROM player_match_summary WHERE player_id = ?', 
      [player_id]
    ) 
    recordFastDatabaseMetrics('SELECT', 'player_match_summary', (performance.now() - startTime));
    // Initialize default match summary if no data is returned
    const matchSummary = matchSummaryResult || {
      total_matches: 0,
      active_matches: 0,
      victories: 0,
      win_ratio: 0,
      elo: 0
    } as PlayerMatchSummary

    return reply.code(200).send(matchSummary)
  } catch (error) {
    request.log.error({
      msg: 'Error in matchSummary',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error
    });
    
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
    return reply.code(500).send(errorResponse)
  }
}

// Get match statistics for a player
export async function matchStats(request: FastifyRequest<{
  Params: { player_id: string }
}>, reply: FastifyReply): Promise<void> {
  const { player_id } = request.params
  try {
    // Get daily performance for line plot
    let startTime = performance.now();
    const dailyPerformance = await request.server.db.all(
      'SELECT match_date, matches_played, wins, losses, daily_win_ratio FROM player_daily_performance WHERE player_id = ? ORDER BY match_date',
      [player_id]
    ) as DailyPerformance[] || []
    recordSlowDatabaseMetrics('SELECT', 'player_daily_performance', (performance.now() - startTime));
    
    // Get goal durations for heatmap
    startTime = performance.now();
    const goalDurationsResult = await request.server.db.all(
      'SELECT duration FROM player_goal_durations WHERE player = ?',
      [player_id]
    ) 
    recordFastDatabaseMetrics('SELECT', 'player_goal_durations', (performance.now() - startTime));
    // Transform result into array of numbers
    const goalDurations = goalDurationsResult ? goalDurationsResult.map(row => Number(row.duration)) : []
    
    // Get match durations for histogram
    startTime = performance.now();
    const matchDurationsResult = await request.server.db.all(
      'SELECT match_duration FROM player_match_durations WHERE player_id = ?',
      [player_id]
    ) 
    recordFastDatabaseMetrics('SELECT', 'player_match_durations', (performance.now() - startTime));
    // Transform result into array of numbers
    const matchDurations = matchDurationsResult ? matchDurationsResult.map(row => Number(row.match_duration)) : []
    
    // Get player's Elo rating history (all data points)
    startTime = performance.now();
    const eloRatingsResult = await request.server.db.all(
      'SELECT elo FROM elo WHERE player = ? ORDER BY created_at',
      [player_id]
    )
    recordMediumDatabaseMetrics('SELECT', 'elo', (performance.now() - startTime));
    // Transform result into array of numbers
    const eloRatings = eloRatingsResult ? eloRatingsResult.map(row => Number(row.elo)) : []
    
    // Calculate goal stats with safe handling of empty arrays
    let longestGoalDuration = null
    let averageGoalDuration = null
    
    if (goalDurations.length > 0) {
      longestGoalDuration = Math.max(...goalDurations)
      averageGoalDuration = goalDurations.reduce((sum, duration) => sum + duration, 0) / goalDurations.length
    }
    
    // Combine all statistics into a comprehensive response
    const playerStats: PlayerStats = {
      player_id,
      goal_stats: {
        fastest_goal_duration: longestGoalDuration,
        average_goal_duration: averageGoalDuration,
        total_goals: goalDurations.length
      },
      daily_performance: dailyPerformance,
      goal_durations: goalDurations,
      match_durations: matchDurations,
      elo_history: eloRatings
    }
    
    return reply.code(200).send(playerStats)
  } catch (error) {
    request.log.error({
      msg: 'Error in matchStats',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error
    });
    
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
    return reply.code(500).send(errorResponse)
  }
}
