import { FastifyRequest, FastifyReply } from 'fastify'
import { ErrorCodes, createErrorResponse } from '../../../../shared/constants/error.const.js'
import { recordMediumDatabaseMetrics, eloHistogram } from '../telemetry/metrics.js'

import { 
  Elo,
  GetElosQuery,
	DailyElo
} from '@shared/types/elo.type.js'


// Get a single elo by ID
export async function getElo(request: FastifyRequest<{
  Params: { id: string }
}>, reply: FastifyReply): Promise<void> {
  const { id: player_id } = request.params
	try {
    const startTime = performance.now(); // Start timer
		const elo = await request.server.db.get('SELECT * FROM elo INDEXED BY idx_elo_player_created_at WHERE player = ? ORDER BY created_at DESC LIMIT 1', [player_id]) as Elo | null
    recordMediumDatabaseMetrics('SELECT', 'elo', (performance.now() - startTime)); // Record metric
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

    const startTime = performance.now(); // Start timer
		const elos = await request.server.db.all(query, ...params) as Elo[]
    recordMediumDatabaseMetrics('SELECT', 'elo', (performance.now() - startTime)); // Record metric
		return reply.code(200).send(elos)
		
	} catch (error) {
		const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
		return reply.code(500).send(errorResponse)
	}
}


export async function dailyElo(request: FastifyRequest<{
  Params: { player: string }
}>, reply: FastifyReply): Promise<void> {
	const { player } = request.params
	try {
    const startTime = performance.now(); // Start timer
		const dailyElo = await request.server.db.get(
			'SELECT player, match_date, elo FROM player_daily_elo WHERE player = ?',
			[player]
		) as DailyElo[]
    recordMediumDatabaseMetrics('SELECT', 'player_daily_elo', (performance.now() - startTime)); // Record metric
		return reply.code(200).send(dailyElo)
	} catch (error) {
		const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
		return reply.code(500).send(errorResponse)
	}
}
