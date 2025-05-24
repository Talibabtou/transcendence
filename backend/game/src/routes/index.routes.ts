import eloRoutes from './elo.routes.js';
import { FastifyInstance } from 'fastify';
import goalRoutes from './goal.routes.js';
import matchRoutes from './match.routes.js';
import tournamentRoutes from './tournament.routes.js';

export async function routes(server: FastifyInstance) {
  await server.register(eloRoutes);
  await server.register(goalRoutes);
  await server.register(matchRoutes);
  await server.register(tournamentRoutes);
}
