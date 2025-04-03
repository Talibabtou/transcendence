import { ErrorCodes, createErrorResponse } from '../shared/constants/error.const.js';
function verifTypeFile(file) {
    const allowedExt = ['.jpg', '.jpeg', '.png'];
    const allowedMimeTypes = ['image/png', 'image/jpeg'];
    const ext = file.filename.substring(file.filename.lastIndexOf('.')).toLowerCase();
    if (!allowedMimeTypes.includes(file.mimetype) || !allowedExt.includes(ext)) {
        return { valid: false, error: "Invalid file type or extension" };
    }
    return { valid: true };
}
export async function upload(request, reply) {
    try {
        const subpath = request.url.split('/profil')[1];
        const serviceUrl = `http://localhost:8081${subpath}`;
        const file = await request.file();
        if (!file) {
            request.server.log.error("No file provided");
            return reply.code(404).send({
                success: false,
                message: "No file provided"
            });
        }
        const verif = verifTypeFile(file);
        if (verif.valid === false) {
            request.server.log.error("Invalid file type or extension");
            return reply.code(403).send({
                success: false,
                message: "Invalid file type or extension"
            });
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
        request.server.log.info(`Uploading file: ${file.filename}, size: ${file.fileSize}, mimetype: ${file.mimetype}`);
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
        if (response.status == 204) {
            request.server.log.info("Request DELETE successfully treated");
            return reply.code(response.status).send();
        }
        const responseData = await response.json();
        request.server.log.error("Request DELETE failled");
        return reply.code(response.status).send({
            success: response.status < 400,
            message: "Request DELETE failled",
            data: {
                data: responseData
            }
        });
    }
    catch (err) {
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
