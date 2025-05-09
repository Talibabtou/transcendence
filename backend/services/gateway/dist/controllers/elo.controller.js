import { ErrorCodes, createErrorResponse } from '../shared/constants/error.const.js';
export async function getElos(request, reply) {
    try {
        const subpath = request.url.split('/game')[1];
        const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083${subpath}`;
        const response = await fetch(serviceUrl, { method: 'GET' });
        const reponseData = (await response.json());
        return reply.code(response.status).send(reponseData);
    }
    catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
export async function getElo(request, reply) {
    try {
        const subpath = request.url.split('/game')[1];
        const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083${subpath}`;
        const response = await fetch(serviceUrl, { method: 'GET' });
        const reponseData = (await response.json());
        return reply.code(response.status).send(reponseData);
    }
    catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
export async function getLeaderboard(request, reply) {
    try {
        const subpath = request.url.split('/game')[1];
        const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083${subpath}`;
        const response = await fetch(serviceUrl, { method: 'GET' });
        const reponseData = (await response.json());
        return reply.code(response.status).send(reponseData);
    }
    catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
export async function createElo(request, reply) {
    try {
        const id = request.user.id;
        const subpath = request.url.split('/game')[1];
        const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083${subpath}/${id}`;
        const response = await fetch(serviceUrl, { method: 'POST' });
        const responseData = (await response.json());
        return reply.code(response.status).send(responseData);
    }
    catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
