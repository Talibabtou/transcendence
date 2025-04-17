import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { ErrorCodes, createErrorResponse } from '../../../../shared/constants/error.const.js'
import { recordFastDatabaseMetrics} from '../telemetry/metrics.js'
import { 
  Match,
	GetTournamentsQuery,
	Finalist
} from '@shared/types/match.type.js'


// Get a single matches by tournament ID
export async function getTournament(request: FastifyRequest<{
  Params: {id: string}
}>, reply: FastifyReply): Promise<void> {
  const { id } = request.params
  try {
    const startTime = performance.now();
    const tournament = await request.server.db.all('SELECT * FROM matches WHERE tournament_id = ?', id) as Match[] | null
    recordFastDatabaseMetrics('SELECT', 'matches', (performance.now() - startTime));
    if (!tournament) {
      const errorResponse = createErrorResponse(404, ErrorCodes.TOURNAMENT_NOT_FOUND)
      return reply.code(404).send(errorResponse)
    }
    return reply.code(200).send(tournament)
  } catch (error) {
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
    return reply.code(500).send(errorResponse)
  }
}

// Get multiple matches with optional filters
export async function getTournaments(request: FastifyRequest<{
  Querystring: GetTournamentsQuery
}>, reply: FastifyReply): Promise<void> {
  const { player_id, limit = 10, offset = 0 } = request.query
  try {
    let query = 'SELECT * FROM matches WHERE 1=1'
    const params = []
    if (player_id !== undefined) {
      query += ' AND (player_1 = ? OR player_2 = ?)'
      params.push(player_id, player_id)
    }
		query += ' AND tournament_id IS NOT NULL AND final = TRUE'
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)
		//parameterized queries
    const startTime = performance.now();
    const matches = await request.server.db.all(query, params) as Match[]
    recordFastDatabaseMetrics('SELECT', 'matches', (performance.now() - startTime));
    return reply.code(200).send(matches)
  } catch (error) {
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
    return reply.code(500).send(errorResponse)
  }
}

// get final matches
// put back ultimateTie = 0 when we have a difference between 1 and 2

interface FinalResultObject {
  player_1: string | null;
  player_2: string | null;
}

export async function getFinalMatches(request: FastifyRequest<{
  Params: {id: string}
}>, reply: FastifyReply): Promise<void> {
  const { id } = request.params
  try {
		console.log(id)
    const startTime = performance.now();
    const matchCountResult = await request.server.db.get('SELECT total_matches FROM tournament_match_count WHERE tournament_id = ?', id);
		console.log(matchCountResult)
    recordFastDatabaseMetrics('SELECT', 'matches', (performance.now() - startTime));
		if (matchCountResult.total_matches !== 6) {
			const errorResponse = createErrorResponse(400, ErrorCodes.TOURNAMENT_WRONG_MATCH_COUNT)
			return reply.code(400).send(errorResponse)
		}
		const topVictories = await request.server.db.all(
        'SELECT player_id, victory_count FROM tournament_top_victories WHERE tournament_id = ? LIMIT 3', // Ensure you get top 3
        id
    ) as Finalist[];

    if (topVictories.length < 3) {
        const errorResponse = createErrorResponse(400, ErrorCodes.TOURNAMENT_INSUFFICIENT_PLAYERS); // Or a more specific code
        return reply.code(400).send(errorResponse);
    }
		let finalResult: FinalResultObject = {player_1: null, player_2: null};
		if (topVictories[1].victory_count !== topVictories[2].victory_count) {
			console.log(topVictories)
			finalResult = {"player_1": topVictories[0].player_id, "player_2": topVictories[1].player_id}
			return reply.code(200).send(finalResult)
		}
		let player1_id = topVictories[0].player_id;
		let player2_id = topVictories[1].player_id;
		let player3_id = topVictories[2].player_id;
		if (topVictories[0].victory_count === topVictories[1].victory_count && topVictories[0].victory_count === topVictories[2].victory_count) {
			finalResult = await ultimateTie(request.server.db, id, player1_id, player2_id, player3_id)
			if (finalResult.player_2 != null) {
				console.log("Final is:", finalResult)
				return reply.code(200).send(finalResult)
			}
			console.log("Final is:", finalResult)
			if (finalResult.player_1 !== player1_id) {
				if (finalResult.player_1 === player2_id) {
					const temp = player1_id
					player1_id = player2_id
					player2_id = temp
				}
				else {
					const temp = player1_id
					player1_id = player3_id
					player3_id = temp
				}
			}
			console.log("player1_id", player1_id)
			console.log("player2_id", player2_id)
			console.log("player3_id", player3_id)
		}
		else {
			finalResult = {"player_1": player1_id, "player_2": null}
		}
		const scorerWinner = await topScorer(request.server.db, id, player2_id, player3_id);
		if (scorerWinner != null) {
			finalResult = {"player_1": player1_id, "player_2": scorerWinner}
			return reply.code(200).send(finalResult)
		}
		console.log("scorerWinner", scorerWinner)
		const bestDefenseWinner = await topDefense(request.server.db, id, player2_id, player3_id);
		if (bestDefenseWinner != null) {
			finalResult = {"player_1": player1_id, "player_2": bestDefenseWinner}
			return reply.code(200).send(finalResult)
		}
		console.log("bestDefenseWinner", bestDefenseWinner)
		
		const bestSpeedWinner = await topSpeed(request.server.db, id, player2_id, player3_id);
		finalResult = {"player_1": player1_id, "player_2": bestSpeedWinner}
		console.log("bestSpeedWinner", bestSpeedWinner)
		return reply.code(200).send(finalResult)
  } catch (error) {
		console.error(error)
    const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
    return reply.code(500).send(errorResponse)
  }
}

