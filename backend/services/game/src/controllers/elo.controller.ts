import { FastifyRequest, FastifyReply } from 'fastify';
import { ErrorCodes, createErrorResponse } from '../shared/constants/error.const.js';
import { ErrorResponse } from '../shared/types/error.type.js';
import { IReplyUser } from '../shared/types/auth.types.js';
import {
  recordFastDatabaseMetrics,
  recordMediumDatabaseMetrics,
  eloHistogram,
} from '../telemetry/metrics.js';
import { Database } from 'sqlite';
import { Elo, GetElosQuery, DailyElo, LeaderboardEntry } from '../shared/types/elo.type.js';
import { IId, GetPageQuery } from '../shared/types/match.type.js';

async function calculateEloChange(
  winnerElo: number,
  loserElo: number
): Promise<{ winnerElo: number; loserElo: number }> {
  const K_FACTOR = 32;

  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));

  // Calculate new ratings (winner gets score 1, loser gets score 0)
  const newWinnerElo = Math.round(winnerElo + K_FACTOR * (1 - expectedWinner));
  const newLoserElo = Math.round(loserElo + K_FACTOR * (0 - expectedLoser));

  return {
    winnerElo: newWinnerElo,
    loserElo: newLoserElo,
  };
}

// Get a single elo by ID
export async function getElo(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const { id: player_id } = request.params;
  try {
    const startTime = performance.now(); // Start timer
    const elo = (await request.server.db.get(
      'SELECT * FROM elo INDEXED BY idx_elo_player_created_at WHERE player = ? ORDER BY created_at DESC LIMIT 1',
      [player_id]
    )) as Elo | null;
    recordMediumDatabaseMetrics('SELECT', 'elo', performance.now() - startTime); // Record metric
    if (!elo) {
      const errorResponse = createErrorResponse(404, ErrorCodes.PLAYER_NOT_FOUND);
      return reply.code(404).send(errorResponse);
    }
    return reply.code(200).send(elo);
  } catch (error) {
    if (error) {
      const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
      return reply.code(500).send(errorResponse);
    }
  }
}

// Create a new elo
export async function createElo(
  request: FastifyRequest<{ Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  const player = request.params.id;
  const elo = 1000;

  request.log.info({
    msg: 'Creating elo entry',
    data: { player, elo },
  });

  try {
    const startTime = performance.now(); // Start timer
    const newElo = (await request.server.db.get(
      'INSERT OR IGNORE INTO elo (player, elo) VALUES (?, ?) RETURNING *',
      player,
      elo
    )) as Elo;
    recordMediumDatabaseMetrics('INSERT', 'elo', performance.now() - startTime); // Record metric
    eloHistogram.record(elo);

    return reply.code(201).send(newElo);
  } catch (error) {
    request.log.error({
      msg: 'Error in createElo',
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
            }
          : error,
    });

    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorResponse);
  }
}

// Get all elos
export async function getElos(
  request: FastifyRequest<{
    Querystring: GetElosQuery;
  }>,
  reply: FastifyReply
): Promise<void> {
  const { player, limit = 10, offset = 0 } = request.query;
  try {
    let query = 'SELECT * FROM elo WHERE 1=1';
    const params = [];
    if (player !== undefined) {
      query += ' AND player = ?';
      params.push(player);
    }
    query += ' ORDER BY created_at ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const startTime = performance.now(); // Start timer
    const elos = (await request.server.db.all(query, ...params)) as Elo[];
    recordMediumDatabaseMetrics('SELECT', 'elo', performance.now() - startTime); // Record metric
    return reply.code(200).send(elos);
  } catch (error) {
    if (error) {
      const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
      return reply.code(500).send(errorResponse);
    }
  }
}

