import path from "path";
import fs from "node:fs";
import { Server } from '../server.js'
import { FastifyRequest, FastifyReply } from "fastify";
import { createErrorResponse, ErrorCodes } from '../shared/constants/error.const.js';

export async function getPic(request: FastifyRequest<{ Params: { id: string }}>, reply: FastifyReply) {
  try { 
    const id = request.params.id;
    const uploadDir = path.join(path.resolve(), process.env.UPLOADS_DIR || "./uploads");
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
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
    return reply.code(500).send(errorMessage);
  }
}

export async function getPics(request: FastifyRequest, reply: FastifyReply) {
  try {
    const uploadDir = path.join(path.resolve(), process.env.UPLOADS_DIR || "./uploads");
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
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
    return reply.code(500).send(errorMessage);
  }
}

export async function checkMicroservicesHook(request: FastifyRequest, reply: FastifyReply) {
  try { 
    if (request.url.includes(process.env.AUTH_ADDR || 'auth') && Server.microservices.get('auth') === false) {
      const errorMessage = createErrorResponse(503, ErrorCodes.SERVICE_UNAVAILABLE)
      return reply.code(503).send(errorMessage);
    } else if (request.url.includes(process.env.PROFIL_ADDR || 'profil') && Server.microservices.get(process.env.PROFIL_ADDR || 'profil') === false) {
      const errorMessage = createErrorResponse(503, ErrorCodes.SERVICE_UNAVAILABLE)
      return reply.code(503).send(errorMessage);
    } else if (request.url.includes(process.env.FRIENDS_ADDR ||'friends') && Server.microservices.get(process.env.FRIENDS_ADDR ||'friends') === false) {
      const errorMessage = createErrorResponse(503, ErrorCodes.SERVICE_UNAVAILABLE)
      return reply.code(503).send(errorMessage);
    } else if (request.url.includes(process.env.GAME_ADDR ||'game') && Server.microservices.get(process.env.GAME_ADDR ||'game') === false) {
      const errorMessage = createErrorResponse(503, ErrorCodes.SERVICE_UNAVAILABLE)
      return reply.code(503).send(errorMessage);
    }
  } catch (err) {
    console.error('Error microservices hook:', err);
  }
}

export async function checkMicroservices() {
  try {
    const [profilStatus, authStatus, gameStatus, friendsStatus] = await Promise.all([
      checkService(process.env.PROFIL_ADDR || 'localhost', process.env.PROFIL_PORT || '8081'),
      checkService(process.env.AUTH_ADDR || 'localhost', process.env.AUTH_PORT || '8082'),
      checkService(process.env.GAME_ADDR || 'localhost', process.env.GAME_PORT || '8083'),
      checkService(process.env.FRIENDS_ADDR ||'localhost', process.env.FRIENDS_PORT || '8084')
    ]);

    Server.microservices.set(process.env.PROFIL_ADDR || 'profil', profilStatus);
    Server.microservices.set(process.env.AUTH_ADDR || 'auth', authStatus);
    Server.microservices.set(process.env.GAME_ADDR || 'game', gameStatus);
    Server.microservices.set(process.env.FRIENDS_ADDR ||'friends', friendsStatus);
  } catch (err) {
    console.error('Error checking microservices:', err);
  }
}

async function checkService(serviceName: string, servicePort: string): Promise<boolean> {
  try {
    const serviceUrl = `http://${serviceName}:${servicePort}/health`;
    const response = await fetch(serviceUrl, {
      method: 'GET',
    });
    return response.ok;
  } catch (err) {
    return false;
  }
}

export async function getHealth(request: FastifyRequest, reply: FastifyReply) {
  const microservices = Object.fromEntries(Server.microservices);
  reply.code(200).send( microservices );
}