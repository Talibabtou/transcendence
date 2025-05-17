import eloRoutes from '../routes/elo.routes.js';
import goalRoutes from '../routes/goal.routes.js';
import authRoutes from '../routes/auth.routes.js';
import matchRoutes from '../routes/match.routes.js';
import profileRoutes from '../routes/profile.routes.js';
import gatewayRoutes from '../routes/gateway.routes.js';
import friendsRoutes from '../routes/friends.routes.js';
import tournamentRoutes from '../routes/tournament.routes.js';
import { API_PREFIX } from '../shared/constants/path.const.js';
export default async function routes(server) {
    await server.register(eloRoutes, { prefix: API_PREFIX });
    await server.register(gatewayRoutes, { prefix: API_PREFIX });
    await server.register(authRoutes, { prefix: API_PREFIX });
    await server.register(goalRoutes, { prefix: API_PREFIX });
    await server.register(matchRoutes, { prefix: API_PREFIX });
    await server.register(profileRoutes, { prefix: API_PREFIX });
    await server.register(friendsRoutes, { prefix: API_PREFIX });
    await server.register(tournamentRoutes, { prefix: API_PREFIX });
}
