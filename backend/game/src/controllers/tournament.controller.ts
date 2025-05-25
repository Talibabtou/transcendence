import { IId, IUsername } from '../shared/types/auth.types.js';
import { ErrorCodes, createErrorResponse } from '../shared/constants/error.const.js';
import { sendError, isValidId } from '../helper/friends.helper.js';
import { recordFastDatabaseMetrics } from '../telemetry/metrics.js';
import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { Match, Finalist, FinalResultObject, MatchHistory, TournamentMatch, GetPageQuery } from '../shared/types/match.type.js';

/**
 * Retrieves all matches for a specific tournament by tournament ID.
 *
 * @param request - FastifyRequest object containing the tournament ID in params.
 * @param reply - FastifyReply object for sending the response.
 * @returns 200: matches array, 400: invalid ID, 404: tournament not found, 500: server error.
 */
export async function getTournament(
  request: FastifyRequest<{
    Params: IId;
		Querystring: GetPageQuery;
  }>,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params;
	const { limit = 10, offset = 0 } = request.query;
  try {
		console.log('getTournament', id, limit, offset);
    const matches = await request.server.db.all(
      `
      SELECT 
        match_id, 
				player_id,
        player_1, 
        player_2,
        p1_score,
        p2_score,
				tournament_id,
				final,
        created_at
      FROM player_match_history
      WHERE tournament_id = ?
      ORDER BY created_at DESC LIMIT ? OFFSET ?;
      `,
      ['c70efcc4-5598-c90b-17f1-ad615b4c8007', limit, offset]
    );
		console.log('getTournament', matches);
    if (!matches) {
      const errorResponse = createErrorResponse(404, ErrorCodes.MATCH_NOT_FOUND);
      return reply.code(404).send(errorResponse);
    }
    let matchesHistory: TournamentMatch[] = [];
    for (let i = 0; i < matches.length; i++) {
      const serviceUrlUsername1 = `http://${process.env.AUTH_ADDR || 'localhost'}:${process.env.AUTH_PORT || 8082}/username/${matches[i].player_1}`;
      const responseUsername1 = await fetch(serviceUrlUsername1, { method: 'GET' });
      const responseDataUsername1 = (await responseUsername1.json()) as IUsername;
      let responseDataUsername2: IUsername;
			let matchHistory: TournamentMatch;
			const serviceUrlUsername2 = `http://${process.env.AUTH_ADDR || 'localhost'}:${process.env.AUTH_PORT || 8082}/username/${matches[i].player_2}`;
			const responseUsername2 = await fetch(serviceUrlUsername2, { method: 'GET' });
			responseDataUsername2 = (await responseUsername2.json()) as IUsername;
			matchHistory = {
				matchId: matches[i].match_id || 'undefined',
				username1: responseDataUsername1.username || 'undefined',
				id1: matches[i].player_1,
				goals1: matches[i].p1_score,
				username2: responseDataUsername2.username || 'undefined',
				id2: matches[i].player_2,
				goals2: matches[i].p2_score,
				winner: matches[i].p1_score > matches[i].p2_score ? matches[i].player_1 : matches[i].player_2,
				final: matches[i].final,
				created_at: matches[i].created_at || 'undefined',
			};
      matchesHistory.push(matchHistory);
    }
    console.log({ matchesHistory });
    return reply.code(200).send(matchesHistory);
  } catch (error) {
    console.log(error);
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorResponse);
  }
}

/**
 * Determines and returns the finalists for a tournament based on victories, goals, defense, and speed.
 *
 * @param request - FastifyRequest object containing the tournament ID in params.
 * @param reply - FastifyReply object for sending the response.
 * @returns 200 with finalist object, 400 if invalid ID, wrong match count, or insufficient players, 500 on server error.
 */
