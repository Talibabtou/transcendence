import { FastifyInstance } from 'fastify';
import { getElo, createElo, getLeaderboard } from '../controllers/elo.controller.js';

export default async function eloRoutes(fastify: FastifyInstance) {
  fastify.post('/elo/:id', createElo);
  fastify.get('/elo/:id', getElo);
  fastify.get('/leaderboard', getLeaderboard);
}
