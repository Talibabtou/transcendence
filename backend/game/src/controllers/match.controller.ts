import {
  recordMediumDatabaseMetrics,
  matchCreationCounter,
  tournamentCreationCounter,
} from '../telemetry/metrics.js';
import {
  Match,
  CreateMatchRequest,
  PlayerStats,
  PlayerMatchSummary,
  DailyPerformance,
  GetPageQuery,
} from '../shared/types/match.type.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { IUsername } from '../shared/types/auth.types.js';
import { IId, IMatchId, MatchHistory } from '../shared/types/match.type.js';
import { ErrorCodes, createErrorResponse } from '../shared/constants/error.const.js';

/**
 * Retrieves a single match by its ID.
 *
 * @param request - FastifyRequest object containing the match ID in the request parameters.
 * @param reply - FastifyReply object used to send the response.
 * @returns Promise<void>
 *   - 200: Sends the match data if found.
 *   - 404: Sends an error response if the match is not found.
 *   - 500: Sends an error response for internal server issues.
 */
export async function getMatch(
  request: FastifyRequest<{
    Params: IMatchId;
  }>,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params;
  try {
    const startTime = performance.now();
    const match = (await request.server.db.get('SELECT * FROM matches WHERE id = ?', id)) as Match | null;
    recordMediumDatabaseMetrics('SELECT', 'matches', performance.now() - startTime);
    if (!match) {
      const errorResponse = createErrorResponse(404, ErrorCodes.MATCH_NOT_FOUND);
      return reply.code(404).send(errorResponse);
    }
    return reply.code(200).send(match);
  } catch (err) {
		request.server.log.error(err);
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorResponse);
  }
}

/**
 * Retrieves the match history for a specific player.
 *
 * @param request - FastifyRequest object containing the player ID in the request parameters
 *                  and query parameters for pagination.
 * @param reply - FastifyReply object used to send the response.
 * @returns Promise<void>
 *   - 200: Sends an array of match history entries.
 *   - 404: Sends an error response if no matches are found.
 *   - 500: Sends an error response for internal server issues.
 */
export async function getMatchHistory(
  request: FastifyRequest<{
    Params: IId;
    Querystring: GetPageQuery;
  }>,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params;
  const { limit = 10, offset = 0 } = request.query;
  try {
		const startTime = performance.now();
    const matches = await request.server.db.all(
      `
      SELECT 
        match_id, 
				player_id,
        player_1, 
        player_2,
        p1_score,
        p2_score,
				final,
        created_at
      FROM player_match_history
      WHERE player_id = ?
      ORDER BY created_at DESC LIMIT ? OFFSET ?;
      `,
      [id, limit, offset]
    );
		recordMediumDatabaseMetrics('SELECT', 'player_match_history', performance.now() - startTime);
    if (!matches) {
      const errorResponse = createErrorResponse(404, ErrorCodes.MATCH_NOT_FOUND);
      return reply.code(404).send(errorResponse);
    }
    const matchesHistory: MatchHistory[] = [];
    for (let i = 0; i < matches.length; i++) {
      const serviceUrlUsername1 = `http://${process.env.AUTH_ADDR || 'localhost'}:${process.env.AUTH_PORT || 8082}/username/${id}`;
      const responseUsername1 = await fetch(serviceUrlUsername1, { method: 'GET' });
      const responseDataUsername1 = (await responseUsername1.json()) as IUsername;
      let responseDataUsername2: IUsername;
			let matchHistory: MatchHistory;
      if (id === matches[i].player_1) {
        const serviceUrlUsername2 = `http://${process.env.AUTH_ADDR || 'localhost'}:${process.env.AUTH_PORT || 8082}/username/${matches[i].player_2}`;
        const responseUsername2 = await fetch(serviceUrlUsername2, { method: 'GET' });
        responseDataUsername2 = (await responseUsername2.json()) as IUsername;
        matchHistory = {
          matchId: matches[i].match_id || 'undefined',
          username1: responseDataUsername1.username || 'undefined',
          id1: request.params.id,
          goals1: matches[i].p1_score,
          username2: responseDataUsername2.username || 'undefined',
          id2: matches[i].player_2,
          goals2: matches[i].p2_score,
					final: matches[i].final,
          created_at: matches[i].created_at || 'undefined',
        };
      } else {
        const serviceUrlUsername2 = `http://${process.env.AUTH_ADDR || 'localhost'}:${process.env.AUTH_PORT || 8082}/username/${matches[i].player_1}`;
        const responseUsername2 = await fetch(serviceUrlUsername2, { method: 'GET' });
         responseDataUsername2 = (await responseUsername2.json()) as IUsername;
				 matchHistory = {
          matchId: matches[i].match_id || 'undefined',
          username1: responseDataUsername1.username || 'undefined',
          id1: request.params.id,
          goals1: matches[i].p2_score,
          username2: responseDataUsername2.username || 'undefined',
          id2: matches[i].player_1,
          goals2: matches[i].p1_score,
					final: matches[i].final,
          created_at: matches[i].created_at || 'undefined',
        };
      }
      matchesHistory.push(matchHistory);
    }
    return reply.code(200).send(matchesHistory);
  } catch (err) {
		request.server.log.error(err);
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorResponse);
  }
}

