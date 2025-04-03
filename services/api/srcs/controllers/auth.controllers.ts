import { FastifyRequest, FastifyReply } from 'fastify';
import { ErrorResponse } from '../../../shared/types/error.type.js';
import { ErrorCodes, createErrorResponse } from '../../../shared/constants/error.const.js'
import { IAddUser, ILogin, IModifyUser, IReplyGetUser, IReplyGetUsers, IReplyLogin } from '../../../shared/types/auth.types.js';

export async function getUser(request: FastifyRequest<{ Params: { id: string }}>, reply: FastifyReply) {
    try {
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://localhost:8082${subpath}`;
        const response = await fetch(serviceUrl, {
          method: 'GET',
          headers: {
            'Authorization': request.headers.authorization || 'no token'
          },
        });
        const user = await response.json() as IReplyGetUser | ErrorResponse;
        return reply.code(response.status).send(user);
      } catch (err) {
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
 }

export async function getUsers(request: FastifyRequest, reply: FastifyReply) {
    try {
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://localhost:8082${subpath}`;
        const response = await fetch(serviceUrl, {
          method: 'GET',
          headers: {
            'Authorization': request.headers.authorization || 'no token'
          },
        });
        const users = await response.json() as IReplyGetUsers | ErrorResponse;
        return reply.code(response.status).send(users);
      } catch (err) {
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
 }

 export async function postUser(request: FastifyRequest<{ Body: IAddUser }>, reply: FastifyReply) {
    try {
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://localhost:8082${subpath}`;
        const response = await fetch(serviceUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': request.headers['content-type'] || 'application/json',
            'Authorization': request.headers.authorization || 'no token'
          },
          body: JSON.stringify(request.body)
        });
        const error = await response.json() as ErrorResponse | undefined;
        return reply.code(response.status).send(error);
      } catch (err) {
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
 }

export async function patchUser(request: FastifyRequest<{ Body: IModifyUser }>, reply: FastifyReply) {
    try {
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://localhost:8082${subpath}`;
        const response = await fetch(serviceUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': request.headers['content-type'] || 'application/json',
            'Authorization': request.headers.authorization || 'no token'
          },
          body: JSON.stringify(request.body)
        });
        const error = await response.json() as ErrorResponse | undefined;
        return reply.code(response.status).send(error);
      } catch (err) {
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
 }

export async function deleteUser(request: FastifyRequest, reply: FastifyReply) {
    try {
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://localhost:8082${subpath}`;
        const response = await fetch(serviceUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': request.headers.authorization || 'no token'
          }
        });
        if (response.status == 204)
          return reply.code(response.status).send();
        const error = await response.json() as ErrorResponse | undefined;
        return reply.code(response.status).send(error);
      } catch (err) {
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
 }

export async function postLogin(request: FastifyRequest<{ Body: ILogin }>, reply: FastifyReply) {
    try {
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://localhost:8082${subpath}`;
        const response = await fetch(serviceUrl, {
          method: 'POST',
          headers: {
            'Content-Type': request.headers['content-type'] || 'application/json',
            'Authorization': request.headers.authorization || 'no token'
          },
          body: JSON.stringify(request.body)
        });
        const data = await response.json() as IReplyLogin | ErrorResponse;
        return reply.code(response.status).send(data);
      } catch (err) {
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
 }