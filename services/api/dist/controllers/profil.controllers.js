export async function getPic(request, reply) {
    try {
        const subpath = request.url.split('/profil')[1];
        const serviceUrl = `http://localhost:8081${subpath}`;
        const response = await fetch(serviceUrl, {
            method: 'GET',
            headers: {
                'Authorization': request.headers.authorization || 'no token'
            },
        });
        const responseData = await response.json();
        request.server.log.info("Request GET successfully treated");
        return reply.code(response.status).send(responseData);
    }
    catch (err) {
        request.server.log.error("Internal server error", err);
        return reply.code(500).send({ error: err.message });
    }
}
export async function upload(request, reply) {
    try {
        const subpath = request.url.split('/profil')[1];
        const serviceUrl = `http://localhost:8081${subpath}`;
        const file = await request.file();
        console.log({ mimetype: file.mimetype });
        if (!file) {
            return reply.code(404).send({ error: "No file found" });
        }
        else if (file.mimetype != 'image/png' && file.mimetype != 'image/jpeg') {
            return reply.code(403).send({ error: "Bad format, allow only png, jpg and jpeg" });
        }
        const buffer = await file.toBuffer();
        const formData = new FormData();
        formData.append('file', new Blob([buffer]), file.filename);
        const response = await fetch(serviceUrl, {
            method: 'POST',
            headers: {
                'Authorization': request.headers.authorization || 'no token'
            },
            body: formData
        });
        const responseData = await response.json();
        request.server.log.info("Request GET successfully treated");
        return reply.code(response.status).send(responseData);
    }
    catch (err) {
        request.server.log.error("Internal server error", err);
        return reply.code(500).send({ error: err.message });
    }
}
export async function deletePic(request, reply) {
    try {
        const subpath = request.url.split('/profil')[1];
        const serviceUrl = `http://localhost:8081${subpath}`;
        const response = await fetch(serviceUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': request.headers.authorization || 'no token'
            },
        });
        if (response.status == 204) {
            request.server.log.info("Request DELETE successfully treated");
            return reply.code(response.status).send();
        }
        const responseData = await response.json();
        request.server.log.error("Request DELETE failled");
        return reply.code(response.status).send(responseData);
    }
    catch (err) {
        request.server.log.error("Internal server error", err);
        return reply.code(500).send({ error: err.message });
    }
}
