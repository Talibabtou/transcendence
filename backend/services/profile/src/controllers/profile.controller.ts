import path from 'path';
import fs from 'node:fs';
import { IId } from '../shared/types/gateway.types.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { IReplyPic } from '../shared/types/profile.type.js';
import { ErrorResponse } from '../shared/types/error.type.js';
import { PlayerMatchSummary } from '../shared/types/match.type.js';
import { createErrorResponse, ErrorCodes } from '../shared/constants/error.const.js';

export async function getPic(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply) {
  try {
    const id = request.params.id;
    const uploadDir = path.join(path.resolve(), process.env.UPLOADS_DIR || './uploads');
    const existingFile: string | undefined = fs.readdirSync(uploadDir).find((file) => file.startsWith(id));
    const link: IReplyPic = {
      link: `/uploads/${existingFile}`,
    }
    if (existingFile) {
      return reply.code(200).send(link);
    } else {
      const errorMessage = createErrorResponse(404, ErrorCodes.PICTURE_NOT_FOUND);
      return reply.code(404).send(errorMessage);
    }
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

export async function getSummary(
  request: FastifyRequest<{ Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const id = request.params.id;
    const serviceUrlMatchSummary = `http://${process.env.GAME_ADDR || 'localhost'}:8083/match/summary/${id}`;
    const responseMatchSummary = await fetch(serviceUrlMatchSummary, { method: 'GET' });
    const reponseDataMatchSummary = (await responseMatchSummary.json()) as PlayerMatchSummary | ErrorResponse;
    const serviceUrlUser = `http://${process.env.GAME_ADDR || 'localhost'}:8081/user/${id}`;
    const responseUser = await fetch(serviceUrlUser, { method: 'GET' });
    const reponseDataUser = (await responseUser.json()) as PlayerMatchSummary | ErrorResponse;
    const serviceUrlPic = `http://${process.env.GAME_ADDR || 'localhost'}:8084/pic/${id}`;
    const responsePic = await fetch(serviceUrlPic, { method: 'GET' });
    const reponseDataPic = (await responsePic.json()) as PlayerMatchSummary | ErrorResponse;
    console.log({
      summary: reponseDataMatchSummary,
      user: reponseDataUser,
      pic: reponseDataPic,
    });
    return reply.code(200).send();
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

export async function postPic(
  request: FastifyRequest<{ Body: FormData; Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const id = request.params.id;
    const file = await request.file();
    if (!file) {
      const errorMessage = createErrorResponse(404, ErrorCodes.NO_FILE_PROVIDED);
      return reply.code(404).send(errorMessage);
    }
    const uploadDir: string = process.env.UPLOADS_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    const existingFiles: string[] = fs.readdirSync(uploadDir).filter((f) => f.startsWith(id));
    if (existingFiles.length > 0) {
      existingFiles.forEach((file) => {
        const filePath: string = path.join(uploadDir, file);
        fs.unlinkSync(filePath);
      });
    }
    const ext: string = file.filename.substring(file.filename.lastIndexOf('.'));
    const filePath: string = path.join(uploadDir, `${id}${ext}`);
    const buffer: Buffer = await file.toBuffer();
    console.log({ path: filePath });
    fs.promises.writeFile(filePath, buffer);
    return reply.code(201).send();
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

export async function deletePic(
  request: FastifyRequest<{ Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const id = request.params.id;
    const uploadDir: string = process.env.UPLOADS_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    const existingFiles: string[] = fs.readdirSync(uploadDir).filter((file) => file.startsWith(id));
    if (existingFiles.length > 0) {
      existingFiles.forEach((file) => {
        const filePath = path.join(uploadDir, file);
        fs.unlinkSync(filePath);
      });
    } else {
      const errorMessage = createErrorResponse(404, ErrorCodes.PICTURE_NOT_FOUND);
      return reply.code(404).send(errorMessage);
    }
    return reply.code(204).send();
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}