export async function getFinalMatches(
  request: FastifyRequest<{
    Params: IId;
  }>,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params;
  if (!isValidId(id)) return sendError(reply, 400, ErrorCodes.BAD_REQUEST);
  try {
    const startTime = performance.now();
    const matchCountResult = await request.server.db.get(
      'SELECT total_matches FROM tournament_match_count WHERE tournament_id = ?',
      id
    );
    recordFastDatabaseMetrics('SELECT', 'matches', performance.now() - startTime);
    if (matchCountResult.total_matches !== 6) return sendError(reply, 400, ErrorCodes.TOURNAMENT_WRONG_MATCH_COUNT);
    const topVictories = (await request.server.db.all(
      'SELECT player_id, victory_count FROM tournament_top_victories WHERE tournament_id = ? LIMIT 4', // Ensure you get top 3
      id
    )) as Finalist[];
    if (topVictories.length < 3) return sendError(reply, 400, ErrorCodes.TOURNAMENT_INSUFFICIENT_PLAYERS);
    let finalResult: FinalResultObject = { player_1: null, player_2: null };
    if (topVictories[1].victory_count !== topVictories[2].victory_count) {
      console.log('topVictories', topVictories);
      finalResult = {
        player_1: topVictories[0].player_id,
        player_2: topVictories[1].player_id,
      };
      return reply.code(200).send(finalResult);
    }
    let player1 = topVictories[0].player_id;
    let player2 = topVictories[1].player_id;
    let player3 = topVictories[2].player_id;
    if (topVictories[0].victory_count !== topVictories[1].victory_count) {
      finalResult = { player_1: topVictories[0].player_id, player_2: null };
      player1 = topVictories[1].player_id;
      player2 = topVictories[2].player_id;
      player3 = topVictories[3].player_id;
    }
    const topScorer = await topScorerTrio(request.server.db, id, player1, player2, player3);
    if (topScorer[0].goals_scored !== topScorer[1].goals_scored) {
      if (topScorer[1].goals_scored !== topScorer[2].goals_scored) {
        if (finalResult.player_1 === null) {
          finalResult = {
            player_1: topScorer[0].player_id,
            player_2: topScorer[1].player_id,
          };
        } else {
          finalResult = {
            player_1: finalResult.player_1,
            player_2: topScorer[0].player_id,
          };
        }
        return reply.code(200).send(finalResult);
      } else if (finalResult.player_1 === null) {
        finalResult = { player_1: topScorer[0].player_id, player_2: null };
        finalResult = await duality(
          request.server.db,
          id,
          finalResult,
          topScorer[1].player_id,
          topScorer[2].player_id,
          0
        );
      } else {
        finalResult = {
          player_1: finalResult.player_1,
          player_2: topScorer[0].player_id,
        };
      }
      return reply.code(200).send(finalResult);
    } else if (
      topScorer[0].goals_scored === topScorer[1].goals_scored &&
      topScorer[1].goals_scored !== topScorer[2].goals_scored
    ) {
      if (finalResult.player_1 === null) {
        finalResult = {
          player_1: topScorer[0].player_id,
          player_2: topScorer[1].player_id,
        };
      } else {
        finalResult = await duality(
          request.server.db,
          id,
          finalResult,
          topScorer[0].player_id,
          topScorer[1].player_id,
          0
        );
      }
      return reply.code(200).send(finalResult);
    }
    const topDefense = await topDefenseTrio(request.server.db, id, player1, player2, player3);
    if (topDefense[0].goals_conceded !== topDefense[1].goals_conceded) {
      if (topDefense[1].goals_conceded !== topDefense[2].goals_conceded) {
        if (finalResult.player_1 === null) {
          finalResult = {
            player_1: topDefense[0].player_id,
            player_2: topDefense[1].player_id,
          };
        } else {
          finalResult = {
            player_1: finalResult.player_1,
            player_2: topDefense[0].player_id,
          };
        }
        return reply.code(200).send(finalResult);
      } else if (finalResult.player_1 === null) {
        finalResult = { player_1: topScorer[0].player_id, player_2: null };
        finalResult = await duality(
          request.server.db,
          id,
          finalResult,
          topDefense[1].player_id,
          topDefense[2].player_id,
          1
        );
      } else {
        finalResult = {
          player_1: finalResult.player_1,
          player_2: topDefense[0].player_id,
        };
      }
      return reply.code(200).send(finalResult);
    } else if (
      topDefense[0].goals_conceded === topDefense[1].goals_conceded &&
      topDefense[1].goals_conceded !== topDefense[2].goals_conceded
    ) {
      if (finalResult.player_1 === null) {
        finalResult = {
          player_1: topDefense[0].player_id,
          player_2: topDefense[1].player_id,
        };
      } else {
        finalResult = await duality(
          request.server.db,
          id,
          finalResult,
          topDefense[0].player_id,
          topDefense[1].player_id,
          1
        );
      }
      return reply.code(200).send(finalResult);
    }
    const topSpeed = await topSpeedTrio(request.server.db, id, player1, player2, player3);
    if (finalResult.player_1 !== null) {
      finalResult = {
        player_1: finalResult.player_1,
        player_2: topSpeed[0].player_id,
      };
    } else {
      finalResult = {
        player_1: topSpeed[0].player_id,
        player_2: topSpeed[1].player_id,
      };
    }
    return reply.code(200).send(finalResult);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Retrieves the top 3 scorers among three players in a tournament.
 *
 * @param db - The FastifyInstance database connection.
 * @param tournamentId - The tournament ID.
 * @param player1 - First player ID.
 * @param player2 - Second player ID.
 * @param player3 - Third player ID.
 * @returns Promise<Finalist[]>: top 3 by goals scored, throws 500 on db error.
 */
async function topScorerTrio(
  db: FastifyInstance['db'],
  tournamentId: string,
  player1: string,
  player2: string,
  player3: string
): Promise<Finalist[]> {
  const topScorersQuery = `
    SELECT g.player AS player_id, COUNT(*) AS goals_scored
    FROM goal g JOIN matches m ON g.match_id = m.id
    WHERE m.tournament_id = ? AND m.active = FALSE AND g.player IN (?, ?, ?)
    GROUP BY g.player
    ORDER BY goals_scored DESC
    LIMIT 3;
  `;
  const topScorers = (await db.all(topScorersQuery, [tournamentId, player1, player2, player3])) as Finalist[];
  return topScorers;
}

/**
 * Retrieves the top 3 defenders (least goals conceded) among three players in a tournament.
 *
 * @param db - The FastifyInstance database connection.
 * @param tournamentId - The tournament ID.
 * @param player1 - First player ID.
 * @param player2 - Second player ID.
 * @param player3 - Third player ID.
 * @returns Promise<Finalist[]>: top 3 by least goals conceded, throws 500 on db error.
 */
async function topDefenseTrio(
  db: FastifyInstance['db'],
  tournamentId: string,
  player1: string,
  player2: string,
  player3: string
): Promise<Finalist[]> {
  const topDefenseQuery = `
    SELECT
        p.player_id,
        COUNT(g.id) AS goals_conceded
    FROM
        (SELECT ? AS player_id UNION ALL SELECT ? AS player_id UNION ALL SELECT ? AS player_id) p -- Player 1, 2, 3 IDs
    LEFT JOIN
        matches m ON (m.player_1 = p.player_id OR m.player_2 = p.player_id) AND m.tournament_id = ? AND m.active = FALSE
    LEFT JOIN
        goal g ON m.id = g.match_id AND (
            (m.player_1 = p.player_id AND g.player = m.player_2) OR
            (m.player_2 = p.player_id AND g.player = m.player_1)
        )
    GROUP BY
        p.player_id
    ORDER BY
        goals_conceded ASC -- Lower conceded is better
    LIMIT 3;
		`;
  const topDefense = (await db.all(topDefenseQuery, [player1, player2, player3, tournamentId])) as {
    player_id: string;
    goals_conceded: number;
  }[];
  return topDefense;
}

/**
 * Retrieves the top 2 defenders (least goals conceded) among two players in a tournament.
 *
 * @param db - The FastifyInstance database connection.
 * @param tournamentId - The tournament ID.
 * @param player1 - First player ID.
 * @param player2 - Second player ID.
 * @returns Promise<Finalist[]>: top 2 by least goals conceded, throws 500 on db error.
 */
async function topDefenseDuo(
  db: FastifyInstance['db'],
  tournamentId: string,
  player1: string,
  player2: string
): Promise<Finalist[]> {
  const topDefenseQuery = `
    SELECT
        p.player_id,
        COUNT(g.id) AS goals_conceded
    FROM
        (SELECT ? AS player_id UNION ALL SELECT ? AS player_id) p -- Player 1, 2 IDs
    LEFT JOIN
        matches m ON (m.player_1 = p.player_id OR m.player_2 = p.player_id) AND m.tournament_id = ? AND m.active = FALSE
    LEFT JOIN
        goal g ON m.id = g.match_id AND (
            (m.player_1 = p.player_id AND g.player = m.player_2) OR
            (m.player_2 = p.player_id AND g.player = m.player_1)
        )
    GROUP BY
        p.player_id
    ORDER BY
        goals_conceded ASC -- Lower conceded is better
    LIMIT 2;
		`;
  const topDefense = (await db.all(topDefenseQuery, [player1, player2, tournamentId])) as {
    player_id: string;
    goals_conceded: number;
  }[];
  return topDefense;
}

/**
 * Retrieves the top 3 fastest scorers (least total goal duration) among three players in a tournament.
 *
 * @param db - The FastifyInstance database connection.
 * @param tournamentId - The tournament ID.
 * @param player1 - First player ID.
 * @param player2 - Second player ID.
 * @param player3 - Third player ID.
 * @returns Promise<Finalist[]>: top 3 by fastest scoring, throws 500 on db error.
 */
async function topSpeedTrio(
  db: FastifyInstance['db'],
  tournamentId: string,
  player1: string,
  player2: string,
  player3: string
): Promise<Finalist[]> {
  const topSpeedQuery = `
		SELECT g.player AS player_id, COALESCE(SUM(g.duration), 0) AS total_duration
		FROM goal g JOIN matches m ON g.match_id = m.id
		WHERE m.tournament_id = ? AND m.active = FALSE AND g.player IN (?, ?, ?)
		GROUP BY g.player
		ORDER BY total_duration ASC
		LIMIT 3;
		`;
  const topSpeed = (await db.all(topSpeedQuery, [tournamentId, player1, player2, player3])) as Finalist[];
  return topSpeed;
}

/**
 * Retrieves the top 2 fastest scorers (least total goal duration) among two players in a tournament.
 *
 * @param db - The FastifyInstance database connection.
 * @param tournamentId - The tournament ID.
 * @param player1 - First player ID.
 * @param player2 - Second player ID.
 * @returns Promise<Finalist[]>: top 2 by fastest scoring, throws 500 on db error.
 */
async function topSpeedDuo(
  db: FastifyInstance['db'],
  tournamentId: string,
  player1: string,
  player2: string
): Promise<Finalist[]> {
  const topSpeedQuery = `
		SELECT g.player AS player_id, COALESCE(SUM(g.duration), 0) AS goal_duration
		FROM goal g JOIN matches m ON g.match_id = m.id
		WHERE m.tournament_id = ? AND m.active = FALSE AND g.player IN (?, ?)
		GROUP BY g.player
		ORDER BY goal_duration ASC
		LIMIT 2;
		`;
  const topSpeed = (await db.all(topSpeedQuery, [tournamentId, player1, player2])) as Finalist[];
  return topSpeed;
}

/**
 * Resolves a tie between two players using defense and speed metrics.
 *
 * @param db - The FastifyInstance database connection.
 * @param tournamentId - The tournament ID.
 * @param finalResult - The current FinalResultObject.
 * @param player1 - First player ID.
 * @param player2 - Second player ID.
 * @param step - 0 to check defense first, 1 to check speed.
 * @returns Promise<FinalResultObject>: updated result, throws 500 on db error.
 */
async function duality(
  db: FastifyInstance['db'],
  tournamentId: string,
  finalResult: FinalResultObject,
  player1: string,
  player2: string,
  step: 0 | 1
): Promise<FinalResultObject> {
  try {
    if (step === 0) {
      const topDefense = await topDefenseDuo(db, tournamentId, player1, player2);
      if (topDefense[0].goals_conceded !== topDefense[1].goals_conceded) {
        if (finalResult.player_1 === null) {
          return {
            player_1: topDefense[0].player_id,
            player_2: topDefense[1].player_id,
          };
        } else {
          return {
            player_1: finalResult.player_1,
            player_2: topDefense[0].player_id,
          };
        }
      }
    }
    const topSpeed = await topSpeedDuo(db, tournamentId, player1, player2);
    if (finalResult.player_1 === null) {
      return {
        player_1: topSpeed[0].player_id,
        player_2: topSpeed[1].player_id,
      };
    } else {
      return {
        player_1: finalResult.player_1,
        player_2: topSpeed[0].player_id,
      };
    }
  } catch (err) {
    return { player_1: null, player_2: null };
  }
}
