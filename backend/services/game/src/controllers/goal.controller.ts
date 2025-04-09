import { FastifyRequest, FastifyReply } from 'fastify'
import { ErrorCodes, createErrorResponse } from '../../../../shared/constants/error.const.js'
import { Match } from '@shared/types/match.type.js'
import { recordFastDatabaseMetrics, recordMediumDatabaseMetrics, recordSlowDatabaseMetrics, goalDurationHistogram } from '../telemetry/metrics.js'

import { 
  Goal, 
	FastestGoal,
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
  
  request.log.info({
    msg: 'Creating goal',
    data: { match_id, player, duration }
  });
  
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
    
    // Verify player is part of the match
    if (match.player_1 !== player && match.player_2 !== player) {
      const errorResponse = createErrorResponse(400, ErrorCodes.PLAYER_NOT_IN_MATCH)
      return reply.code(400).send(errorResponse)
    }
    
    request.log.info({
      msg: 'Match and player verified, inserting goal',
      match_id: match_id
    });
    
    // Use db.get() with RETURNING * to get the inserted record directly
    const insertStartTime = performance.now(); // Timer for INSERT
    const newGoal = await request.server.db.get(
      'INSERT INTO goal (match_id, player, duration) VALUES (?, ?, ?) RETURNING *',
      match_id, player, duration || null
    ) as Goal
    recordMediumDatabaseMetrics('INSERT', 'goal', (performance.now() - insertStartTime)); // Record INSERT
    
    request.log.info({
      msg: 'Goal created successfully',
      goal_id: newGoal?.id
    });
    
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

export async function fastestGoal(request: FastifyRequest<{
  Params: { player_id: string }
}>, reply: FastifyReply): Promise<void> {
  const { player_id } = request.params
  try {
    const startTime = performance.now(); // Start timer
    const goal = await request.server.db.get('SELECT duration FROM goal WHERE player = ? ORDER BY duration ASC LIMIT 1', [player_id]) as FastestGoal | null
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