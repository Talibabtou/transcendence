import path from 'path';
import fs from 'node:fs';
import { IId } from '../shared/types/api.types.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { createErrorResponse, ErrorCodes } from '../shared/constants/error.const.js';

export async function upload(
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
