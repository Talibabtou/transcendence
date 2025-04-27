import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { ErrorCodes, createErrorResponse } from '../shared/constants/error.const.js';
import { recordFastDatabaseMetrics } from '../telemetry/metrics.js';
import { Match, GetTournamentsQuery, Finalist } from '../shared/types/match.type.js';

// Get a single matches by tournament ID
export async function getTournament(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params;
  try {
    const startTime = performance.now();
    const tournament = (await request.server.db.all(
      'SELECT * FROM matches WHERE tournament_id = ?',
      id
    )) as Match[] | null;
    recordFastDatabaseMetrics('SELECT', 'matches', performance.now() - startTime);
    if (!tournament) {
      const errorResponse = createErrorResponse(404, ErrorCodes.TOURNAMENT_NOT_FOUND);
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
    recordFastDatabaseMetrics('SELECT', 'matches', performance.now() - startTime);
    return reply.code(200).send(matches);
  } catch (error) {
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorResponse);
  }
}

// get final matches
// put back ultimateTie = 0 when we have a difference between 1 and 2

interface FinalResultObject {
  player_1: string | null;
  player_2: string | null;
}

// risk of undfined result
export async function getFinalMatches(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params;
  try {
    console.log(id);
    const startTime = performance.now();
    const matchCountResult = await request.server.db.get(
      'SELECT total_matches FROM tournament_match_count WHERE tournament_id = ?',
      id
    );
    recordFastDatabaseMetrics('SELECT', 'matches', performance.now() - startTime);
    if (matchCountResult.total_matches !== 6) {
      const errorResponse = createErrorResponse(400, ErrorCodes.TOURNAMENT_WRONG_MATCH_COUNT);
      return reply.code(400).send(errorResponse);
    }
    console.log('matchCountResult', matchCountResult);
    const topVictories = (await request.server.db.all(
      'SELECT player_id, victory_count FROM tournament_top_victories WHERE tournament_id = ? LIMIT 4', // Ensure you get top 3
      id
    )) as Finalist[];
    if (topVictories.length < 3) {
      const errorResponse = createErrorResponse(400, ErrorCodes.TOURNAMENT_INSUFFICIENT_PLAYERS); // Or a more specific code
      return reply.code(400).send(errorResponse);
    }
    let finalResult: FinalResultObject = { player_1: null, player_2: null };
    if (topVictories[1].victory_count !== topVictories[2].victory_count) {
      console.log('topVictories', topVictories);
      finalResult = { player_1: topVictories[0].player_id, player_2: topVictories[1].player_id };
      return reply.code(200).send(finalResult);
    }
    console.log('topVictories', topVictories);
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
    console.log('topScorer', topScorer);
    if (topScorer[0].goals_scored !== topScorer[1].goals_scored) {
      if (topScorer[1].goals_scored !== topScorer[2].goals_scored) {
        if (finalResult.player_1 === null) {
          finalResult = { player_1: topScorer[0].player_id, player_2: topScorer[1].player_id };
          console.log('topScorerTrio - duality', finalResult);
        } else {
          finalResult = { player_1: finalResult.player_1, player_2: topScorer[0].player_id };
          console.log('topScorerTrio', finalResult);
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
        console.log('topScorerTrio - duality', finalResult);
      } else {
        finalResult = { player_1: finalResult.player_1, player_2: topScorer[0].player_id };
        console.log('topScorerTrio', finalResult);
      }
      return reply.code(200).send(finalResult);
    } else if (
      topScorer[0].goals_scored === topScorer[1].goals_scored &&
      topScorer[1].goals_scored !== topScorer[2].goals_scored
    ) {
      if (finalResult.player_1 === null) {
        finalResult = { player_1: topScorer[0].player_id, player_2: topScorer[1].player_id };
        console.log('topScorerTrio', finalResult);
      } else {
        finalResult = await duality(
          request.server.db,
          id,
          finalResult,
          topScorer[0].player_id,
          topScorer[1].player_id,
          0
        );
        console.log('topScorerTrio - duality', finalResult);
      }
      return reply.code(200).send(finalResult);
    }
    const topDefense = await topDefenseTrio(request.server.db, id, player1, player2, player3);
    if (topDefense[0].goals_conceded !== topDefense[1].goals_conceded) {
      if (topDefense[1].goals_conceded !== topDefense[2].goals_conceded) {
        if (finalResult.player_1 === null) {
          finalResult = { player_1: topDefense[0].player_id, player_2: topDefense[1].player_id };
          console.log('topDefenseTrio - duality', finalResult);
        } else {
          finalResult = { player_1: finalResult.player_1, player_2: topDefense[0].player_id };
          console.log('topDefenseTrio', finalResult);
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
        console.log('topDefenseTrio - duality', finalResult);
      } else {
        finalResult = { player_1: finalResult.player_1, player_2: topDefense[0].player_id };
        console.log('topDefenseTrio', finalResult);
      }
      return reply.code(200).send(finalResult);
    } else if (
      topDefense[0].goals_conceded === topDefense[1].goals_conceded &&
      topDefense[1].goals_conceded !== topDefense[2].goals_conceded
    ) {
      if (finalResult.player_1 === null) {
        finalResult = { player_1: topDefense[0].player_id, player_2: topDefense[1].player_id };
        console.log('topDefenseTrio', finalResult);
      } else {
        finalResult = await duality(
          request.server.db,
          id,
          finalResult,
          topDefense[0].player_id,
          topDefense[1].player_id,
          1
        );
        console.log('topDefenseTrio - duality', finalResult);
      }
      return reply.code(200).send(finalResult);
    }
    const topSpeed = await topSpeedTrio(request.server.db, id, player1, player2, player3);
    if (finalResult.player_1 !== null) {
      finalResult = { player_1: finalResult.player_1, player_2: topSpeed[0].player_id };
      console.log('topSpeedTrio hello there', finalResult);
    } else {
      finalResult = { player_1: topSpeed[0].player_id, player_2: topSpeed[1].player_id };
      console.log('topSpeedTrio', finalResult);
    }
    return reply.code(200).send(finalResult);
  } catch (error) {
    console.error(error);
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorResponse);
  }
}

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
  const topScorers = (await db.all(topScorersQuery, [
    tournamentId,
    player1,
    player2,
    player3,
  ])) as Finalist[];
  return topScorers;
}

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
  console.log('topDefense', topDefense);
  return topDefense;
}

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
  console.log('topDefenseDuo', topDefense);
  return topDefense;
}

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
  const topSpeed = (await db.all(topSpeedQuery, [
    tournamentId,
    player1,
    player2,
    player3,
  ])) as Finalist[];
  console.log('topSpeed', topSpeed);
  return topSpeed;
}

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
  console.log('topSpeedDuo', topSpeed);
  return topSpeed;
}

// risk of undfined result
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
          return { player_1: topDefense[0].player_id, player_2: topDefense[1].player_id };
        } else {
          return { player_1: finalResult.player_1, player_2: topDefense[0].player_id };
        }
      }
    }
    const topSpeed = await topSpeedDuo(db, tournamentId, player1, player2);
    if (finalResult.player_1 === null) {
      return { player_1: topSpeed[0].player_id, player_2: topSpeed[1].player_id };
    } else {
      return { player_1: finalResult.player_1, player_2: topSpeed[0].player_id };
    }
  } catch (error) {
    console.error(error);
    return { player_1: null, player_2: null };
  }
}
