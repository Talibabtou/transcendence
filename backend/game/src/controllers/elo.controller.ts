import { FastifyRequest, FastifyReply } from 'fastify';
import { ErrorCodes, createErrorResponse } from '../shared/constants/error.const.js';
import { ErrorResponse } from '../shared/types/error.type.js';
import { IReplyUser } from '../shared/types/auth.types.js';
import {
  recordMediumDatabaseMetrics,
  eloHistogram,
} from '../telemetry/metrics.js';
import { Database } from 'sqlite';
import { Elo, DailyElo, LeaderboardEntry } from '../shared/types/elo.type.js';
import { IId, GetPageQuery } from '../shared/types/match.type.js';

/**
 * Calculates the new Elo ratings for a winner and a loser of a match.
 * The calculation is based on the standard Elo rating system formula.
 *
 * @param winnerElo - The current Elo rating of the match winner.
 * @param loserElo - The current Elo rating of the match loser.
 * @returns A Promise that resolves to an object containing the new Elo ratings
 *          for the winner and the loser, e.g., { winnerElo: number, loserElo: number }.
 *          The ratings are rounded to the nearest integer.
 */
async function calculateEloChange(
  winnerElo: number,
  loserElo: number
): Promise<{ winnerElo: number; loserElo: number }> {
  const K_FACTOR = 32;

  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
  const newWinnerElo = Math.round(winnerElo + K_FACTOR * (1 - expectedWinner));
  const newLoserElo = Math.round(loserElo + K_FACTOR * (0 - expectedLoser));

  return {
    winnerElo: newWinnerElo,
    loserElo: newLoserElo,
  };
}

/**
 * Retrieves the latest Elo rating for a specific player.
 *
 * @param request - FastifyRequest object, expecting a player ID in the URL parameters (`request.params.id`).
 * @param reply - FastifyReply object used to send the response.
 * @returns Promise<void>
 *   - 200: Sends the player's Elo data if found.
 *   - 404: Sends an error if the player is not found (ErrorCodes.PLAYER_NOT_FOUND).
 *   - 500: Sends an error for internal server issues (ErrorCodes.INTERNAL_ERROR).
 */
export async function getElo(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const { id: player_id } = request.params;
  try {
    const startTime = performance.now();
    const elo = (await request.server.db.get(
      'SELECT * FROM elo INDEXED BY idx_elo_player_created_at WHERE player = ? ORDER BY created_at DESC LIMIT 1',
      [player_id]
    )) as Elo | null;
    recordMediumDatabaseMetrics('SELECT', 'elo', performance.now() - startTime);
    if (!elo) {
      const errorResponse = createErrorResponse(404, ErrorCodes.PLAYER_NOT_FOUND);
      return reply.code(404).send(errorResponse);
    }
    return reply.code(200).send(elo);
  } catch (err) {
		request.server.log.error(err);
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorResponse);
  }
}

/**
 * Creates an initial Elo rating entry for a new player.
 * The default Elo rating is 1000.
 * If an Elo entry for the player already exists, this operation will be ignored.
 *
 * @param request - FastifyRequest object, expecting a player ID in the URL parameters (`request.params.id`).
 * @param reply - FastifyReply object used to send the response.
 * @returns Promise<void>
 *   - 201: Sends the newly created Elo entry.
 *   - 500: Sends an error for internal server issues (ErrorCodes.INTERNAL_ERROR), logs detailed error.
 */
export async function createElo(
  request: FastifyRequest<{ Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  const player = request.params.id;
  const elo = 1000;
  try {
    const startTime = performance.now();
    const newElo = (await request.server.db.get(
      'INSERT OR IGNORE INTO elo (player, elo) VALUES (?, ?) RETURNING *',
      player,
      elo
    )) as Elo;
    recordMediumDatabaseMetrics('INSERT', 'elo', performance.now() - startTime);
    eloHistogram.record(elo);
    return reply.code(201).send(newElo);
  } catch (err) {
		request.server.log.error(err);
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorResponse);
  }
}

/**
 * Retrieves the daily Elo rating history for a specific player.
 *
 * @param request - FastifyRequest object, expecting a player ID in the URL parameters (`request.params.player`).
 * @param reply - FastifyReply object used to send the response.
 * @returns Promise<void>
 *   - 200: Sends an array of daily Elo entries for the player.
 *   - 500: Sends an error for internal server issues (ErrorCodes.INTERNAL_ERROR).
 */
