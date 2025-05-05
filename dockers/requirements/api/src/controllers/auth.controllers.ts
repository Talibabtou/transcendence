import { FastifyRequest, FastifyReply } from 'fastify';
import { ErrorResponse } from '../shared/types/error.type.js';
import { ErrorCodes, createErrorResponse } from '../shared/constants/error.const.js'
import { IAddUser, ILogin, IModifyUser, IReplyUser, IReplyLogin } from '../shared/types/auth.types.js';

export async function getUser(request: FastifyRequest<{ Params: { id: string }}>, reply: FastifyReply) {
    try {
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://auth:8082${subpath}`;
        const response = await fetch(serviceUrl, {
          method: 'GET',
          headers: {
            'Authorization': request.headers.authorization || 'no token'
          },
        });
        const user = await response.json() as IReplyUser | ErrorResponse;
        return reply.code(response.status).send(user);
      } catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
 }

export async function getUsers(request: FastifyRequest, reply: FastifyReply) {
    try {
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://auth:8082${subpath}`;
        const response = await fetch(serviceUrl, {
          method: 'GET',
          headers: {
            'Authorization': request.headers.authorization || 'no token'
          },
        });
        const users = await response.json() as IReplyUser[] | ErrorResponse;
        return reply.code(response.status).send(users);
      } catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
 }

 export async function postUser(request: FastifyRequest<{ Body: IAddUser }>, reply: FastifyReply) {
    try {
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://auth:8082${subpath}`;
        const response = await fetch(serviceUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': request.headers['content-type'] || 'application/json',
            'Authorization': request.headers.authorization || 'no token',
            'From': request.ip
          },
          body: JSON.stringify(request.body)

        });
        const user = await response.json() as IReplyUser[] | ErrorResponse;
        return reply.code(response.status).send(user);
      } catch (err) {
        request.server.log.error(err);
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
 }

export async function patchUser(request: FastifyRequest<{ Body: IModifyUser }>, reply: FastifyReply) {
    try {
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://auth:8082${subpath}`;
        const response = await fetch(serviceUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': request.headers['content-type'] || 'application/json',
            'Authorization': request.headers.authorization || 'no token'
          },
          body: JSON.stringify(request.body)
        });
        if (response.status >= 400) {
          const responseData = await response.json();
          return reply.code(response.status).send(responseData);
        }
        return reply.code(response.status).send();
      } catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
 }

export async function deleteUser(request: FastifyRequest, reply: FastifyReply) {
    try {
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://auth:8082${subpath}`;
        const response = await fetch(serviceUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': request.headers.authorization || 'no token'
          }
        });
        if (response.status >= 400) {
          const responseData = await response.json();
          return reply.code(response.status).send(responseData);
        }
        return reply.code(response.status).send();
      } catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
 }

export async function postLogin(request: FastifyRequest<{ Body: ILogin }>, reply: FastifyReply) {
    try {
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://auth:8082${subpath}`;
        const response = await fetch(serviceUrl, {
          method: 'POST',
          headers: {
            'Content-Type': request.headers['content-type'] || 'application/json',
            'Authorization': request.headers.authorization || 'no token',
            'From': request.ip
          },
          body: JSON.stringify(request.body)
        });
        const data = await response.json() as IReplyLogin | ErrorResponse;
        return reply.code(response.status).send(data);
      } catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
 }