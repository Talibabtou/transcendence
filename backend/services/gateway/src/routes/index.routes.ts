import { FastifyInstance } from 'fastify';
import eloRoutes from './elo.routes.js';
import goalRoutes from './goal.routes.js';
import authRoutes from './auth.routes.js';
import matchRoutes from './match.routes.js';
import profileRoutes from './profile.routes.js';
import gatewayRoutes from './gateway.routes.js';
import friendsRoutes from './friends.routes.js';
import tournamentRoutes from './tournament.routes.js';
import { API_PREFIX } from '../shared/constants/path.const.js';

export default async function routes(server: FastifyInstance) {
  await server.register(eloRoutes, { prefix: API_PREFIX });
  await server.register(gatewayRoutes, { prefix: API_PREFIX });
  await server.register(authRoutes, { prefix: API_PREFIX });
  await server.register(goalRoutes, { prefix: API_PREFIX });
  await server.register(matchRoutes, { prefix: API_PREFIX });
  await server.register(profileRoutes, { prefix: API_PREFIX });
  await server.register(friendsRoutes, { prefix: API_PREFIX });
  await server.register(tournamentRoutes, { prefix: API_PREFIX });
}
