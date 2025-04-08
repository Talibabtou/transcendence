import { ErrorCodes, createErrorResponse } from '../shared/constants/error.const.js';
export async function getFriends(request, reply) {
    try {
        const subpath = request.url.split('/friends')[1];
        const serviceUrl = `http://localhost:8084${subpath}`;
        const response = await fetch(serviceUrl, {
            method: 'GET',
            headers: {
                'Authorization': request.headers.authorization || 'no token'
            },
        });
        const friends = await response.json();
        return reply.code(response.status).send(friends);
    }
    catch (err) {
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
export async function postFriend(request, reply) {
    try {
        const subpath = request.url.split('/friends')[1];
        const serviceUrl = `http://localhost:8084${subpath}`;
        const response = await fetch(serviceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': request.headers['content-type'] || 'application/json',
                'Authorization': request.headers.authorization || 'no token',
            },
            body: JSON.stringify(request.body)
        });
        if (response.status >= 400) {
            const responseData = await response.json();
            return reply.code(response.status).send(responseData);
        }
        return reply.code(response.status).send();
    }
    catch (err) {
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
export async function patchFriend(request, reply) {
    try {
        const subpath = request.url.split('/friends')[1];
        const serviceUrl = `http://localhost:8084${subpath}`;
        const response = await fetch(serviceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': request.headers['content-type'] || 'application/json',
                'Authorization': request.headers.authorization || 'no token',
            },
            body: JSON.stringify(request.body)
        });
        if (response.status >= 400) {
            const responseData = await response.json();
            return reply.code(response.status).send(responseData);
        }
        return reply.code(response.status).send();
    }
    catch (err) {
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
export async function deleteFriend(request, reply) {
    try {
        const subpath = request.url.split('/friends')[1];
        const serviceUrl = `http://localhost:8084${subpath}`;
        const response = await fetch(serviceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': request.headers['content-type'] || 'application/json',
                'Authorization': request.headers.authorization || 'no token',
            },
            body: JSON.stringify(request.body)
        });
        if (response.status >= 400) {
            const responseData = await response.json();
            return reply.code(response.status).send(responseData);
        }
        return reply.code(response.status).send();
    }
    catch (err) {
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
