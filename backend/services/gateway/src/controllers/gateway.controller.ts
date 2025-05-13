import path from 'path';
import fs from 'node:fs';
import { IId } from '../shared/types/gateway.types.js';
import { Server } from '../server.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { createErrorResponse, ErrorCodes } from '../shared/constants/error.const.js';

export async function checkMicroservicesHook(request: FastifyRequest, reply: FastifyReply) {
  try {
    if (
      request.url.includes(process.env.AUTH_ADDR || 'auth') &&
      (Server.microservices.get('auth') === false ||
        Server.microservices.get('game') === false ||
        Server.microservices.get('profile') === false ||
        Server.microservices.get('friends') === false)
    ) {
      const errorMessage = createErrorResponse(503, ErrorCodes.SERVICE_UNAVAILABLE);
      return reply.code(503).send(errorMessage);
    } else if (
      request.url.includes(process.env.PROFILE_ADDR || 'profile') &&
      (Server.microservices.get('auth') === false ||
        Server.microservices.get(process.env.PROFILE_ADDR || 'profile') === false)
    ) {
      const errorMessage = createErrorResponse(503, ErrorCodes.SERVICE_UNAVAILABLE);
      return reply.code(503).send(errorMessage);
    } else if (
      request.url.includes(process.env.FRIENDS_ADDR || 'friends') &&
      (Server.microservices.get('auth') === false ||
        Server.microservices.get(process.env.FRIENDS_ADDR || 'friends') === false)
    ) {
      const errorMessage = createErrorResponse(503, ErrorCodes.SERVICE_UNAVAILABLE);
      return reply.code(503).send(errorMessage);
    } else if (
      request.url.includes(process.env.GAME_ADDR || 'game') &&
      (Server.microservices.get('auth') === false ||
        Server.microservices.get(process.env.GAME_ADDR || 'game') === false)
    ) {
      const errorMessage = createErrorResponse(503, ErrorCodes.SERVICE_UNAVAILABLE);
      return reply.code(503).send(errorMessage);
    }
  } catch (err) {
    console.error('Error microservices hook:', err);
  }
}

export async function checkMicroservices() {
  try {
    const [profileStatus, authStatus, gameStatus, friendsStatus] = await Promise.all([
      checkService(process.env.PROFILE_ADDR || 'localhost', process.env.PROFILE_PORT || '8081'),
      checkService(process.env.AUTH_ADDR || 'localhost', process.env.AUTH_PORT || '8082'),
      checkService(process.env.GAME_ADDR || 'localhost', process.env.GAME_PORT || '8083'),
      checkService(process.env.FRIENDS_ADDR || 'localhost', process.env.FRIENDS_PORT || '8084'),
    ]);

    Server.microservices.set(process.env.PROFILE_ADDR || 'profile', profileStatus);
    Server.microservices.set(process.env.AUTH_ADDR || 'auth', authStatus);
    Server.microservices.set(process.env.GAME_ADDR || 'game', gameStatus);
    Server.microservices.set(process.env.FRIENDS_ADDR || 'friends', friendsStatus);
  } catch (err) {
    console.error('Error checking microservices:', err);
  }
}

async function checkService(serviceName: string, servicePort: string): Promise<boolean> {
  try {
    const serviceUrl = `http://${serviceName}:${servicePort}/health`;
    const response = await fetch(serviceUrl, {
      method: 'GET',
      headers: {
        'X-Suppress-Logger': 'true',
      },
    });
    return response.ok;
  } catch (err) {
    return false;
  }
}

export async function getHealth(request: FastifyRequest, reply: FastifyReply) {
  const microservices = Object.fromEntries(Server.microservices);
  reply.code(200).send(microservices);
}
