import { getTournament, getTournaments, getFinalMatches } from '../controllers/tournament.controller.js';
import { getTournamentSchema, getFinalMatchesSchema, getTournamentsSchema, } from '../schemas/tournament.schema.js';
export default async function tournamentRoutes(fastify) {
    fastify.get('/game/tournament/:id', {
        schema: {
            ...getTournamentSchema,
            tags: ['tournaments'],
        },
    }, getTournament);
    fastify.get('/game/tournaments', {
        schema: {
            ...getTournamentsSchema,
            tags: ['tournaments'],
        },
    }, getTournaments);
    fastify.get('/game/tournament/:id/final', {
        schema: {
            ...getFinalMatchesSchema,
            tags: ['tournaments'],
        },
    }, getFinalMatches);
}
