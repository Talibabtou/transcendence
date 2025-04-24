import { IId } from '../shared/types/api.types.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { MatchGoals } from '../shared/types/goal.type.js';
import { ErrorResponse } from '../shared/types/error.type.js';
import {
    ErrorCodes,
    createErrorResponse,
} from '../shared/constants/error.const.js';
import {
    Match,
    PlayerMatchSummary,
    PlayerStats,
    GetMatchesQuery,
    CreateMatchRequest,
} from '../shared/types/match.type.js';

export async function getMatches(
    request: FastifyRequest<{ Querystring: GetMatchesQuery }>,
    reply: FastifyReply
) {
    try {
        const subpath = request.url.split('/v1')[1];
        const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083${subpath}`;
        const response = await fetch(serviceUrl, { method: 'GET' });
        const reponseData = (await response.json()) as Match[] | ErrorResponse;
        return reply.code(response.status).send(reponseData);
    } catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(
            500,
            ErrorCodes.INTERNAL_ERROR
        );
        return reply.code(500).send(errorMessage);
    }
}

export async function getMatch(
    request: FastifyRequest<{ Params: IId }>,
    reply: FastifyReply
) {
    try {
        const subpath = request.url.split('/v1')[1];
        const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083${subpath}`;
        const response = await fetch(serviceUrl, { method: 'GET' });
        const reponseData = (await response.json()) as
            | Match
            | null
            | ErrorResponse;
        return reply.code(response.status).send(reponseData);
    } catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(
            500,
            ErrorCodes.INTERNAL_ERROR
        );
        return reply.code(500).send(errorMessage);
    }
}

export async function matchTimeline(
    request: FastifyRequest<{ Params: IId }>,
    reply: FastifyReply
) {
    try {
        const subpath = request.url.split('/v1')[1];
        const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083${subpath}`;
        const response = await fetch(serviceUrl, { method: 'GET' });
        const reponseData = (await response.json()) as
            | MatchGoals[]
            | ErrorResponse;
        return reply.code(response.status).send(reponseData);
    } catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(
            500,
            ErrorCodes.INTERNAL_ERROR
        );
        return reply.code(500).send(errorMessage);
    }
}

export async function matchSummary(
    request: FastifyRequest<{ Params: IId }>,
    reply: FastifyReply
) {
    try {
        const subpath = request.url.split('/v1')[1];
        const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083${subpath}`;
        const response = await fetch(serviceUrl, { method: 'GET' });
        const reponseData = (await response.json()) as
            | PlayerMatchSummary
            | ErrorResponse;
        return reply.code(response.status).send(reponseData);
    } catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(
            500,
            ErrorCodes.INTERNAL_ERROR
        );
        return reply.code(500).send(errorMessage);
    }
}

export async function matchStats(
    request: FastifyRequest<{ Params: IId }>,
    reply: FastifyReply
) {
    try {
        const subpath = request.url.split('/v1')[1];
        const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083${subpath}`;
        const response = await fetch(serviceUrl, { method: 'GET' });
        const reponseData = (await response.json()) as
            | PlayerStats
            | ErrorResponse;
        return reply.code(response.status).send(reponseData);
    } catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(
            500,
            ErrorCodes.INTERNAL_ERROR
        );
        return reply.code(500).send(errorMessage);
    }
}

export async function createMatch(
    request: FastifyRequest<{ Body: CreateMatchRequest }>,
    reply: FastifyReply
) {
    try {
        const subpath = request.url.split('/v1')[1];
        const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083${subpath}`;
        const response = await fetch(serviceUrl, {
            method: 'POST',
            headers: {
                'Content-Type':
                    request.headers['content-type'] || 'application/json',
            },
            body: JSON.stringify(request.body),
        });
        const responseData = (await response.json()) as Match | ErrorResponse;
        return reply.code(response.status).send(responseData);
    } catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(
            500,
            ErrorCodes.INTERNAL_ERROR
        );
        return reply.code(500).send(errorMessage);
    }
}
