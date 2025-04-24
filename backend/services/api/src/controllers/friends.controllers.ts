import { IId } from '../shared/types/api.types.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { FastifyJWT } from '../shared/plugins/jwtPlugin.js';
import { ErrorResponse } from '../shared/types/error.type.js';
import {
    ErrorCodes,
    createErrorResponse,
} from '../shared/constants/error.const.js';

export interface IReplyGetFriend {
    id: string;
    accepted: boolean;
    created_at: string;
}

export async function getFriends(
    request: FastifyRequest<{ Params: IId }>,
    reply: FastifyReply
) {
    try {
        const subpath = request.url.split('/friends')[1];
        const serviceUrl = `http://${process.env.FRIENDS_ADDR || 'localhost'}:8084${subpath}`;
        const response = await fetch(serviceUrl, { method: 'GET' });
        const friends = (await response.json()) as
            | IReplyGetFriend[]
            | ErrorResponse;
        return reply.code(response.status).send(friends);
    } catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(
            500,
            ErrorCodes.INTERNAL_ERROR
        );
        return reply.code(500).send(errorMessage);
    }
}

export async function getFriendsMe(
    request: FastifyRequest,
    reply: FastifyReply
) {
    try {
        const id: string = (request.user as FastifyJWT['user']).id;
        const subpath = request.url.split('/friends')[1];
        const serviceUrl = `http://${process.env.FRIENDS_ADDR || 'localhost'}:8084${subpath}/${id}`;
        const response = await fetch(serviceUrl, { method: 'GET' });
        const friends = (await response.json()) as
            | IReplyGetFriend[]
            | ErrorResponse;
        return reply.code(response.status).send(friends);
    } catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(
            500,
            ErrorCodes.INTERNAL_ERROR
        );
        return reply.code(500).send(errorMessage);
    }
}

export async function getFriend(
    request: FastifyRequest<{ Params: IId }>,
    reply: FastifyReply
) {
    try {
        const id: string = (request.user as FastifyJWT['user']).id;
        const subpath = request.url.split('/friends')[1];
        const serviceUrl = `http://${process.env.FRIENDS_ADDR || 'localhost'}:8084${subpath}?id=${id}`;
        const response = await fetch(serviceUrl, { method: 'GET' });
        if (response.status >= 400) {
            const responseData = (await response.json()) as ErrorResponse;
            return reply.code(response.status).send(responseData);
        }
        return reply.code(response.status).send();
    } catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(
            500,
            ErrorCodes.INTERNAL_ERROR
        );
        return reply.code(500).send(errorMessage);
    }
}

export async function postFriend(
    request: FastifyRequest<{ Body: IId }>,
    reply: FastifyReply
) {
    try {
        const id: string = (request.user as FastifyJWT['user']).id;
        const subpath = request.url.split('/friends')[1];
        const serviceUrl = `http://${process.env.FRIENDS_ADDR || 'localhost'}:8084${subpath}/${id}`;
        const response = await fetch(serviceUrl, {
            method: 'POST',
            headers: {
                'Content-Type':
                    request.headers['content-type'] || 'application/json',
            },
            body: JSON.stringify(request.body),
        });
        if (response.status >= 400) {
            const responseData = (await response.json()) as ErrorResponse;
            return reply.code(response.status).send(responseData);
        }
        return reply.code(response.status).send();
    } catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(
            500,
            ErrorCodes.INTERNAL_ERROR
        );
        return reply.code(500).send(errorMessage);
    }
}

export async function patchFriend(
    request: FastifyRequest<{ Body: IId }>,
    reply: FastifyReply
) {
    try {
        const id: string = (request.user as FastifyJWT['user']).id;
        const subpath = request.url.split('/friends')[1];
        const serviceUrl = `http://${process.env.FRIENDS_ADDR || 'localhost'}:8084${subpath}/${id}`;
        const response = await fetch(serviceUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type':
                    request.headers['content-type'] || 'application/json',
            },
            body: JSON.stringify(request.body),
        });
        if (response.status >= 400) {
            const responseData = (await response.json()) as ErrorResponse;
            return reply.code(response.status).send(responseData);
        }
        return reply.code(response.status).send();
    } catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(
            500,
            ErrorCodes.INTERNAL_ERROR
        );
        return reply.code(500).send(errorMessage);
    }
}

export async function deleteFriends(
    request: FastifyRequest,
    reply: FastifyReply
) {
    try {
        const id: string = (request.user as FastifyJWT['user']).id;
        const subpath = request.url.split('/friends')[1];
        const serviceUrl = `http://${process.env.FRIENDS_ADDR || 'localhost'}:8084${subpath}/${id}`;
        const response = await fetch(serviceUrl, { method: 'DELETE' });
        if (response.status >= 400) {
            const responseData = (await response.json()) as ErrorResponse;
            return reply.code(response.status).send(responseData);
        }
        return reply.code(response.status).send();
    } catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(
            500,
            ErrorCodes.INTERNAL_ERROR
        );
        return reply.code(500).send(errorMessage);
    }
}

export async function deleteFriend(
    request: FastifyRequest<{ Querystring: IId }>,
    reply: FastifyReply
) {
    try {
        const id: string = (request.user as FastifyJWT['user']).id;
        const subpath = request.url.split('/friends')[1];
        const serviceUrl = `http://${process.env.FRIENDS_ADDR || 'localhost'}:8084${subpath}/${id}`;
        const response = await fetch(serviceUrl, { method: 'DELETE' });
        if (response.status >= 400) {
            const responseData = (await response.json()) as ErrorResponse;
            return reply.code(response.status).send(responseData);
        }
        return reply.code(response.status).send();
    } catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(
            500,
            ErrorCodes.INTERNAL_ERROR
        );
        return reply.code(500).send(errorMessage);
    }
}
