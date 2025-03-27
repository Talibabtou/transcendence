import { FastifyRequest, FastifyReply } from "fastify";
import { ErrorCodes, createErrorResponse } from '../shared/constants/error.const.js'
import fs from "node:fs";
import path from "path";
import { Server } from '../server.js'
import { IGetPicResponse, IGetPicsResponse } from "../types/api.types.js";

export async function getPic(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply<{ Body: IGetPicResponse }>)
  {
  const id: string = request.params.id;
  const uploadDir = path.join(path.resolve(), "./srcs/shared/uploads");
  const existingFile: string | undefined = fs
    .readdirSync(uploadDir)
    .find((file) => file.startsWith(id));
  if (existingFile) {
    return reply.code(200).send({ link: `/uploads/${existingFile}` });
  } else {
    const errorMessage = createErrorResponse(404, ErrorCodes.PICTURE_NOT_FOUND)
    return reply.code(404).send(errorMessage);
  }
}

export async function getPics(
  request: FastifyRequest,
  reply: FastifyReply<{ Body: IGetPicsResponse }>) 
  {
  const uploadDir = path.join(path.resolve(), "./srcs/shared/uploads");
  const existingFiles: string[] | undefined = fs
    .readdirSync(uploadDir)
  if (existingFiles.length > 0) {
    const modifiedFiles = existingFiles.map(f => '/uploads/' + f);
    return reply.code(200).send({ links: modifiedFiles });
  } else {
    const errorMessage = createErrorResponse(404, ErrorCodes.PICTURE_NOT_FOUND)
    return reply.code(404).send(errorMessage);
  }
}

export async function checkMicroservicesHook(request: FastifyRequest, reply: FastifyReply) {
  if (request.url.includes('auth') && Server.microservices.get('auth') === false) {
    reply.code(503).send({
      success: false,
      message: 'Service Auth Unavailable'
    })
  } else if (request.url.includes('profil') && Server.microservices.get('profil') === false) {
    reply.code(503).send({
      success: false,
      message: 'Service Profil Unavailable'
    })
  }
}

export async function checkMicroservices() {
  try {
    const [authStatus, profilStatus] = await Promise.all([
      checkService(process.env.AUTH_PORT || '8082'),
      checkService(process.env.PROFIL_PORT || '8081')
    ]);

    Server.microservices.set('auth', authStatus);
    Server.microservices.set('profil', profilStatus);
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
  } catch (err: any) {
    return false;
  }
}

export async function getStatus(request: FastifyRequest, reply: FastifyReply) {
  const microservices = Object.fromEntries(Server.microservices);
  reply.code(200).send({ microservices });
}