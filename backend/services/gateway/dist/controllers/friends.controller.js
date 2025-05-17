import { ErrorCodes, createErrorResponse } from '../shared/constants/error.const.js';
export async function getFriends(request, reply) {
    try {
        const subpath = request.url.split('/friends')[1];
        const serviceUrl = `http://${process.env.FRIENDS_ADDR || 'localhost'}:8084${subpath}`;
        const response = await fetch(serviceUrl, { method: 'GET' });
        const friends = (await response.json());
        return reply.code(response.status).send(friends);
    }
    catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
export async function getFriendsMe(request, reply) {
    try {
        const id = request.user.id;
        const subpath = request.url.split('/friends')[1];
        const serviceUrl = `http://${process.env.FRIENDS_ADDR || 'localhost'}:8084${subpath}/${id}`;
        const response = await fetch(serviceUrl, { method: 'GET' });
        const friends = (await response.json());
        return reply.code(response.status).send(friends);
    }
    catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
export async function getFriendStatus(request, reply) {
    try {
        // :id is the user to check if we are friend, query is my id
        const id = request.user.id;
        const subpath = request.url.split('/friends')[1];
        const serviceUrl = `http://${process.env.FRIENDS_ADDR || 'localhost'}:8084${subpath}?id=${id}`;
        const response = await fetch(serviceUrl, { method: 'GET' });
        const responseData = (await response.json());
        return reply.code(response.status).send(responseData);
    }
    catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
export async function postFriend(request, reply) {
    try {
        const id = request.user.id;
        const subpath = request.url.split('/friends')[1];
        const serviceUrl = `http://${process.env.FRIENDS_ADDR || 'localhost'}:8084${subpath}/${id}`;
        const response = await fetch(serviceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request.body),
        });
        if (response.status >= 400) {
            const responseData = (await response.json());
            return reply.code(response.status).send(responseData);
        }
        return reply.code(response.status).send();
    }
    catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
export async function patchFriend(request, reply) {
    try {
        console.log({ body: request.body });
        const id = request.user.id;
        const subpath = request.url.split('/friends')[1];
        const serviceUrl = `http://${process.env.FRIENDS_ADDR || 'localhost'}:8084${subpath}/${id}`;
        const response = await fetch(serviceUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request.body),
        });
        if (response.status >= 400) {
            const responseData = (await response.json());
            return reply.code(response.status).send(responseData);
        }
        return reply.code(response.status).send();
    }
    catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
export async function deleteFriends(request, reply) {
    try {
        const id = request.user.id;
        const subpath = request.url.split('/friends')[1];
        const serviceUrl = `http://${process.env.FRIENDS_ADDR || 'localhost'}:8084${subpath}/${id}`;
        const response = await fetch(serviceUrl, { method: 'DELETE' });
        if (response.status >= 400) {
            const responseData = (await response.json());
            return reply.code(response.status).send(responseData);
        }
        return reply.code(response.status).send();
    }
    catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
export async function deleteFriend(request, reply) {
    try {
        const id = request.user.id;
        const subpath = request.url.split('/friends')[1];
        const serviceUrl = `http://${process.env.FRIENDS_ADDR || 'localhost'}:8084${subpath}?id=${id}`;
        const response = await fetch(serviceUrl, { method: 'DELETE' });
        if (response.status >= 400) {
            const responseData = (await response.json());
            return reply.code(response.status).send(responseData);
        }
        return reply.code(response.status).send();
    }
    catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