/**
 * Creates a new match between two players.
 *
 * @param request - FastifyRequest object containing the match data in the request body.
 * @param reply - FastifyReply object used to send the response.
 * @returns Promise<void>
 *   - 201: Sends the created match data.
 *   - 500: Sends an error response for internal server issues.
 */
export async function createMatch(
  request: FastifyRequest<{
    Body: CreateMatchRequest;
  }>,
  reply: FastifyReply
): Promise<void> {
  const { player_1, player_2, tournament_id, final } = request.body;

  try {
    let startTime = performance.now();
    const prevMatches = (await request.server.db.all(
      "SELECT *, CAST((julianday('now') - julianday(created_at)) * 24 * 60 * 60 AS INTEGER) as duration_seconds FROM matches WHERE (player_1 = ? OR player_2 = ?) AND active = TRUE",
      [player_1, player_2]
    )) as (Match & { duration_seconds: number })[];
    recordMediumDatabaseMetrics('SELECT', 'matches', performance.now() - startTime);
    if (prevMatches && prevMatches.length > 0) {
      for (const match of prevMatches) {
        if (match.duration_seconds > 600) {
          startTime = performance.now();
          await request.server.db.run(
            `UPDATE matches SET active = FALSE, duration = NULL WHERE id = ?`,
            match.id
          );
          recordMediumDatabaseMetrics('UPDATE', 'matches', performance.now() - startTime);
        }
      }
    }

    startTime = performance.now();
    const newMatch = (await request.server.db.get(
      'INSERT INTO matches (player_1, player_2, tournament_id, final) VALUES (?, ?, ?, ?) RETURNING *',
      [player_1, player_2, tournament_id || null, final || false]
    )) as Match;

    recordMediumDatabaseMetrics('INSERT', 'matches', performance.now() - startTime);
    matchCreationCounter.add(1, { 'match.status': 'created' });
    if (tournament_id) {
      tournamentCreationCounter.add(1);
    }

    return reply.code(201).send(newMatch);
  } catch (err) {
		request.server.log.error(err);

    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorResponse);
  }
}

/**
 * Retrieves the match summary for a specific player.
 *
 * @param request - FastifyRequest object containing the player ID in the request parameters.
 * @param reply - FastifyReply object used to send the response.
 * @returns Promise<void>
 *   - 200: Sends the match summary data.
 *   - 500: Sends an error response for internal server issues.
 */
