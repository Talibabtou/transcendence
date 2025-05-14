import { getElo, getElos, getLeaderboard } from '../controllers/elo.controller.js';
import { getEloSchema, getElosSchema, getLeaderboardSchema } from '../schemas/elo.schemas.js';
const auth = { auth: true, roles: ['user', 'admin'] };
export default async function eloRoutes(fastify) {
    fastify.get('/game/elos', {
        schema: {
            ...getElosSchema,
            tags: ['elos'],
        },
        config: auth,
    }, getElos);
    fastify.get('/game/elo/:id', {
        schema: {
            ...getEloSchema,
            tags: ['elos'],
        },
        config: auth,
    }, getElo);
    fastify.get('/game/leaderboard', {
        schema: {
            ...getLeaderboardSchema,
            tags: ['elos'],
        },
    }, getLeaderboard);
}
