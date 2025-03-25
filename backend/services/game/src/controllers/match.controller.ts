import { FastifyRequest, FastifyReply } from 'fastify'
import { ErrorCodes, createErrorResponse } from '../../../../shared/constants/error.const.js'

import { 
  Match, 
  CreateMatchRequest, 
  UpdateMatchRequest, 
  GetMatchesQuery,
	PlayerStats,
	PlayerMatchSummary,
	DailyPerformance,
	EloRating
} from '@shared/types/match.type.js'
import { MatchGoals } from '@shared/types/goal.type.js'

// Get a single match by ID
export async function getMatch(request: FastifyRequest<{
  Params: { id: string }
}>, reply: FastifyReply): Promise<void> {
  const { id } = request.params
  try {
    const match = await request.server.db.get('SELECT * FROM matches WHERE id = ?', id) as Match | null
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
  const { player_id, completed, limit = 10, offset = 0 } = request.query
  try {
    let query = 'SELECT * FROM matches WHERE 1=1'
    const params = []
    if (player_id !== undefined) {
      query += ' AND (player_1 = ? OR player_2 = ?)'
      params.push(player_id, player_id)
    }
    if (completed !== undefined) {
      query += ' AND completed = ?'
      params.push(completed)
    }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)
		//parameterized queries
    const matches = await request.server.db.all(query, params) as Match[]
    return reply.code(200).send(matches)
  } catch (error) {
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
    return reply.code(500).send(errorResponse)
  }
}

//Create a new match
// returns a Promise<void> because it performs database operations
// that are inherently asynchronous.
// Promises allow the server to handle other requests while waiting for database
export async function createMatch(request: FastifyRequest<{
  Body: CreateMatchRequest
}>, reply: FastifyReply): Promise<void> {
	//Request Body Extraction
	// destructuring to extract the required fields
	// match the CreateMatchRequest interface
  const { player_1, player_2, tournament_id } = request.body
  
  // Add debugging logs
  request.log.info({
    msg: 'Creating match',
    data: { player_1, player_2, tournament_id }
  });
  
  try {
    // Try a more direct approach without explicit transaction management
    request.log.info('Inserting match directly');
    
    const newMatch = await request.server.db.get(
      'INSERT INTO matches (player_1, player_2, tournament_id) VALUES (?, ?, ?) RETURNING *',
      [player_1, player_2, tournament_id || null]
    ) as Match
    
    request.log.info({
      msg: 'Match inserted successfully',
      match_id: newMatch?.id
    });
    
    return reply.code(201).send(newMatch)
  } catch (error) {
    request.log.error({
      msg: 'Error in createMatch',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    });
    
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
    return reply.code(500).send(errorResponse)
  }
}

// Update a match
export async function updateMatch(request: FastifyRequest<{
  Params: { id: string },
  Body: UpdateMatchRequest
}>, reply: FastifyReply): Promise<void> {
  const { id } = request.params
  const { completed, duration, timeout } = request.body
  
  request.log.info({
    msg: 'Updating match',
    match_id: id,
    updates: { completed, duration, timeout }
  });
  
  try {
    // Check if match exists without transactions
    const match = await request.server.db.get('SELECT * FROM matches WHERE id = ?', [id]) as Match | null
    if (!match) {
      const errorResponse = createErrorResponse(404, ErrorCodes.MATCH_NOT_FOUND)
      return reply.code(404).send(errorResponse) 
    }
    
    // Build update query
    let updates = []
    let params = []
    if (completed !== undefined) {
      updates.push('completed = ?')
      params.push(completed)
    }
    if (duration !== undefined) {
      updates.push('duration = ?')
      params.push(duration)
    }
    if (timeout !== undefined) {
      updates.push('timeout = ?')
      params.push(timeout)
    }
    if (updates.length === 0) {
      const errorResponse = createErrorResponse(400, ErrorCodes.INVALID_FIELDS)
      return reply.code(400).send(errorResponse)
    }
    
    // Add id to params
    params.push(id)
    
    await request.server.db.run(
      `UPDATE matches SET ${updates.join(', ')} WHERE id = ?`,
      ...params
    )
    
    const updatedMatch = await request.server.db.get('SELECT * FROM matches WHERE id = ?', [id]) as Match | null
    if (!updatedMatch) {
      const errorResponse = createErrorResponse(404, ErrorCodes.MATCH_NOT_FOUND)
      return reply.code(404).send(errorResponse)
    }
    
    return reply.code(200).send(updatedMatch)
  } catch (error) {
    request.log.error({
      msg: 'Error in updateMatch',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error
    });
    
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
    return reply.code(500).send(errorResponse)
  }
}

export async function matchTimeline(request: FastifyRequest<{
		Params: { id: string }
	}>, reply: FastifyReply): Promise<void> {
		const { id } = request.params
		try {
			const goals = await request.server.db.all('SELECT match_id, player, duration FROM goals WHERE match_id = ?', id) as MatchGoals[]
			return reply.code(200).send(goals)
		} catch (error) {
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
    // Get player match summary without transaction
    const matchSummaryResult = await request.server.db.get(
      'SELECT total_matches, completed_matches, victories, win_ratio FROM player_match_summary WHERE player_id = ?', 
      [player_id]
    ) 
    
    // Initialize default match summary if no data is returned
    const matchSummary = matchSummaryResult || {
      total_matches: 0,
      completed_matches: 0,
      victories: 0,
      win_ratio: 0
    } as PlayerMatchSummary

    // Get daily performance for line plot
    const dailyPerformance = await request.server.db.all(
      'SELECT match_date, matches_played, wins, losses, daily_win_ratio FROM player_daily_performance WHERE player_id = ? ORDER BY match_date',
      [player_id]
    ) as DailyPerformance[] || []
    
    // Get goal durations for heatmap
    const goalDurationsResult = await request.server.db.all(
      'SELECT duration FROM player_goal_durations WHERE player = ?',
      [player_id]
    ) 
    
    // Transform result into array of numbers
    const goalDurations = goalDurationsResult ? goalDurationsResult.map(row => Number(row.duration)) : []
    
    // Get match durations for histogram
    const matchDurationsResult = await request.server.db.all(
      'SELECT match_duration FROM player_match_durations WHERE player_id = ?',
      [player_id]
    ) 
    
    // Transform result into array of numbers
    const matchDurations = matchDurationsResult ? matchDurationsResult.map(row => Number(row.match_duration)) : []
    
    // Get player's daily Elo rating
    const eloRatings = await request.server.db.all(
      'SELECT match_date, elo FROM player_daily_elo_rating WHERE player_id = ? ORDER BY match_date',
      [player_id]
    ) as EloRating[] || []
    
    // Calculate goal stats with safe handling of empty arrays
    let fastestGoalDuration = null
    let averageGoalDuration = null
    
    if (goalDurations.length > 0) {
      fastestGoalDuration = Math.min(...goalDurations)
      averageGoalDuration = goalDurations.reduce((sum, duration) => sum + duration, 0) / goalDurations.length
    }
    
    // Combine all statistics into a comprehensive response
    const playerStats: PlayerStats = {
      player_id,
      summary: matchSummary,
      goal_stats: {
        fastest_goal_duration: fastestGoalDuration,
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
