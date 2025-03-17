import { FastifyRequest, FastifyReply } from 'fastify';
import fs from 'node:fs';
import { IGetIdUser } from '../types/profil.types.js';
import { pipeline } from 'node:stream';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string;
      username: string;
      role: string;
    };
  }
}

export async function getPic(request: FastifyRequest<{ Params: IGetIdUser }>, reply: FastifyReply) {
    try {
      return reply.code(200).send({ message: "get Pic reached 200" });
    } catch (err: any) {
      return reply.code(500).send({ message: "get Pic reached 400" });
    }
}

export async function deletePic(request: FastifyRequest<{ Params: IGetIdUser }>, reply: FastifyReply) {
    try {
        return reply.code(204).send({ message: "delete Pic reached 200" });
      } catch (err: any) {
        return reply.code(500).send({ message: "delete Pic reached 400" });
      }
}

export async function upload(request: FastifyRequest<{ Params: IGetIdUser }>, reply: FastifyReply) {
  try {
    const file = await request.file();
    if (!file) {
      request.server.log.error("No file provided");
      return reply.code(404).send({ error: "No file provided" });
    }
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    const ext = file.filename.substring(file.filename.lastIndexOf('.'));
    const filePath = `${uploadDir}/${request.user.id}${ext}`;
    fs.readdirSync(uploadDir).forEach(file => {
      if (file.match(new RegExp(`^${request.user.id}(\\..*)?$`)))
        fs.unlinkSync(`${uploadDir}/${file}`);
    });
    fs.promises.writeFile(filePath, await file.toBuffer());
    request.server.log.info("File uploaded successfully");
    return reply.code(201).send({ message: "File uploaded successfully" });
  } catch (err: any) {
    request.server.log.error("Internal server error", err);
    return reply.code(500).send({ error: err.message });
  }
}
