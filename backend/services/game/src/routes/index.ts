import { FastifyInstance } from 'fastify';
import eloRoutes from '../routes/elo.routes.js';
import goalRoutes from '../routes/goal.routes.js';
import matchRoutes from '../routes/match.routes.js';
import systemRoutes from '../routes/system.routes.js';
import tournamentRoutes from '../routes/tournament.routes.js';

export async function routes(server: FastifyInstance) {
  await server.register(eloRoutes);
  await server.register(goalRoutes);
  await server.register(matchRoutes);
  await server.register(tournamentRoutes);
  await server.register(systemRoutes);
}
