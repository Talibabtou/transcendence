import { FastifyRequest, FastifyReply } from 'fastify';
import { ErrorCodes, createErrorResponse } from '../shared/constants/error.const.js'
import {  } from '../shared/types/auth.types.js';

export async function getFriends(request: FastifyRequest, reply: FastifyReply) {
    try {
        const subpath = request.url.split('/friends')[1];
        const serviceUrl = `http://localhost:8084${subpath}`;
        const response = await fetch(serviceUrl, {
          method: 'GET',
          headers: {
            'Authorization': request.headers.authorization || 'no token'
          },
        });
        const friends = await response.json();
        return reply.code(response.status).send(friends);
      } catch (err) {
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
 }

 export async function getFriend(request: FastifyRequest, reply: FastifyReply) {
  try {
      const subpath = request.url.split('/friends')[1];
      const serviceUrl = `http://localhost:8084${subpath}`;
      const response = await fetch(serviceUrl, {
        method: 'GET',
        headers: {
          'Content-Type': request.headers['content-type'] || 'application/json',
          'Authorization': request.headers.authorization || 'no token'
        },
        body: JSON.stringify(request.body)
      });
      const friend = await response.json();
      return reply.code(response.status).send(friend);
    } catch (err) {
      const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
      return reply.code(500).send(errorMessage);
  }
}

 export async function postFriend(request: FastifyRequest, reply: FastifyReply) {
    try {
        const subpath = request.url.split('/friends')[1];
        const serviceUrl = `http://localhost:8084${subpath}`;
        const response = await fetch(serviceUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': request.headers['content-type'] || 'application/json',
            'Authorization': request.headers.authorization || 'no token',
          },
          body: JSON.stringify(request.body)
        });
        if (response.status >= 400) {
          const responseData = await response.json();
          return reply.code(response.status).send(responseData);
        }
        return reply.code(response.status).send();
      } catch (err) {
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
 }

 export async function patchFriend(request: FastifyRequest, reply: FastifyReply) {
  try {
      const subpath = request.url.split('/friends')[1];
      const serviceUrl = `http://localhost:8084${subpath}`;
      const response = await fetch(serviceUrl, {
        method: 'PATCH',
        headers: { 
          'Content-Type': request.headers['content-type'] || 'application/json',
          'Authorization': request.headers.authorization || 'no token',
        },
        body: JSON.stringify(request.body)
      });
      if (response.status >= 400) {
        const responseData = await response.json();
        return reply.code(response.status).send(responseData);
      }
      return reply.code(response.status).send();
    } catch (err) {
      const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
      return reply.code(500).send(errorMessage);
  }
}

export async function deleteFriend(request: FastifyRequest, reply: FastifyReply) {
  try {
      const subpath = request.url.split('/friends')[1];
      const serviceUrl = `http://localhost:8084${subpath}`;
      const response = await fetch(serviceUrl, {
        method: 'DELETE',
        headers: { 
          'Authorization': request.headers.authorization || 'no token',
        }
      });
      if (response.status >= 400) {
        const responseData = await response.json();
        return reply.code(response.status).send(responseData);
      }
      return reply.code(response.status).send();
    } catch (err) {
      const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
      return reply.code(500).send(errorMessage);
  }
}

export async function deleteFriends(request: FastifyRequest, reply: FastifyReply) {
  try {
      const subpath = request.url.split('/friends')[1];
      const serviceUrl = `http://localhost:8084${subpath}`;
      const response = await fetch(serviceUrl, {
        method: 'DELETE',
        headers: { 
          'Authorization': request.headers.authorization || 'no token',
        }
      });
      if (response.status >= 400) {
        const responseData = await response.json();
        return reply.code(response.status).send(responseData);
      }
      return reply.code(response.status).send();
    } catch (err) {
      const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
      return reply.code(500).send(errorMessage);
  }
}
