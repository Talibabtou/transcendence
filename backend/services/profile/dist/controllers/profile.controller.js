import path from 'path';
import fs from 'node:fs';
import { createErrorResponse, ErrorCodes } from '../shared/constants/error.const.js';
export async function getPic(request, reply) {
    try {
        const id = request.params.id;
        const uploadDir = path.join(path.resolve(), process.env.UPLOADS_DIR || './uploads');
        const existingFile = fs.readdirSync(uploadDir).find((file) => file.startsWith(id));
        const link = {
            link: `/uploads/${existingFile}`,
        };
        if (existingFile) {
            return reply.code(200).send(link);
        }
        else {
            const errorMessage = createErrorResponse(404, ErrorCodes.PICTURE_NOT_FOUND);
            return reply.code(404).send(errorMessage);
        }
    }
    catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
export async function getSummary(request, reply) {
    try {
        const id = request.params.id;
        const serviceUrlMatchSummary = `http://${process.env.GAME_ADDR || 'localhost'}:8083/match/summary/${id}`;
        const responseMatchSummary = await fetch(serviceUrlMatchSummary, { method: 'GET' });
        const reponseDataMatchSummary = (await responseMatchSummary.json());
        const serviceUrlUser = `http://${process.env.GAME_ADDR || 'localhost'}:8082/user/${id}`;
        const responseUser = await fetch(serviceUrlUser, { method: 'GET' });
        const reponseDataUser = (await responseUser.json());
        const serviceUrlPic = `http://${process.env.GAME_ADDR || 'localhost'}:8081/pics/${id}`;
        const responsePic = await fetch(serviceUrlPic, { method: 'GET' });
        const reponseDataPic = (await responsePic.json());
        if ('total_matches' in reponseDataMatchSummary) {
            const summary = {
                username: 'username' in reponseDataUser ? reponseDataUser.username : 'undefined',
                id: 'id' in reponseDataUser ? reponseDataUser.id : 'undefined',
                summary: reponseDataMatchSummary,
                pics: 'link' in reponseDataPic ? reponseDataPic : { link: 'undefined' },
            };
            return reply.code(200).send(summary);
        }
        else {
            const errorMessage = createErrorResponse(404, ErrorCodes.SUMMARY_NOT_FOUND);
            return reply.code(404).send(errorMessage);
        }
    }
    catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
export async function postPic(request, reply) {
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
        const existingFiles = fs.readdirSync(uploadDir).filter((f) => f.startsWith(id));
        if (existingFiles.length > 0) {
            existingFiles.forEach((file) => {
                const filePath = path.join(uploadDir, file);
                fs.unlinkSync(filePath);
            });
        }
        const ext = file.filename.substring(file.filename.lastIndexOf('.'));
        const filePath = path.join(uploadDir, `${id}${ext}`);
        const buffer = await file.toBuffer();
        console.log({ path: filePath });
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
        const existingFiles = fs.readdirSync(uploadDir).filter((file) => file.startsWith(id));
        if (existingFiles.length > 0) {
            existingFiles.forEach((file) => {
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
