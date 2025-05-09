import { getMatch, getMatches, createMatch, matchTimeline, matchStats, matchSummary, } from '../controllers/match.controller.js';
import { getMatchSchema, getMatchesSchema, createMatchSchema, matchTimelineSchema, matchStatsSchema, matchSummarySchema, } from '../schemas/match.schemas.js';
const auth = { auth: true, roles: ['user', 'admin'] };
export default async function matchRoutes(fastify) {
    fastify.get('/game/matches', {
        schema: {
            ...getMatchesSchema,
            tags: ['matches'],
        },
        config: auth,
    }, getMatches);
    fastify.get('/game/match/:id', {
        schema: {
            ...getMatchSchema,
            tags: ['matches'],
        },
        config: auth,
    }, getMatch);
    fastify.get('/game/match/:id/stats', {
        schema: {
            ...matchTimelineSchema,
            tags: ['matches'],
        },
        config: auth,
    }, matchTimeline);
    fastify.get('/game/match/stats/:id', {
        schema: {
            ...matchStatsSchema,
            tags: ['matches'],
        },
        config: auth,
    }, matchStats);
    fastify.get('/game/match/summary/:id', {
        schema: {
            ...matchSummarySchema,
            tags: ['matches'],
        },
        config: auth,
    }, matchSummary);
    fastify.post('/game/match', {
        schema: {
            ...createMatchSchema,
            tags: ['matches'],
        },
        config: auth,
    }, createMatch);
}