export async function matchSummary(
  request: FastifyRequest<{
    Params: IId;
  }>,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params;
  try {
    const startTime = performance.now();
    const matchSummaryResult = await request.server.db.get(
      'SELECT total_matches, elo, victories FROM player_match_summary WHERE player_id = ?',
      [id]
    );
    recordMediumDatabaseMetrics('SELECT', 'player_match_summary', performance.now() - startTime);
    let matchSummary: PlayerMatchSummary;
    if (!matchSummaryResult) {
      matchSummary = {
        total_matches: 0,
        elo: 1000,
        victories: 0,
        defeats: 0,
      };
    } else {
      matchSummary = {
        total_matches: matchSummaryResult.total_matches,
        elo: matchSummaryResult.elo,
        victories: matchSummaryResult.victories,
        defeats: matchSummaryResult.total_matches - matchSummaryResult.victories,
      };
    }
    return reply.code(200).send(matchSummary);
  } catch (err) {
		request.server.log.error(err);

    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorResponse);
  }
}

/**
 * Retrieves the match statistics for a specific player.
 *
 * @param request - FastifyRequest object containing the player ID in the request parameters.
 * @param reply - FastifyReply object used to send the response.
 * @returns Promise<void>
 *   - 200: Sends the player statistics data.
 *   - 500: Sends an error response for internal server issues.
 */
export async function matchStats(
  request: FastifyRequest<{
    Params: IId;
  }>,
  reply: FastifyReply
): Promise<void> {
  const id = request.params.id;
  try {
    let startTime = performance.now();
    const dailyPerformance =
      ((await request.server.db.all(
        'SELECT match_date, matches_played, wins, losses, daily_win_ratio FROM player_daily_performance WHERE player_id = ? ORDER BY match_date',
        [id]
      )) as DailyPerformance[]) || [];
    recordMediumDatabaseMetrics('SELECT', 'player_daily_performance', performance.now() - startTime);

    startTime = performance.now();
    const goalDurationsResult = await request.server.db.all(
      'SELECT duration FROM player_goal_durations WHERE player = ?',
      [id]
    );
    recordMediumDatabaseMetrics('SELECT', 'player_goal_durations', performance.now() - startTime);
    const goalDurations = goalDurationsResult ? goalDurationsResult.map((row: { duration: number }) => Number(row.duration)) : [];

    startTime = performance.now();
    const matchDurationsResult = await request.server.db.all(
      'SELECT match_duration FROM player_match_durations WHERE player_id = ?',
      [id]
    );
    recordMediumDatabaseMetrics('SELECT', 'player_match_durations', performance.now() - startTime);
    const matchDurations = matchDurationsResult
      ? matchDurationsResult.map((row: { match_duration: number }) => Number(row.match_duration))
      : [];

    startTime = performance.now();
    const eloRatingsResult = await request.server.db.all(
      'SELECT elo FROM elo WHERE player = ? ORDER BY created_at',
      [id]
    );
    recordMediumDatabaseMetrics('SELECT', 'elo', performance.now() - startTime);
    const eloRatings = eloRatingsResult ? eloRatingsResult.map((row: { elo: number }) => Number(row.elo)) : [];

    let longestGoalDuration = null;
    let averageGoalDuration = null;

    if (goalDurations.length > 0) {
      longestGoalDuration = Math.max(...goalDurations);
      averageGoalDuration = goalDurations.reduce((sum: number, duration: number) => sum + duration, 0) / goalDurations.length;
    }

    const player_id = id;
    const playerStats: PlayerStats = {
      player_id: player_id,
      goal_stats: {
        fastest_goal_duration: longestGoalDuration,
        average_goal_duration: averageGoalDuration,
        total_goals: goalDurations.length,
      },
      daily_performance: dailyPerformance,
      goal_durations: goalDurations,
      match_durations: matchDurations,
      elo_history: eloRatings,
    };
    return reply.code(200).send(playerStats);
  } catch (err) {
		request.server.log.error(err);
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorResponse);
  }
}
