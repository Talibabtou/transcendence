import { ErrorCodes, createErrorResponse } from '../shared/constants/error.const.js';
function verifTypeFile(file) {
    const allowedExt = ['.jpg', '.jpeg', '.png'];
    const allowedMimeTypes = ['image/png', 'image/jpeg'];
    const ext = file.filename.substring(file.filename.lastIndexOf('.')).toLowerCase();
    if (!allowedMimeTypes.includes(file.mimetype) || !allowedExt.includes(ext)) {
        const verif = {
            valid: false,
            error: "Invalid file type or extension"
        };
        return verif;
    }
    const verif = { valid: true };
    return verif;
}
export async function upload(request, reply) {
    try {
        const subpath = request.url.split('/profil')[1];
        const serviceUrl = `http://localhost:8081${subpath}`;
        const file = await request.file();
        if (!file) {
            const errorMessage = createErrorResponse(404, ErrorCodes.NO_FILE_PROVIDED);
            return reply.code(404).send(errorMessage);
        }
        const verif = verifTypeFile(file);
        if (verif.valid === false) {
            const errorMessage = createErrorResponse(403, ErrorCodes.INVALID_TYPE);
            return reply.code(403).send(errorMessage);
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
        return reply.code(response.status).send(responseData);
    }
    catch (err) {
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
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
        if (response.status == 204)
            return reply.code(response.status).send();
        const responseData = await response.json();
        return reply.code(response.status).send(responseData);
    }
    catch (err) {
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
