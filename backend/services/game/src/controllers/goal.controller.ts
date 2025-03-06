import { FastifyRequest, FastifyReply } from 'fastify'
import { ErrorCodes, createErrorResponse } from '../../../../shared/constants/error.const.js'
import { Match } from '@shared/types/match.type.js'

import { 
  Goal, 
  CreateGoalRequest, 
  GetGoalsQuery 
} from '@shared/types/goal.type.js'


// Get a single goal by ID
export async function getGoal(request: FastifyRequest<{
  Params: { id: string }
}>, reply: FastifyReply): Promise<void> {
  const { id } = request.params
  try {
    const goal = await request.server.db.get('SELECT * FROM goal WHERE id = ?', [id]) as Goal | null
    if (!goal) {
      const errorResponse = createErrorResponse(404, ErrorCodes.GOAL_NOT_FOUND)
      return reply.code(404).send(errorResponse)
    }
    return reply.send(goal)
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
    
    const goals = await request.server.db.all(query, ...params) as Goal[] | null
    if (!goals) {
      const errorResponse = createErrorResponse(404, ErrorCodes.GOAL_NOT_FOUND)
      return reply.code(404).send(errorResponse)
    }
    return reply.send(goals)
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
    // Use a transaction to ensure data consistency
    await request.server.db.exec('BEGIN TRANSACTION')
    
    // Verify the match exists
    const match = await request.server.db.get('SELECT * FROM matches WHERE id = ?', match_id) as Match | null
    if (!match) {
      await request.server.db.exec('ROLLBACK')
      const errorResponse = createErrorResponse(404, ErrorCodes.MATCH_NOT_FOUND)
      return reply.code(404).send(errorResponse)
    }
    
    // Verify player is part of the match
    if (match.player_1 !== player && match.player_2 !== player) {
      await request.server.db.exec('ROLLBACK')
      const errorResponse = createErrorResponse(400, ErrorCodes.PLAYER_NOT_IN_MATCH)
      return reply.code(400).send(errorResponse)
      
    }
    
    // Use db.get() with RETURNING * to get the inserted record directly
    const newGoal = await request.server.db.get(
      'INSERT INTO goal (match_id, player, duration) VALUES (?, ?, ?) RETURNING *',
      match_id, player, duration || null
    ) as Goal
    
    await request.server.db.exec('COMMIT')
    
    // Return the goal directly instead of using reply.send()
    return reply.send(newGoal)
  } catch (error) {
    // Rollback transaction on error
    await request.server.db.exec('ROLLBACK')
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
    return reply.code(500).send(errorResponse)
  }
}