async function topScorer(
  db: FastifyInstance['db'],
  tournamentId: string,
  player1: string,
  player2: string
): Promise<string | null> {
  const topScorersQuery = `
    SELECT g.player AS player_id, COUNT(*) AS goals_scored
    FROM goal g JOIN matches m ON g.match_id = m.id
    WHERE m.tournament_id = ? AND m.active = FALSE AND g.player IN (?, ?)
    GROUP BY g.player
    ORDER BY goals_scored DESC
    LIMIT 2;
  `;
  const topScorers = await db.all(topScorersQuery, [tournamentId, player1, player2]) as Finalist[];
	console.log("topScorers", topScorers)
  if (topScorers[0].goals_scored !== topScorers[1].goals_scored) {
    return topScorers[0].player_id; // Return the ID of the higher scorer
  }
  return null;
}

async function topDefense(
  db: FastifyInstance['db'],
  tournamentId: string,
  player1: string,
  player2: string
): Promise<string | null> {
  const bestDefenseQuery = `
					SELECT
        p.player_id,
        COUNT(g.id) AS goals_conceded
    FROM
        (SELECT ? AS player_id UNION ALL SELECT ?) p -- Player 1, 2, 3 IDs
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
		const bestDefenseTiebreaker = await db.all(bestDefenseQuery, [player1, player2, tournamentId]) as Finalist[];
		console.log("bestDefenseTiebreaker", bestDefenseTiebreaker)
  if (bestDefenseTiebreaker[0].goals_conceded !== bestDefenseTiebreaker[1].goals_conceded) {
    return bestDefenseTiebreaker[0].player_id; // Return the ID of the higher scorer
  }
  return null;
}

async function topSpeed(
  db: FastifyInstance['db'],
  tournamentId: string,
  player1: string,
  player2: string
): Promise<string | null> {
  const goalDurationQuery = `
					SELECT g.player AS player_id, COALESCE(SUM(g.duration), 0) AS total_duration
					FROM goal g JOIN matches m ON g.match_id = m.id
					WHERE m.tournament_id = ? AND m.active = FALSE AND g.player IN (?, ?) -- Player 1 and 2
					GROUP BY g.player
					ORDER BY total_duration ASC
					LIMIT 2; -- Get the single highest duration between these two
					`;
	const goalDurationTiebreaker = await db.all(goalDurationQuery, [tournamentId, player1, player2]) as Finalist[];
	console.log("goalDurationTiebreaker", goalDurationTiebreaker)
	return goalDurationTiebreaker[0].player_id;
}

async function ultimateTie(
	db: FastifyInstance['db'],
	tournamentId: string,
	player1: string,
	player2: string,
	player3: string
): Promise<FinalResultObject> {
	const topScorersQuery = `
    SELECT g.player AS player_id, COUNT(*) AS goals_scored
    FROM goal g JOIN matches m ON g.match_id = m.id
    WHERE m.tournament_id = ? AND m.active = FALSE AND g.player IN (?, ?, ?)
    GROUP BY g.player
    ORDER BY goals_scored DESC
    LIMIT 3;
  `;
  const topScorers = await db.all(topScorersQuery, [tournamentId, player1, player2, player3]) as Finalist[];
	console.log(topScorers)
  if (topScorers[1].goals_scored !== topScorers[2].goals_scored) {
    return {"player_1": topScorers[0].player_id, "player_2": topScorers[1].player_id}; // Return the ID of the higher scorer
  }
	if (topScorers[0].goals_scored !== topScorers[1].goals_scored && topScorers[1].goals_scored == topScorers[2].goals_scored) {
		return {"player_1": topScorers[0].player_id, "player_2": null};
	}
	const topDefenseQuery = `
    SELECT
        p.player_id,
        COUNT(g.id) AS goals_conceded
    FROM
        (SELECT ? AS player_id UNION ALL SELECT ? AS player_id UNION ALL SELECT ?) p -- Player 1, 2, 3 IDs
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
	const topDefense = await db.all(topDefenseQuery, [player1, player2, player3, tournamentId]) as { player_id: string, goals_conceded: number }[]; // Added type
	console.log(topDefense)
	if (topDefense[1].goals_conceded !== topDefense[2].goals_conceded) {
		return {"player_1": topDefense[0].player_id, "player_2": topDefense[1].player_id};
	}
	if (topDefense[0].goals_conceded !== topDefense[1].goals_conceded && topDefense[1].goals_conceded == topDefense[2].goals_conceded) {
		return {"player_1": topDefense[0].player_id, "player_2": null};
	}
	const topSpeedQuery = `
		SELECT g.player AS player_id, COALESCE(SUM(g.duration), 0) AS total_duration
		FROM goal g JOIN matches m ON g.match_id = m.id
		WHERE m.tournament_id = ? AND m.active = FALSE AND g.player IN (?, ?, ?)
		GROUP BY g.player
		ORDER BY total_duration ASC
		LIMIT 3;
		`;
	const topSpeed = await db.all(topSpeedQuery, [tournamentId, player1, player2, player3]) as Finalist[];
	console.log(topSpeed)
	return {"player_1": topSpeed[0].player_id, "player_2": topSpeed[1].player_id};
}
