import {
  recordMediumDatabaseMetrics,
  goalDurationHistogram,
  matchDurationHistogram,
	finalTournamentCounter,
} from '../telemetry/metrics.js';
import { Database } from 'sqlite';
import { IId } from '../shared/types/goal.type.js';
import { Match } from '../shared/types/match.type.js';
import { updateEloRatings } from './elo.controller.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { ErrorCodes } from '../shared/constants/error.const.js';
import { sendError, isValidId } from '../helper/friends.helper.js';
import { Goal, LongestGoal, CreateGoalRequest } from '../shared/types/goal.type.js';

/**
 * Retrieves a single goal by its ID.
 *
 * @param request - FastifyRequest with goal ID in params.
 * @param reply - FastifyReply for sending the response.
 * @returns 200 with goal data, 404 if not found, 400 if bad ID, 500 on error.
 */
export async function getGoal(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params;
  if (!isValidId(id)) return sendError(reply, 400, ErrorCodes.BAD_REQUEST);
  try {
    const startTime = performance.now();
    const goal = (await request.server.db.get('SELECT id, match_id, player, duration, created_at FROM goal WHERE id = ?', [id])) as Goal | null;
    recordMediumDatabaseMetrics('SELECT', 'goal', performance.now() - startTime);
    if (!goal) return sendError(reply, 404, ErrorCodes.GOAL_NOT_FOUND);
    return reply.code(200).send(goal);
  } catch (err) {
		request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Creates a new goal for a player in a match.
 *
 * @param request - FastifyRequest with goal creation data in body and player ID in params.
 * @param reply - FastifyReply for sending the response.
 * @returns 201 with new goal, 404 if match not found, 400 if bad ID or player not in match, 500 on error.
 */
export async function createGoal(
  request: FastifyRequest<{
    Body: CreateGoalRequest;
    Params: IId;
  }>,
  reply: FastifyReply
): Promise<void> {
  const player = request.params.id;
  const { match_id, duration } = request.body;
  if (!isValidId(player)) return sendError(reply, 400, ErrorCodes.BAD_REQUEST);
  else if (!isValidId(match_id)) return sendError(reply, 400, ErrorCodes.BAD_REQUEST);
  try {
    let startTime = performance.now();
    const match = (await request.server.db.get(
      'SELECT id, player_1, player_2, active, duration, tournament_id, final, created_at FROM matches WHERE id = ?',
      match_id
    )) as Match | null;
    recordMediumDatabaseMetrics('SELECT', 'matches', performance.now() - startTime);
    goalDurationHistogram.record(duration);
    if (!match) return sendError(reply, 404, ErrorCodes.MATCH_NOT_FOUND);
    if (!match.active) return sendError(reply, 400, ErrorCodes.MATCH_NOT_ACTIVE);
    if (match.player_1 !== player && match.player_2 !== player) return sendError(reply, 400, ErrorCodes.PLAYER_NOT_IN_MATCH);
    startTime = performance.now();
    const newGoal = (await request.server.db.get(
      'INSERT INTO goal (match_id, player, duration) VALUES (?, ?, ?) RETURNING id, match_id, player, duration, created_at',
      match_id,
      player,
      duration || null
    )) as Goal;
    recordMediumDatabaseMetrics('INSERT', 'goal', performance.now() - startTime);
    startTime = performance.now();
    const maxGoals = await request.server.db.get(
      `
			SELECT MAX(goal_count) as max_goals FROM (
				SELECT player, COUNT(*) as goal_count 
				FROM goal 
				WHERE match_id = ?
				GROUP BY player
			)`,
      match_id
    );
    recordMediumDatabaseMetrics('SELECT', 'goal', performance.now() - startTime);
    if (maxGoals && maxGoals.max_goals == 3) {
      try {
				await finalGoal(match, player, request.server.db);
				const matchStatus = await request.server.db.get<{ final: boolean | number }>(
					`SELECT final FROM matches WHERE id = ?`,
					match_id
				);
				if (matchStatus && matchStatus.final) {
					finalTournamentCounter.add(1);
				}
      } catch (err) {
				request.server.log.error(err);
        if (err instanceof Error && err.message.startsWith(ErrorCodes.ELO_NOT_FOUND)) return sendError(reply, 404, ErrorCodes.ELO_NOT_FOUND);
        throw err;
      }
    }
    return reply.code(201).send(newGoal);
  } catch (err) {
		request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Retrieves the longest goal duration for a player.
 *
 * @param request - FastifyRequest with player ID in params.
 * @param reply - FastifyReply for sending the response.
 * @returns 200 with longest goal, 404 if not found, 400 if bad ID, 500 on error.
 */
export async function longestGoal(
  request: FastifyRequest<{
    Params: { player_id: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const { player_id } = request.params;
  if (!isValidId(player_id)) return sendError(reply, 400, ErrorCodes.BAD_REQUEST);
  try {
    const startTime = performance.now();
    const goal = (await request.server.db.get(
      'SELECT duration FROM goal WHERE player = ? ORDER BY duration DESC LIMIT 1',
      [player_id]
    )) as LongestGoal | null;
    recordMediumDatabaseMetrics('SELECT', 'goal', performance.now() - startTime);
    if (!goal) return sendError(reply, 404, ErrorCodes.GOAL_NOT_FOUND);
    return reply.code(200).send(goal);
  } catch (err) {
		request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Handles the logic for the final goal in a match, updating match status, duration, and ELO ratings.
 *
 * @param match - The match object.
 * @param player - The player who scored the final goal.
 * @param db - The database instance.
 * @throws Error if ELO not found or other database errors occur.
 */
async function finalGoal(match: Match, player: string, db: Database) {
  try {

    let startTime = performance.now();
    const matchDurationResult = await db.get(
      `SELECT CAST((julianday('now') - julianday(created_at)) * 24 * 60 * 60 AS INTEGER) as duration_seconds 
       FROM matches WHERE id = ?`,
      [match.id]
    );
    recordMediumDatabaseMetrics('SELECT', 'matches', performance.now() - startTime);
    startTime = performance.now();
    await db.run(
      `UPDATE matches SET active = false, duration = ? WHERE id = ?`,
      matchDurationResult.duration_seconds,
      match.id
    );
    recordMediumDatabaseMetrics('UPDATE', 'matches', performance.now() - startTime);
    const winner = match.player_1 === player ? match.player_1 : match.player_2;
    const loser = match.player_1 === player ? match.player_2 : match.player_1;
    await updateEloRatings(db, winner, loser);
    matchDurationHistogram.record(matchDurationResult.duration_seconds);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith(ErrorCodes.ELO_NOT_FOUND)) {
      const playerInfo = err.message.split(':')[1];
      throw new Error(`${ErrorCodes.ELO_NOT_FOUND}:${playerInfo}`);
    }
    throw err;
  }
}
