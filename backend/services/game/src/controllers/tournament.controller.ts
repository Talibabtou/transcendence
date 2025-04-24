import { FastifyRequest, FastifyReply } from 'fastify';
import {
  ErrorCodes,
  createErrorResponse,
} from '../shared/constants/error.const.js';
import { recordFastDatabaseMetrics } from '../telemetry/metrics.js';
import {
  Match,
  GetTournamentQuery,
  GetTournamentsQuery,
} from '../shared/types/match.type.js';

// Get a single matches by tournament ID
export async function getTournament(
  request: FastifyRequest<{
    Params: GetTournamentQuery;
  }>,
  reply: FastifyReply
): Promise<void> {
  const { tournament_id } = request.params;
  try {
    const startTime = performance.now();
    const tournament = (await request.server.db.get(
      'SELECT * FROM matches WHERE tournament_id = ?',
      tournament_id
    )) as Match[] | null;
    recordFastDatabaseMetrics(
      'SELECT',
      'matches',
      performance.now() - startTime
    );
    if (!tournament) {
      const errorResponse = createErrorResponse(
        404,
        ErrorCodes.TOURNAMENT_NOT_FOUND
      );
      return reply.code(404).send(errorResponse);
    }
    return reply.code(200).send(tournament);
  } catch (error) {
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorResponse);
  }
}

// Get multiple matches with optional filters
export async function getTournaments(
  request: FastifyRequest<{
    Querystring: GetTournamentsQuery;
  }>,
  reply: FastifyReply
): Promise<void> {
  const { player_id, limit = 10, offset = 0 } = request.query;
  try {
    let query = 'SELECT * FROM matches WHERE 1=1';
    const params = [];
    if (player_id !== undefined) {
      query += ' AND (player_1 = ? OR player_2 = ?)';
      params.push(player_id, player_id);
    }
    query += ' AND tournament_id IS NOT NULL AND final = TRUE';
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    //parameterized queries
    const startTime = performance.now();
    const matches = (await request.server.db.all(query, params)) as Match[];
    recordFastDatabaseMetrics(
      'SELECT',
      'matches',
      performance.now() - startTime
    );
    return reply.code(200).send(matches);
  } catch (error) {
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorResponse);
  }
}

// get final matches
export async function getFinalMatches(
  request: FastifyRequest<{
    Params: GetTournamentQuery;
  }>,
  reply: FastifyReply
): Promise<void> {
  const { tournament_id } = request.params;
  try {
    const startTime = performance.now();
    const matches = (await request.server.db.all(
      'SELECT * FROM matches WHERE tournament_id = ? AND final = TRUE',
      tournament_id
    )) as Match[];
    recordFastDatabaseMetrics(
      'SELECT',
      'matches',
      performance.now() - startTime
    );
    return reply.code(200).send(matches);
  } catch (error) {
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorResponse);
  }
}
