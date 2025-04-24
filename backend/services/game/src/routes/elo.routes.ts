import { FastifyInstance } from 'fastify';
import { getElo, getElos, createElo, getLeaderboard } from '../controllers/elo.controller.js';
import { IId } from '../shared/types/elo.type.js';

export default async function eloRoutes(fastify: FastifyInstance) {
  fastify.get('/elo', getElos);

  fastify.post<{ Params: IId }>('/elo/:id', createElo);

  fastify.get('/elo/:id', getElo);

  fastify.get('/elo/leaderboard', getLeaderboard);
}
