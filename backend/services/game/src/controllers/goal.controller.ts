import { FastifyRequest, FastifyReply } from 'fastify'
import { ErrorCodes, createErrorResponse } from '../../../../shared/constants/error.const.js'
import { Match } from '@shared/types/match.type.js'
import { Elo } from '@shared/types/elo.type.js'
import { recordFastDatabaseMetrics, recordMediumDatabaseMetrics, goalDurationHistogram, eloHistogram } from '../telemetry/metrics.js'

import { 
  Goal, 
	LongestGoal,
  CreateGoalRequest, 
  GetGoalsQuery 
} from '@shared/types/goal.type.js'


// Get a single goal by ID
export async function getGoal(request: FastifyRequest<{
  Params: { id: string }
}>, reply: FastifyReply): Promise<void> {
  const { id } = request.params
  try {
    const startTime = performance.now(); // Start timer
    const goal = await request.server.db.get('SELECT * FROM goal WHERE id = ?', [id]) as Goal | null
    recordMediumDatabaseMetrics('SELECT', 'goal', (performance.now() - startTime)); // Record metric
    if (!goal) {
      const errorResponse = createErrorResponse(404, ErrorCodes.GOAL_NOT_FOUND)
      return reply.code(404).send(errorResponse)
    }
    return reply.code(200).send(goal)
  } catch (error) {
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
    return reply.code(500).send(errorResponse)
  }
}

// Get multiple goals with optional filters
export async function getGoals(request: FastifyRequest<{
  Querystring: GetGoalsQuery
}>, reply: FastifyReply): Promise<void> {
  const { match_id, player, limit = 10, offset = 0 } = request.query
  try {
    let query = 'SELECT * FROM goal WHERE 1=1'
    const params = []
    
    if (match_id !== undefined) {
      query += ' AND match_id = ?'
      params.push(match_id)
    }
    
    if (player !== undefined) {
      query += ' AND player = ?'
      params.push(player)
    }
    
    query += ' ORDER BY created_at ASC LIMIT ? OFFSET ?'
    params.push(limit, offset)
    
    const startTime = performance.now(); // Start timer
    const goals = await request.server.db.all(query, ...params) as Goal[]
    recordMediumDatabaseMetrics('SELECT', 'goal', (performance.now() - startTime)); // Record metric
    return reply.code(200).send(goals)
  } catch (error) {
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
    return reply.code(500).send(errorResponse)
  }
}

// Create a new goal
export async function createGoal(request: FastifyRequest<{
  Body: CreateGoalRequest
}>, reply: FastifyReply): Promise<void> {
  const { match_id, player, duration } = request.body
  try {
    // Verify the match exists
    const selectStartTime = performance.now(); // Timer for SELECT
    const match = await request.server.db.get('SELECT * FROM matches WHERE id = ?', match_id) as Match | null
    recordFastDatabaseMetrics('SELECT', 'matches', (performance.now() - selectStartTime)); // Record SELECT
    goalDurationHistogram.record(duration);
		if (!match) {
      const errorResponse = createErrorResponse(404, ErrorCodes.MATCH_NOT_FOUND)
      return reply.code(404).send(errorResponse)
    }
		if (match.active === false) {
			const errorResponse = createErrorResponse(400, ErrorCodes.MATCH_NOT_ACTIVE)
			return reply.code(400).send(errorResponse)
		}
    
    // Verify player is part of the match
    if (match.player_1 !== player && match.player_2 !== player) {
      const errorResponse = createErrorResponse(400, ErrorCodes.PLAYER_NOT_IN_MATCH)
      return reply.code(400).send(errorResponse)
    }
    
    // Use db.get() with RETURNING * to get the inserted record directly
    const insertStartTime = performance.now(); // Timer for INSERT
    const newGoal = await request.server.db.get(
      'INSERT INTO goal (match_id, player, duration) VALUES (?, ?, ?) RETURNING *',
      match_id, player, duration || null
    ) as Goal
    recordMediumDatabaseMetrics('INSERT', 'goal', (performance.now() - insertStartTime)); // Record INSERT
    
		const maxGoals = await request.server.db.get(`
			SELECT MAX(goal_count) as max_goals FROM (
				SELECT player, COUNT(*) as goal_count 
				FROM goal 
				WHERE match_id = ? 
				GROUP BY player
			)`, match_id) as number

		if (maxGoals == 3) {
			const matchDuration = new Date(Date.now() - new Date(match.created_at).getTime())
			const updateStartTime = performance.now();
			await request.server.db.run(
				`UPDATE matches SET active = false, duration = ? WHERE id = ?`,
				matchDuration, match_id
			)
			recordMediumDatabaseMetrics('UPDATE', 'matches', (performance.now() - updateStartTime));
			
			const startTime = performance.now();
			let winner: string
			let loser: string
			if (match.player_1 === player)
			{
				winner = match.player_1
				loser = match.player_2
			}
			else
			{
				winner = match.player_2
				loser = match.player_1
			}
			const eloWinner = await request.server.db.get(
				'SELECT elo FROM elo WHERE player = ?',
				winner
			) as Elo
			const eloLoser = await request.server.db.get(
				'SELECT elo FROM elo WHERE player = ?',
				loser
			) as Elo
			const newEloWinner = await request.server.db.get(
				'INSERT INTO elo (player, elo) VALUES (?, ?) RETURNING *',
				player, eloWinner.elo + 20
			) as Elo
			const newEloLoser = await request.server.db.get(
				'INSERT INTO elo (player, elo) VALUES (?, ?) RETURNING *',
				loser, eloLoser.elo - 20
			) as Elo
			recordMediumDatabaseMetrics('INSERT', 'elo', (performance.now() - startTime)); // Record metric
			eloHistogram.record(eloWinner.elo + 20);
		}
    // Return 201 Created for resource creation instead of default 200
    return reply.code(201).send(newGoal)
  } catch (error) {
    request.log.error({
      msg: 'Error in createGoal',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error
    });
    
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
    return reply.code(500).send(errorResponse)
  }
}

export async function longestGoal(request: FastifyRequest<{
  Params: { player_id: string }
}>, reply: FastifyReply): Promise<void> {
  const { player_id } = request.params
  try {
    const startTime = performance.now(); // Start timer
    const goal = await request.server.db.get('SELECT duration FROM goal WHERE player = ? ORDER BY duration DESC LIMIT 1', [player_id]) as LongestGoal | null
    recordMediumDatabaseMetrics('SELECT', 'goal', (performance.now() - startTime)); // Record metric
    if (!goal) {
      const errorResponse = createErrorResponse(404, ErrorCodes.GOAL_NOT_FOUND)
      return reply.code(404).send(errorResponse)
    }
    return reply.code(200).send(goal)
  } catch (error) {
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
    return reply.code(500).send(errorResponse)
  }
}