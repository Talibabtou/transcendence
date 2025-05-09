import { getTournament, getTournaments, getFinalMatches } from '../controllers/tournament.controller.js';
export default async function tournamentRoutes(fastify) {
    fastify.get('/tournament/:id', getTournament);
    fastify.get('/tournaments', getTournaments);
    fastify.get('/tournament/:id/final', getFinalMatches);
}
