import { FastifyRequest, FastifyReply } from 'fastify'

import { 
  Match, 
  CreateMatchRequest, 
  UpdateMatchRequest, 
  GetMatchesQuery 
} from '@shared/types/match.type.js'

// Get a single match by ID
export async function getMatch(request: FastifyRequest<{
  Params: { id: string }
}>, reply: FastifyReply): Promise<Match | void> {
  const { id } = request.params
  try {
    // Use a transaction to ensure data consistency
    await request.server.db.exec('BEGIN TRANSACTION')
    const match = await request.server.db.get('SELECT * FROM matches WHERE id = ?', id)
    await request.server.db.exec('COMMIT')
    
    if (!match) {
      return reply.code(404).send({ error: 'Match not found' })
    }
    return match
  } catch (error) {
    // Rollback transaction on error
    await request.server.db.exec('ROLLBACK')
    request.log.error(error)
    return reply.code(500).send({ error: 'Internal Server Error' })
  }
}

// Get multiple matches with optional filters
export async function getMatches(request: FastifyRequest<{
  Querystring: GetMatchesQuery
}>, reply: FastifyReply): Promise<Match[] | void> {
  const { player_id, completed, limit = 10, offset = 0 } = request.query
  try {
    // Use a transaction to ensure data consistency
    await request.server.db.exec('BEGIN TRANSACTION')
    
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
    const matches = await request.server.db.all(query, ...params)
    
    await request.server.db.exec('COMMIT')
    return matches
  } catch (error) {
    // Rollback transaction on error
    await request.server.db.exec('ROLLBACK')
    request.log.error(error)
    return reply.code(500).send({ error: 'Internal Server Error' })
  }
}

//Create a new match
// returns a Promise<Match | void> because it performs database operations
// that are inherently asynchronous.
// Promises allow the server to handle other requests while waiting for database
export async function createMatch(request: FastifyRequest<{
  Body: CreateMatchRequest
}>, reply: FastifyReply): Promise<Match | void> {
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
      player_1, player_2, tournament_id || null
    )
    
    await request.server.db.exec('COMMIT')
    
    // Return the complete match object
    return reply.code(201).send(newMatch)
  } catch (error) {
    // Rollback transaction on error
    await request.server.db.exec('ROLLBACK')
    request.log.error(error)
    return reply.code(500).send({ error: 'Internal Server Error' })
  }
}

// Update a match
export async function updateMatch(request: FastifyRequest<{
  Params: { id: string },
  Body: UpdateMatchRequest
}>, reply: FastifyReply): Promise<Match | void> {
  const { id } = request.params
  const { completed, duration, timeout } = request.body
  try {
    // Use a transaction to ensure data consistency
    await request.server.db.exec('BEGIN TRANSACTION')
    
    // Check if match exists
    const match = await request.server.db.get('SELECT * FROM matches WHERE id = ?', id)
    if (!match) {
      await request.server.db.exec('ROLLBACK')
      return reply.code(404).send({ error: 'Match not found' })
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
      return reply.code(400).send({ error: 'No valid fields to update' })
    }
    
    // Add id to params
    params.push(id)
    await request.server.db.run(
      `UPDATE matches SET ${updates.join(', ')} WHERE id = ?`,
      ...params
    )
    const updatedMatch = await request.server.db.get('SELECT * FROM matches WHERE id = ?', id)
    
    await request.server.db.exec('COMMIT')
    return updatedMatch
  } catch (error) {
    // Rollback transaction on error
    await request.server.db.exec('ROLLBACK')
    request.log.error(error)
    return reply.code(500).send({ error: 'Internal Server Error' })
  }
}