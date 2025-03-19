import { FastifyRequest, FastifyReply } from 'fastify';
import fs from 'node:fs';
import { IGetIdUser, IReply, IReplyBuffer } from '../types/profil.types.js';
import path from 'path';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string;
      username: string;
      role: string;
    };
  }
}

export async function getPic(request: FastifyRequest<{ Params: IGetIdUser }>, reply: FastifyReply): Promise<void> {
  try {
    const id = request.params.id;
    const uploadDir: string = process.env.UPLOAD ||  './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    const fileName: string | undefined = fs.readdirSync(uploadDir).find(f => f.startsWith(id));
    if (!fileName) {
      request.server.log.error("No picture found");
      return reply.code(404).send({
      success: false,
      message: "No picture found"
    });
    }
    const filePath = path.join(uploadDir, fileName);
    const file: Buffer = fs.readFileSync(filePath);
    const ext: string = fileName.substring(fileName.lastIndexOf('.'));
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg'
    const blob = new Blob([file], { type: mimeType });
    console.log({
      blob: blob
    })
    return reply.code(200).header('Content-Type', mimeType).send(blob);
  } catch (err: any) {
    request.server.log.error("Internal server error", err);
    return reply.code(500).send({
      success: false,
      message: err.message
    });
  }
}

export async function deletePic(request: FastifyRequest, reply: FastifyReply<{ Reply: IReply }>): Promise<void> {
    try {
        const uploadDir: string = process.env.UPLOAD ||  './uploads';
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir);
        }
        const existingFiles: string[] = fs.readdirSync(uploadDir).filter(file => file.startsWith(request.user.id));
        if (existingFiles.length > 0) {
          existingFiles.forEach(file => {
            const filePath = path.join(uploadDir, file);
            fs.unlinkSync(filePath);
          })
        }
        else {
          request.server.log.error("No picture found");
          return reply.code(404).send({
          success: false,
          message: "No picture found"
        });
        }
        return reply.code(204).send();
      } catch (err: any) {
        request.server.log.error("Internal server error", err);
        return reply.code(500).send({
          success: false,
          message: err.message
        });
      }
}

export async function upload(request: FastifyRequest, reply: FastifyReply<{ Reply: IReply }>): Promise<void> {
  try {
    const file: any = await request.file();
    if (!file) {
      request.server.log.error("No file provided");
      return reply.code(404).send({
        success: false,
        message: "No file provided"
      });
    }
    const uploadDir: string = process.env.UPLOAD ||  './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
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
    return reply.code(201).send({
      success: true,
      message: `File: ${file.filename} has been upload`
    });
  } catch (err: any) {
    request.server.log.error("Internal server error", err);
    return reply.code(500).send({
      success: false,
      message: err.message
    });
  }
}
