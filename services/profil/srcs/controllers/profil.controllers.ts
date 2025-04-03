import path from 'path';
import fs from 'node:fs';
import fastifyMultipart from '@fastify/multipart'
import { FastifyRequest, FastifyReply } from 'fastify';
import { createErrorResponse, ErrorCodes } from '../../../shared/constants/error.const.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string;
      username: string;
      role: string;
    };
  }
}

export async function deletePic(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
        const uploadDir: string = process.env.UPLOAD || './uploads';
        if (!fs.existsSync(uploadDir))
          fs.mkdirSync(uploadDir);
        const existingFiles: string[] = fs.readdirSync(uploadDir).filter(file => file.startsWith(request.user.id));
        if (existingFiles.length > 0) {
          existingFiles.forEach(file => {
            const filePath = path.join(uploadDir, file);
            fs.unlinkSync(filePath);
          })
        }
        else {
          const errorMessage = createErrorResponse(404, ErrorCodes.PICTURE_NOT_FOUND)
          return reply.code(404).send(errorMessage);
        }
        return reply.code(204).send();
      } catch (err: any) {
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
        return reply.code(500).send(errorMessage);
      }
}

export async function upload(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const file = await request.file() as fastifyMultipart.MultipartFile;
    if (!file) {
      const errorMessage = createErrorResponse(404, ErrorCodes.NO_FILE_PROVIDED)
      return reply.code(404).send(errorMessage);
    }
    const uploadDir: string = process.env.UPLOAD ||  './uploads';
    if (!fs.existsSync(uploadDir))
      fs.mkdirSync(uploadDir);
    const existingFiles: string[] = fs.readdirSync(uploadDir).filter(f => f.startsWith(request.user.id));
    if (existingFiles.length > 0) {
      existingFiles.forEach(file => {
        const filePath: string = path.join(uploadDir, file);
        fs.unlinkSync(filePath);
      })
    }
    const ext: string = file.filename.substring(file.filename.lastIndexOf('.'));
    const filePath: string = path.join(uploadDir, `${request.user.id}${ext}`);
    const buffer: Buffer = await file.toBuffer();
    fs.promises.writeFile(filePath, buffer);
    request.server.log.info(`File: ${file.filename} has been upload`);
    return reply.code(201).send();
  } catch (err: any) {
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
    return reply.code(500).send(errorMessage);
  }
}
