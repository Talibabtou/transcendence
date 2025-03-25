import { FastifyRequest, FastifyReply } from 'fastify'
import { ErrorCodes, createErrorResponse } from '../../../../shared/constants/error.const.js'
import { Match } from '@shared/types/match.type.js'

import { 
  Elo,
  CreateEloRequest, 
  GetElosQuery,
	DailyElo
} from '@shared/types/elo.type.js'


// Get a single elo by ID
export async function getElo(request: FastifyRequest<{
  Params: { id: string }
}>, reply: FastifyReply): Promise<void> {
  const { id } = request.params
	try {
		const elo = await request.server.db.get('SELECT * FROM elo WHERE player = ? ORDER BY created_at DESC LIMIT 1', [id]) as Elo | null
		if (!elo) {
			const errorResponse = createErrorResponse(404, ErrorCodes.PLAYER_NOT_FOUND)
			return reply.code(404).send(errorResponse)
		}
		return reply.code(200).send(elo)
	} catch (error) {
		const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
		return reply.code(500).send(errorResponse)
	}
}

// Get all elos
export async function getElos(request: FastifyRequest<{
  Querystring: GetElosQuery
}>, reply: FastifyReply): Promise<void> {
	const { player, limit = 10, offset = 0 } = request.query
	try {
		let query = 'SELECT * FROM elo WHERE 1=1'
		const params = []

		if (player !== undefined) {
			query += ' AND player = ?'
			params.push(player)
		}
		
		query += ' ORDER BY created_at ASC LIMIT ? OFFSET ?'
		params.push(limit, offset)

		const elos = await request.server.db.all(query, ...params) as Elo[]
		return reply.code(200).send(elos)
		
	} catch (error) {
		const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
		return reply.code(500).send(errorResponse)
	}
}

// Create a new elo
export async function createElo(request: FastifyRequest<{
  Body: CreateEloRequest
}>, reply: FastifyReply): Promise<void> {
  const { player, elo } = request.body
  
  request.log.info({
    msg: 'Creating elo entry',
    data: { player, elo }
  });
  
  try {
    const newElo = await request.server.db.get(
      'INSERT INTO elo (player, elo) VALUES (?, ?) RETURNING *',
      player, elo
    ) as Elo
    
    request.log.info({
      msg: 'Elo entry created successfully',
      id: newElo?.id
    });
    
    return reply.code(201).send(newElo)
  } catch (error) {
    request.log.error({
      msg: 'Error in createElo',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error
    });
    
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
    return reply.code(500).send(errorResponse)
  }
}

export async function dailyElo(request: FastifyRequest<{
  Params: { player: string }
}>, reply: FastifyReply): Promise<void> {
	const { player } = request.params
	try {
		const dailyElo = await request.server.db.get(
			'SELECT player, match_date, elo FROM player_daily_elo WHERE player = ?',
			[player]
		) as DailyElo[]
		return reply.code(200).send(dailyElo)
	} catch (error) {
		const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
		return reply.code(500).send(errorResponse)
	}
}
