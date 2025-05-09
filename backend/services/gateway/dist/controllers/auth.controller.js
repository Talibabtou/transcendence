import { ErrorCodes, createErrorResponse } from '../shared/constants/error.const.js';
export async function getUsers(request, reply) {
    try {
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}`;
        const response = await fetch(serviceUrl, { method: 'GET' });
        const users = (await response.json());
        return reply.code(response.status).send(users);
    }
    catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
export async function getUser(request, reply) {
    try {
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}`;
        const response = await fetch(serviceUrl, { method: 'GET' });
        const user = (await response.json());
        return reply.code(response.status).send(user);
    }
    catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
export async function getUserMe(request, reply) {
    try {
        const id = request.user.id;
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}/${id}`;
        const response = await fetch(serviceUrl, { method: 'GET' });
        const user = (await response.json());
        return reply.code(response.status).send(user);
    }
    catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
export async function twofaGenerate(request, reply) {
    try {
        const id = request.user.id;
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}/${id}`;
        const response = await fetch(serviceUrl, { method: 'GET' });
        if (response.status != 204) {
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
export async function twofaValidate(request, reply) {
    try {
        const id = request.user.id;
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}/${id}`;
        const response = await fetch(serviceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request.body),
        });
        if (response.status == 200) {
            return reply.code(response.status).send();
        }
        const responseData = (await response.json());
        return reply.code(response.status).send(responseData);
    }
    catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
export async function postUser(request, reply) {
    try {
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}`;
        const response = await fetch(serviceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                From: request.ip,
            },
            body: JSON.stringify(request.body),
        });
        const user = (await response.json());
        return reply.code(response.status).send(user);
    }
    catch (err) {
        request.server.log.error(err);
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
export async function patchUser(request, reply) {
    try {
        const id = request.user.id;
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}/${id}`;
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
export async function twofaDisable(request, reply) {
    try {
        const id = request.user.id;
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}/${id}`;
        const response = await fetch(serviceUrl, { method: 'PATCH' });
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
export async function deleteUser(request, reply) {
    try {
        const id = request.user.id;
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}/${id}`;
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
export async function postLogout(request, reply) {
    try {
        const jwtId = request.user.jwtId;
        const id = request.user.id;
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}/${id}`;
        const response = await fetch(serviceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(jwtId),
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
export async function postLogin(request, reply) {
    try {
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}`;
        const response = await fetch(serviceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                From: request.ip,
            },
            body: JSON.stringify(request.body),
        });
        if (response.status === 204) {
            return reply.code(response.status).send();
        }
        const data = (await response.json());
        return reply.code(response.status).send(data);
    }
    catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
