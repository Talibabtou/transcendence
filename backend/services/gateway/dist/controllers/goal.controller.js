import { ErrorCodes, createErrorResponse } from '../shared/constants/error.const.js';
export async function getGoals(request, reply) {
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
export async function getGoal(request, reply) {
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
export async function createGoal(request, reply) {
    try {
        const subpath = request.url.split('/game')[1];
        const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083${subpath}`;
        const response = await fetch(serviceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': request.headers['content-type'] || 'application/json',
            },
            body: JSON.stringify(request.body),
        });
        const responseData = (await response.json());
        return reply.code(response.status).send(responseData);
    }
    catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
