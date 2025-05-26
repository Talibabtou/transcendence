import { FastifyInstance } from 'fastify';
import { getTournament, getFinalMatches } from '../controllers/tournament.controller.js';

export default async function tournamentRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/tournament/:id', getTournament);
  
  fastify.get('/tournament/:id/final', getFinalMatches);
}