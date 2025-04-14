import path from 'path';
import fs from 'node:fs';
import { createErrorResponse, ErrorCodes } from '../shared/constants/error.const.js';
export async function upload(request, reply) {
    try {
        const id = request.params.id;
        const file = await request.file();
        if (!file) {
            const errorMessage = createErrorResponse(404, ErrorCodes.NO_FILE_PROVIDED);
            return reply.code(404).send(errorMessage);
        }
        const uploadDir = process.env.UPLOADS_DIR || './uploads';
        if (!fs.existsSync(uploadDir))
            fs.mkdirSync(uploadDir);
        const existingFiles = fs.readdirSync(uploadDir).filter(f => f.startsWith(id));
        if (existingFiles.length > 0) {
            existingFiles.forEach(file => {
                const filePath = path.join(uploadDir, file);
                fs.unlinkSync(filePath);
            });
        }
        const ext = file.filename.substring(file.filename.lastIndexOf('.'));
        const filePath = path.join(uploadDir, `${id}${ext}`);
        const buffer = await file.toBuffer();
        fs.promises.writeFile(filePath, buffer);
        return reply.code(201).send();
    }
    catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
export async function deletePic(request, reply) {
    try {
        const id = request.params.id;
        const uploadDir = process.env.UPLOADS_DIR || './uploads';
        if (!fs.existsSync(uploadDir))
            fs.mkdirSync(uploadDir);
        const existingFiles = fs.readdirSync(uploadDir).filter(file => file.startsWith(id));
        if (existingFiles.length > 0) {
            existingFiles.forEach(file => {
                const filePath = path.join(uploadDir, file);
                fs.unlinkSync(filePath);
            });
        }
        else {
            const errorMessage = createErrorResponse(404, ErrorCodes.PICTURE_NOT_FOUND);
            return reply.code(404).send(errorMessage);
        }
        return reply.code(204).send();
    }
    catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
