import { FastifyRequest, FastifyReply } from 'fastify'

// Get a single goal by ID
export async function getGoal(request: FastifyRequest<{
  Params: { id: number }
}>, reply: FastifyReply) {
  const { id } = request.params
  
  try {
    const goal = await request.server.db.get('SELECT * FROM goal WHERE id = ?', id)
    
    if (!goal) {
      return reply.code(404).send({ error: 'Goal not found' })
    }
    
    return goal
  } catch (error) {
    request.log.error(error)
    return reply.code(500).send({ error: 'Internal Server Error' })
  }
}

// Get multiple goals with optional filters
export async function getGoals(request: FastifyRequest<{
  Querystring: { match_id?: number, player?: number, limit?: number, offset?: number }
}>, reply: FastifyReply) {
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
    
    const goals = await request.server.db.all(query, ...params)
    return goals
  } catch (error) {
    request.log.error(error)
    return reply.code(500).send({ error: 'Internal Server Error' })
  }
}

// Create a new goal
export async function createGoal(request: FastifyRequest<{
  Body: { match_id: number, player: number, duration?: string }
}>, reply: FastifyReply) {
  const { match_id, player, duration } = request.body
  
  try {
    // Verify the match exists
    const match = await request.server.db.get('SELECT * FROM matches WHERE id = ?', match_id)
    if (!match) {
      return reply.code(404).send({ error: 'Match not found' })
    }
    
    // Verify player is part of the match
    if (match.player_1 !== player && match.player_2 !== player) {
      return reply.code(400).send({ error: 'Player is not part of this match' })
    }
    
    const result = await request.server.db.run(
      'INSERT INTO goal (match_id, player, duration) VALUES (?, ?, ?)',
      match_id, player, duration || null
    )
    
    const newGoal = await request.server.db.get('SELECT * FROM goal WHERE id = ?', result.lastID)
    return reply.code(201).send(newGoal)
  } catch (error) {
    request.log.error(error)
    return reply.code(500).send({ error: 'Internal Server Error' })
  }
}