export async function dailyElo(
  request: FastifyRequest<{
    Params: { player: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const { player } = request.params;
  try {
    const startTime = performance.now();
    const dailyElo = (await request.server.db.get(
      'SELECT player, match_date, elo FROM player_daily_elo WHERE player = ?',
      [player]
    )) as DailyElo[];
    recordMediumDatabaseMetrics('SELECT', 'player_daily_elo', performance.now() - startTime);
    return reply.code(200).send(dailyElo);
  } catch (err) {
		request.server.log.error(err);
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorResponse);
  }
}

/**
 * Updates the Elo ratings for a winner and a loser after a match.
 * It fetches their current Elo, calculates the changes, and inserts new Elo entries for both.
 *
 * @param db - The database instance to perform operations on.
 * @param winner - The ID of the player who won the match.
 * @param loser - The ID of the player who lost the match.
 * @returns A Promise that resolves to an object containing the new Elo ratings
 *          for the winner and loser, e.g., { newWinnerElo: number, newLoserElo: number }.
 * @throws Error if either the winner's or loser's Elo rating is not found (ErrorCodes.ELO_NOT_FOUND).
 */
export async function updateEloRatings(
  db: Database,
  winner: string,
  loser: string
): Promise<{ newWinnerElo: number; newLoserElo: number }> {
  let startTime = performance.now();
  const winnerElo = (await db.get(
    'SELECT * FROM elo INDEXED BY idx_elo_player_created_at WHERE player = ? ORDER BY created_at DESC LIMIT 1',
    [winner]
  )) as Elo | null;
  const loserElo = (await db.get(
    'SELECT * FROM elo INDEXED BY idx_elo_player_created_at WHERE player = ? ORDER BY created_at DESC LIMIT 1',
    [loser]
  )) as Elo | null;
  recordMediumDatabaseMetrics('SELECT', 'elo', (performance.now() - startTime) / 2);
  if (!winnerElo || !loserElo) {
    const missingPlayer = !winnerElo ? winner : loser;
    throw new Error(ErrorCodes.ELO_NOT_FOUND + `:${missingPlayer}`);
  }
  const { winnerElo: newWinnerElo, loserElo: newLoserElo } = await calculateEloChange(
    winnerElo.elo,
    loserElo.elo
  );
  startTime = performance.now();
  await db.get('INSERT INTO elo (player, elo) VALUES (?, ?) RETURNING *', [winner, newWinnerElo]);
  await db.get('INSERT INTO elo (player, elo) VALUES (?, ?) RETURNING *', [loser, newLoserElo]);
  recordMediumDatabaseMetrics('INSERT', 'elo', (performance.now() - startTime) / 2);
  eloHistogram.record(newWinnerElo);
  eloHistogram.record(newLoserElo);
  return { newWinnerElo, newLoserElo };
}

/**
 * Retrieves the leaderboard, ranking players by their latest Elo rating.
 * It also fetches player statistics like victories, defeats, and total matches.
 * Usernames are fetched from an external authentication service. 'ai' users and
 * users for whom fetching fails (or results in 'undefined' username) are excluded or handled.
 *
 * @param request - FastifyRequest object, accepting 'limit' and 'offset' in the querystring
 *                  for pagination (`request.query`). Defaults to limit=10, offset=0.
 * @param reply - FastifyReply object used to send the response.
 * @returns Promise<void>
 *   - 200: Sends an array of leaderboard entries.
 *   - 500: Sends an error for internal server issues (ErrorCodes.INTERNAL_ERROR), logs detailed error.
 */
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
        COALESCE(pms.total_matches - pms.victories, 0) as defeats,
        COALESCE(pms.total_matches, 0) as total_matches
      FROM latest_player_elos e
      LEFT JOIN player_match_summary pms ON e.player = pms.player_id
      ORDER BY e.elo DESC LIMIT ? OFFSET ?;
    `,
      limit,
      offset
    )) as LeaderboardEntry[];
		recordMediumDatabaseMetrics('SELECT', 'leaderboard', performance.now() - startTime);
    for (let i = 0; i < leaderboard.length; i++) {
      try {
        const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:${process.env.AUTH_PORT || 8082}/user/${leaderboard[i].player}`;
        const response = await fetch(serviceUrl, { method: 'GET' });
        const user = (await response.json()) as IReplyUser | ErrorResponse;
        if ('username' in user && user.username !== 'ai') {
          leaderboard[i].username = user.username;
        } else {
          leaderboard.splice(i, 1);
          i--;
        }
      } catch (err) {
				request.server.log.error(err);
        leaderboard[i].username = 'undefined';
      }
    }
    return reply.code(200).send(leaderboard);
  } catch (err) {
		request.server.log.error(err);
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorResponse);
  }
}
