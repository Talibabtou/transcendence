import { FastifyRequest, FastifyReply } from 'fastify';
import { ErrorCodes, createErrorResponse } from '../shared/constants/error.const.js';
import { Match } from '../shared/types/match.type.js';
import { updateEloRatings } from './elo.controller.js';
import {
  recordFastDatabaseMetrics,
  recordMediumDatabaseMetrics,
  goalDurationHistogram,
  matchDurationHistogram,
} from '../telemetry/metrics.js';

import { Goal, LongestGoal, CreateGoalRequest, GetGoalsQuery } from '../shared/types/goal.type.js';
import { Database } from 'sqlite';
import { IId } from '../shared/types/goal.type.js';

// Get a single goal by ID
export async function getGoal(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params;
  try {
    const startTime = performance.now(); // Start timer
    const goal = (await request.server.db.get('SELECT * FROM goal WHERE id = ?', [id])) as Goal | null;
    recordMediumDatabaseMetrics('SELECT', 'goal', performance.now() - startTime); // Record metric
    if (!goal) {
      const errorResponse = createErrorResponse(404, ErrorCodes.GOAL_NOT_FOUND);
      return reply.code(404).send(errorResponse);
    }
    return reply.code(200).send(goal);
  } catch (error) {
    if (error) {
      const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
      return reply.code(500).send(errorResponse);
    }
  }
}

// Get multiple goals with optional filters
export async function getGoals(
  request: FastifyRequest<{
    Querystring: GetGoalsQuery;
  }>,
  reply: FastifyReply
): Promise<void> {
  const { match_id, player, limit = 10, offset = 0 } = request.query;
  try {
    let query = 'SELECT * FROM goal WHERE 1=1';
    const params = [];

    if (match_id !== undefined) {
      query += ' AND match_id = ?';
      params.push(match_id);
    }

    if (player !== undefined) {
      query += ' AND player = ?';
      params.push(player);
    }

    query += ' ORDER BY created_at ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const startTime = performance.now(); // Start timer
    const goals = (await request.server.db.all(query, ...params)) as Goal[];
    recordMediumDatabaseMetrics('SELECT', 'goal', performance.now() - startTime); // Record metric
    return reply.code(200).send(goals);
  } catch (error) {
    if (error) {
      const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
      return reply.code(500).send(errorResponse);
    }
  }
}

// Create a new goal
export async function createGoal(
  request: FastifyRequest<{
    Body: CreateGoalRequest;
    Params: IId;
  }>,
  reply: FastifyReply
): Promise<void> {
  const player = request.params.id;
  const { match_id, duration } = request.body;
  try {
    const selectStartTime = performance.now(); // Timer for SELECT
    const match = (await request.server.db.get(
      'SELECT * FROM matches WHERE id = ?',
      match_id
    )) as Match | null;
    recordFastDatabaseMetrics('SELECT', 'matches', performance.now() - selectStartTime); // Record SELECT
    goalDurationHistogram.record(duration);
    if (!match) {
      const errorResponse = createErrorResponse(404, ErrorCodes.MATCH_NOT_FOUND);
      return reply.code(404).send(errorResponse);
    }
    if (!match.active) {
      const errorResponse = createErrorResponse(400, ErrorCodes.MATCH_NOT_ACTIVE);
      return reply.code(400).send(errorResponse);
    }

    // Verify player is part of the match
    if (match.player_1 !== player && match.player_2 !== player) {
      const errorResponse = createErrorResponse(400, ErrorCodes.PLAYER_NOT_IN_MATCH);
      return reply.code(400).send(errorResponse);
    }

    // Use db.get() with RETURNING * to get the inserted record directly
    const insertStartTime = performance.now(); // Timer for INSERT
    const newGoal = (await request.server.db.get(
      'INSERT INTO goal (match_id, player, duration) VALUES (?, ?, ?) RETURNING *',
      match_id,
      player,
      duration || null
    )) as Goal;
    recordMediumDatabaseMetrics('INSERT', 'goal', performance.now() - insertStartTime); // Record INSERT
    const startTime = performance.now(); // Start timer
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
    recordFastDatabaseMetrics('SELECT', 'goal', performance.now() - startTime); // Record metric
    if (maxGoals && maxGoals.max_goals == 3) {
      console.log(`Max goals reached (${maxGoals.max_goals}), triggering final goal`);
      try {
        await finalGoal(match, player, request.server.db);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith(ErrorCodes.ELO_NOT_FOUND)) {
          const errorResponse = createErrorResponse(404, ErrorCodes.ELO_NOT_FOUND);
          return reply.code(404).send(errorResponse);
        }
        throw error; // Rethrow if it's not our specific error
      }
    }
    // Return 201 Created for resource creation instead of default 200
    return reply.code(201).send(newGoal);
  } catch (error) {
    request.log.error({
      msg: 'Error in createGoal',
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

export async function longestGoal(
  request: FastifyRequest<{
    Params: { player_id: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const { player_id } = request.params;
  try {
    const startTime = performance.now(); // Start timer
    const goal = (await request.server.db.get(
      'SELECT duration FROM goal WHERE player = ? ORDER BY duration DESC LIMIT 1',
      [player_id]
    )) as LongestGoal | null;
    recordMediumDatabaseMetrics('SELECT', 'goal', performance.now() - startTime); // Record metric
    if (!goal) {
      const errorResponse = createErrorResponse(404, ErrorCodes.GOAL_NOT_FOUND);
      return reply.code(404).send(errorResponse);
    }
    return reply.code(200).send(goal);
  } catch (error) {
    if (error) {
      const errorResponse = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
      return reply.code(500).send(errorResponse);
    }
  }
}

async function finalGoal(match: Match, player: string, db: Database) {
  try {
    // Get match duration using SQLite's datetime functions directly
    // This ensures all time calculations happen in the database with consistent timezone
    let startTime = performance.now(); // Start timer
    const matchDurationResult = await db.get(
      `SELECT CAST((julianday('now') - julianday(created_at)) * 24 * 60 * 60 AS INTEGER) as duration_seconds 
       FROM matches WHERE id = ?`,
      [match.id]
    );
    recordFastDatabaseMetrics('SELECT', 'matches', performance.now() - startTime); // Record metric
    // Update match
    startTime = performance.now(); // Start timer
    await db.run(
      `UPDATE matches SET active = false, duration = ? WHERE id = ?`,
      matchDurationResult.duration_seconds,
      match.id
    );
    recordFastDatabaseMetrics('UPDATE', 'matches', performance.now() - startTime); // Record metric

    // Determine winner and loser
    const winner = match.player_1 === player ? match.player_1 : match.player_2;
    const loser = match.player_1 === player ? match.player_2 : match.player_1;

    // Update ELO ratings
    await updateEloRatings(db, winner, loser);

    matchDurationHistogram.record(matchDurationResult.duration_seconds);
  } catch (error) {
    // Check if it's our custom error
    if (error instanceof Error && error.message.startsWith(ErrorCodes.ELO_NOT_FOUND)) {
      const playerInfo = error.message.split(':')[1];
      throw new Error(`${ErrorCodes.ELO_NOT_FOUND}:${playerInfo}`);
    }
    throw error; // Rethrow for createGoal to handle
  }
}
