export async function getIdAuth(request, reply) {
    try {
        const subpath = request.url.split('/v1')[1];
        const serviceUrl = `http://localhost:8082${subpath}`;
        const response = await fetch(serviceUrl, {
            method: 'GET',
            headers: {
                'Authorization': request.headers.authorization || 'no token'
            },
        });
        const responseData = await response.json();
        return reply.code(response.status).send(responseData); // Response successfully obtained
    }
    catch (err) {
        console.error(err.message);
        return reply.code(500).send({ error: err.message }); // Internal server error
    }
}
export async function getAuth(request, reply) {
    try {
        const subpath = request.url.split('/v1')[1];
        const serviceUrl = `http://localhost:8082${subpath}`;
        const response = await fetch(serviceUrl, {
            method: 'GET',
            headers: {
                'Authorization': request.headers.authorization || 'no token'
            },
        });
        const responseData = await response.json();
        return reply.code(response.status).send(responseData); // Response successfully obtained
    }
    catch (err) {
        console.error(err.message);
        return reply.code(500).send({ error: err.message }); // Internal server error
    }
}
export async function postAuth(request, reply) {
    try {
        const subpath = request.url.split('/v1')[1];
        const serviceUrl = `http://localhost:8082${subpath}`;
        const response = await fetch(serviceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': request.headers.authorization || 'no token'
            },
            body: JSON.stringify(request.body)
        });
        const responseData = await response.json();
        return reply.code(response.status).send(responseData); // Response successfully obtained
    }
    catch (err) {
        console.error(err.message);
        return reply.code(500).send({ error: err.message }); // Internal server error
    }
}
export async function patchAuth(request, reply) {
    try {
        const subpath = request.url.split('/v1')[1];
        const serviceUrl = `http://localhost:8082${subpath}`;
        const response = await fetch(serviceUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': request.headers.authorization || 'no token'
            },
            body: JSON.stringify(request.body)
        });
        const responseData = await response.json();
        return reply.code(response.status).send(responseData); // Response successfully obtained
    }
    catch (err) {
        console.error(err.message);
        return reply.code(500).send({ error: err.message }); // Internal server error
    }
}
export async function deleteIdAuth(request, reply) {
    try {
        const subpath = request.url.split('/v1')[1];
        const serviceUrl = `http://localhost:8082${subpath}`;
        const response = await fetch(serviceUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': request.headers.authorization || 'no token'
            }
        });
        if (response.status == 204)
            return reply.code(response.status).send(); // Response successfully obtained
        const responseData = await response.json();
        return reply.code(response.status).send(responseData); // Failled
    }
    catch (err) {
        console.error(err.message);
        return reply.code(500).send({ error: err.message }); // Internal server error
    }
}
export async function postLogin(request, reply) {
    try {
        const subpath = request.url.split('/v1')[1];
        const serviceUrl = `http://localhost:8082${subpath}`;
        const response = await fetch(serviceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': request.headers.authorization || 'no token'
            },
            body: JSON.stringify(request.body)
        });
        const responseData = await response.json();
        return reply.code(response.status).send(responseData); // Response successfully obtained
    }
    catch (err) {
        console.error(err.message);
        return reply.code(500).send({ error: err.message }); // Internal server error
    }
}
