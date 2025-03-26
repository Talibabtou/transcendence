import { FastifyRequest, FastifyReply } from "fastify";
import { IGetId, IReply } from "../types/types.js";
import fs from "node:fs";
import path from "path";
import { Server } from '../server.js'

export async function getPic(request: FastifyRequest<{ Params: IGetId }>, reply: FastifyReply<{ Reply: IReply }>) {
  const id: string = request.params.id;
  const uploadDir = path.join(path.resolve(), "./srcs/shared/uploads");
  const existingFile: string | undefined = fs
    .readdirSync(uploadDir)
    .find((file) => file.startsWith(id));
  if (existingFile) {
    request.server.log.info(`Picture ${existingFile} found`);
    return reply.code(200).send({
      success: true,
      message: `Picture ${existingFile} found`,
      data: {
        dir: '/uploads',
        image: existingFile
      },
    });
  } else {
    request.server.log.error("Picture not found");
    return reply.code(404).send({
      success: false,
      message: "Picture not found",
    });
  }
}

export async function getPics(request: FastifyRequest, reply: FastifyReply<{ Reply: IReply }>) {
  const uploadDir = path.join(path.resolve(), "./srcs/shared/uploads");
  const existingFiles: string[] | undefined = fs
    .readdirSync(uploadDir)
  if (existingFiles) {
    request.server.log.info(`Pictures found`);
    return reply.code(200).send({
      success: true,
      message: 'Pictures found',
      data: {
        dir: '/uploads',
        images: existingFiles
      },
    });
  } else {
    request.server.log.error("Pictures not found");
    return reply.code(404).send({
      success: false,
      message: "Pictures not found",
    });
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
    Server.microservices.set('auth', await checkService(process.env.AUTH_PORT || '8082'));
    Server.microservices.set('profil', await checkService(process.env.PROFIL_PORT || '8081'));
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