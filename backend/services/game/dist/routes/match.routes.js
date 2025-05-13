import { getMatch, getMatches, createMatch, matchTimeline, matchStats, matchSummary, } from '../controllers/match.controller.js';
export default async function matchRoutes(fastify) {
    fastify.get('/matches', getMatches);
    fastify.get('/match/:id', getMatch);
    fastify.post('/match', createMatch);
    fastify.get('/match/:id/stats', matchTimeline);
    fastify.get('/match/stats/:id', matchStats);
    fastify.get('/match/summary/:id', matchSummary);
}
