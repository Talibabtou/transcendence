import { FastifyRequest, FastifyReply } from "fastify";
import { IGetId, IReply } from "../types/types.js";
import { WebSocket } from "@fastify/websocket";
import fs from "node:fs";
import path from "path";

export async function getPic(
  request: FastifyRequest<{ Params: IGetId }>,
  reply: FastifyReply<{ Reply: IReply }>
) {
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

export async function getPics(
  request: FastifyRequest,
  reply: FastifyReply<{ Reply: IReply }>
) {
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

export async function webSocket(ws: WebSocket, request: FastifyRequest) {
  try {
    ws.on('message', (message: string) => {
      const { serviceName, type, date } = JSON.parse(message);
      if (type === 'heartbeat') {
        
      } else {
        
      }
      ws.on('close', (message: string) => {
        const { serviceName, type, date } = JSON.parse(message);
      })
    })
  } catch (err: any) {
      console.error({
        error: err.message
      })
  }
}