export async function dailyElo(
  request: FastifyRequest<{
    Params: { player: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const { player } = request.params;
  try {
    const startTime = performance.now(); // Start timer
    const dailyElo = (await request.server.db.get(
      'SELECT player, match_date, elo FROM player_daily_elo WHERE player = ?',
      [player]
    )) as DailyElo[];
    recordMediumDatabaseMetrics('SELECT', 'player_daily_elo', performance.now() - startTime); // Record metric
    return reply.code(200).send(dailyElo);
  } catch (error) {
    if (error) {
      const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
      return reply.code(500).send(errorResponse);
    }
  }
}

// Add this new function that doesn't handle HTTP responses
export async function updateEloRatings(
  db: Database,
  winner: string,
  loser: string
): Promise<{ newWinnerElo: number; newLoserElo: number }> {
  // Get current ELO ratings
  let startTime = performance.now(); // Start timer
  const winnerElo = (await db.get(
    'SELECT * FROM elo INDEXED BY idx_elo_player_created_at WHERE player = ? ORDER BY created_at DESC LIMIT 1',
    [winner]
  )) as Elo | null;

  const loserElo = (await db.get(
    'SELECT * FROM elo INDEXED BY idx_elo_player_created_at WHERE player = ? ORDER BY created_at DESC LIMIT 1',
    [loser]
  )) as Elo | null;
  recordFastDatabaseMetrics('SELECT', 'elo', (performance.now() - startTime) / 2); // Record metric
  if (!winnerElo || !loserElo) {
    // Throw a specific error code instead of a generic Error
    const missingPlayer = !winnerElo ? winner : loser;
    throw new Error(ErrorCodes.ELO_NOT_FOUND + `:${missingPlayer}`);
  }

  const { winnerElo: newWinnerElo, loserElo: newLoserElo } = await calculateEloChange(
    winnerElo.elo,
    loserElo.elo
  );
  startTime = performance.now(); // Start timer
  // Insert new ELO values
  await db.get('INSERT INTO elo (player, elo) VALUES (?, ?) RETURNING *', [winner, newWinnerElo]);

  await db.get('INSERT INTO elo (player, elo) VALUES (?, ?) RETURNING *', [loser, newLoserElo]);
  recordMediumDatabaseMetrics('INSERT', 'elo', (performance.now() - startTime) / 2); // Record metric
  // Record metrics
  eloHistogram.record(newWinnerElo);
  eloHistogram.record(newLoserElo);

  return { newWinnerElo, newLoserElo };
}

// Get a single elo by ID
export async function getLeaderboard(
  request: FastifyRequest<{
    Querystring: GetPageQuery;
  }>,
  reply: FastifyReply
): Promise<void> {
  const { limit = 10, offset = 0 } = request.query;
  try {
    const startTime = performance.now();
    const leaderboard = (await request.server.db.all(
      `
      SELECT 
        e.player,
        e.elo,
        COALESCE(pms.victories, 0) as victories,
        COALESCE(pms.total_matches - pms.victories - pms.active_matches, 0) as defeats,
        COALESCE(pms.total_matches, 0) as total_matches
      FROM latest_player_elos e
      LEFT JOIN player_match_summary pms ON e.player = pms.player_id
      ORDER BY e.elo DESC LIMIT ? OFFSET ?;
    `,
      limit,
      offset
    )) as LeaderboardEntry[];
    for (let i = 0; i < leaderboard.length; i++) {
      try {
        const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082/user/${leaderboard[i].player}`;
        const response = await fetch(serviceUrl, { method: 'GET' });
        const user = (await response.json()) as IReplyUser | ErrorResponse;
        if ('username' in user && user.username !== 'computer') {
          leaderboard[i].username = user.username;
        } else {
          leaderboard.splice(i, 1);
          i--;
        }
      } catch (err) {
        leaderboard[i].username = 'undefined';
      }
    }

    recordMediumDatabaseMetrics('SELECT', 'leaderboard', performance.now() - startTime);
    return reply.code(200).send(leaderboard);
  } catch (error) {
    request.log.error({
      msg: 'Error in getLeaderboard',
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
            }
          : error,
    });

    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorResponse);
  }
}
