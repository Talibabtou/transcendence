import { FastifyRequest, FastifyReply } from 'fastify'
import { ErrorCodes, createErrorResponse } from '../../../../shared/constants/error.const.js'

import { 
  Match, 
  CreateMatchRequest, 
  UpdateMatchRequest, 
  GetMatchesQuery 
} from '@shared/types/match.type.js'

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
    return reply.send(match)
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
    const matches = await request.server.db.all(query, ...params) as Match[]
    return reply.send(matches)
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
  try {
		// Use a transaction to ensure data consistency
    await request.server.db.exec('BEGIN TRANSACTION')
    
    // Use db.get() with RETURNING * to properly get the inserted record
    const newMatch = await request.server.db.get(
      'INSERT INTO matches (player_1, player_2, tournament_id) VALUES (?, ?, ?) RETURNING *',
      [player_1, player_2, tournament_id || null]
    ) as Match
    
    await request.server.db.exec('COMMIT')
    
    // Return the match directly instead of using reply.send()
    return reply.send(newMatch)
  } catch (error) {
    // Rollback transaction on error
    await request.server.db.exec('ROLLBACK')
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
  try {
    // Use a transaction to ensure data consistency
    await request.server.db.exec('BEGIN TRANSACTION')
    
    // Check if match exists
    const match = await request.server.db.get('SELECT * FROM matches WHERE id = ?', [id]) as Match | null
    if (!match) {
      await request.server.db.exec('ROLLBACK')
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
      await request.server.db.exec('ROLLBACK')
      const errorResponse = createErrorResponse(400, ErrorCodes.NO_VALID_FIELDS_TO_UPDATE)
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
      await request.server.db.exec('ROLLBACK')
      const errorResponse = createErrorResponse(404, ErrorCodes.MATCH_NOT_FOUND)
      return reply.code(404).send(errorResponse)
    }
    
    await request.server.db.exec('COMMIT')
    return reply.send(updatedMatch)
  } catch (error) {
    // Rollback transaction on error
    await request.server.db.exec('ROLLBACK')
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
    return reply.code(500).send(errorResponse)
  }
}