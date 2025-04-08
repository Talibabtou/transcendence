import path from "path";
import fs from "node:fs";
import { Server } from '../server.js'
import { FastifyRequest, FastifyReply } from "fastify";
import { createErrorResponse, ErrorCodes } from '../shared/constants/error.const.js';

export async function getPic(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  try {  const id: string = request.params.id;
    const uploadDir = path.join(path.resolve(), process.env.UPLOAD_DIR || "../../uploads");
    const existingFile: string | undefined = fs
      .readdirSync(uploadDir)
      .find((file) => file.startsWith(id));
    if (existingFile) {
      return reply.code(200).send({ link: `/uploads/${existingFile}` });
    } else {
      const errorMessage = createErrorResponse(404, ErrorCodes.PICTURE_NOT_FOUND)
      return reply.code(404).send(errorMessage);
    }
  } catch (err) {
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
    return reply.code(500).send(errorMessage);
  }
}

export async function getPics(request: FastifyRequest, reply: FastifyReply) {
  try {
    const uploadDir = path.join(path.resolve(), process.env.UPLOAD_DIR || "../../uploads");
    const existingFiles: string[] | undefined = fs
      .readdirSync(uploadDir)
    if (existingFiles.length > 0) {
      const modifiedFiles = existingFiles.map(f => '/uploads/' + f);
      return reply.code(200).send({ links: modifiedFiles });
    } else {
      const errorMessage = createErrorResponse(404, ErrorCodes.PICTURE_NOT_FOUND)
      return reply.code(404).send(errorMessage);
    }
  } catch (err) {
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
    return reply.code(500).send(errorMessage);
  }
}

export async function checkMicroservicesHook(request: FastifyRequest, reply: FastifyReply) {
  try { 
    if (request.url.includes('auth') && Server.microservices.get('auth') === false) {
      const errorMessage = createErrorResponse(503, ErrorCodes.SERVICE_UNAVAILABLE)
      return reply.code(503).send(errorMessage);
    } else if (request.url.includes('profil') && Server.microservices.get('profil') === false) {
      const errorMessage = createErrorResponse(503, ErrorCodes.SERVICE_UNAVAILABLE)
      return reply.code(503).send(errorMessage);
    } else if (request.url.includes('friends') && Server.microservices.get('friends') === false) {
      const errorMessage = createErrorResponse(503, ErrorCodes.SERVICE_UNAVAILABLE)
      return reply.code(503).send(errorMessage);
    }
  } catch (err) {
    console.error('Error microservices hook:', err);
  }
}

export async function checkMicroservices() {
  try {
    const [authStatus, profilStatus, friendsStatus] = await Promise.all([
      checkService(process.env.AUTH_PORT || '8082'),
      checkService(process.env.PROFIL_PORT || '8081'),
      checkService(process.env.FRIENDS_PORT || '8084')
    ]);

    Server.microservices.set('auth', authStatus);
    Server.microservices.set('profil', profilStatus);
    Server.microservices.set('friends', friendsStatus);
  } catch (err) {
    console.error('Error checking microservices:', err);
  }
}

async function checkService(servicePort: string): Promise<boolean> {
  try {
    const serviceUrl = `http://localhost:${servicePort}/check`;
    const response = await fetch(serviceUrl, {
      method: 'GET',
    });
    return response.ok;
  } catch (err) {
    return false;
  }
}

export async function getStatus(request: FastifyRequest, reply: FastifyReply) {
  const microservices = Object.fromEntries(Server.microservices);
  reply.code(200).send( microservices );
}