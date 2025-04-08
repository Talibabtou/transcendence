import { ErrorCodes, createErrorResponse } from '../shared/constants/error.const.js';
export async function getUser(request, reply) {
    try {
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://localhost:8082${subpath}`;
        const response = await fetch(serviceUrl, {
            method: 'GET',
            headers: {
                'Authorization': request.headers.authorization || 'no token'
            },
        });
        const user = await response.json();
        return reply.code(response.status).send(user);
    }
    catch (err) {
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
export async function getUsers(request, reply) {
    try {
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://localhost:8082${subpath}`;
        const response = await fetch(serviceUrl, {
            method: 'GET',
            headers: {
                'Authorization': request.headers.authorization || 'no token'
            },
        });
        const users = await response.json();
        return reply.code(response.status).send(users);
    }
    catch (err) {
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
export async function postUser(request, reply) {
    try {
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://localhost:8082${subpath}`;
        const response = await fetch(serviceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': request.headers['content-type'] || 'application/json',
                'Authorization': request.headers.authorization || 'no token',
                'From': request.ip
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
export async function patchUser(request, reply) {
    try {
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://localhost:8082${subpath}`;
        const response = await fetch(serviceUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': request.headers['content-type'] || 'application/json',
                'Authorization': request.headers.authorization || 'no token'
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
export async function deleteUser(request, reply) {
    try {
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://localhost:8082${subpath}`;
        const response = await fetch(serviceUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': request.headers.authorization || 'no token'
            }
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
export async function postLogin(request, reply) {
    try {
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://localhost:8082${subpath}`;
        const response = await fetch(serviceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': request.headers['content-type'] || 'application/json',
                'Authorization': request.headers.authorization || 'no token',
                'From': request.ip
            },
            body: JSON.stringify(request.body)
        });
        const data = await response.json();
        return reply.code(response.status).send(data);
    }
    catch (err) {
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
