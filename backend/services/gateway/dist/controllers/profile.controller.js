import { ErrorCodes, createErrorResponse } from '../shared/constants/error.const.js';
export async function getSummary(request, reply) {
    try {
        const id = request.params.id;
        const subpath = request.url.split('/profile')[1];
        const serviceUrl = `http://${process.env.PROFIL_ADDR || 'localhost'}:8081${subpath}/${id}`;
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
function verifTypeFile(file) {
    const allowedExt = ['.jpg', '.jpeg', '.png'];
    const allowedMimeTypes = ['image/png', 'image/jpeg'];
    const ext = file.filename.substring(file.filename.lastIndexOf('.')).toLowerCase();
    if (!allowedMimeTypes.includes(file.mimetype) || !allowedExt.includes(ext))
        return false;
    return true;
}
export async function postPic(request, reply) {
    try {
        const id = request.user.id;
        const subpath = request.url.split('/profile')[1];
        const serviceUrl = `http://${process.env.PROFIL_ADDR || 'localhost'}:8081${subpath}/${id}`;
        const file = await request.file();
        if (!file) {
            const errorMessage = createErrorResponse(404, ErrorCodes.NO_FILE_PROVIDED);
            return reply.code(404).send(errorMessage);
        }
        const verif = verifTypeFile(file);
        if (!verif) {
            const errorMessage = createErrorResponse(403, ErrorCodes.INVALID_TYPE);
            return reply.code(403).send(errorMessage);
        }
        const buffer = await file.toBuffer();
        const formData = new FormData();
        formData.append('file', new Blob([buffer]), file.filename);
        const response = await fetch(serviceUrl, {
            method: 'POST',
            body: formData,
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
export async function deletePic(request, reply) {
    try {
        const id = request.user.id;
        const subpath = request.url.split('/profile')[1];
        const serviceUrl = `http://${process.env.PROFIL_ADDR || 'localhost'}:8081${subpath}/${id}`;
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
