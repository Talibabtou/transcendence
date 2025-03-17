import { FastifyRequest, FastifyReply } from 'fastify'

export async function getUser(request: FastifyRequest, reply: FastifyReply) {
    try {
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://localhost:8082${subpath}`;
        const response = await fetch(serviceUrl, {
          method: 'GET',
          headers: {
            'Authorization': request.headers.authorization || 'no token'
          },
        });
        const responseData: any = await response.json();
        request.server.log.info("Request GET successfully treated");
        return reply.code(response.status).send(responseData);
      } catch (err: any) {
          request.server.log.error("Internal server error", err);
          return reply.code(500).send({ error: err.message });
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
        const responseData: any = await response.json();
        request.server.log.info("Request GET successfully treated");
        return reply.code(response.status).send(responseData);
      } catch (err: any) {
          request.server.log.error("Internal server error", err);
          return reply.code(500).send({ error: err.message });
    }
 }

 export async function postUser(request: FastifyRequest, reply: FastifyReply) {
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
        const responseData: any = await response.json();
        request.server.log.info("Request POST successfully treated");
        return reply.code(response.status).send(responseData);
      } catch (err: any) {
          request.server.log.error("Internal server error", err);
          return reply.code(500).send({ error: err.message });
    }
 }

export async function patchUser(request: FastifyRequest, reply: FastifyReply) {
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
        const responseData: any = await response.json();
        request.server.log.info("Request PATCH successfully treated");
        return reply.code(response.status).send(responseData);
      } catch (err: any) {
          request.server.log.error("Internal server error", err);
          return reply.code(500).send({ error: err.message });
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
        if (response.status == 204){
          request.server.log.info("Request DELETE successfully treated");
          return reply.code(response.status).send();
        }
        const responseData: any = await response.json();
        request.server.log.error("Request DELETE failled");
        return reply.code(response.status).send(responseData);
      } catch (err: any) {
        request.server.log.error("Internal server error", err);
        return reply.code(500).send({ error: err.message });
    }
 }

export async function postLogin(request: FastifyRequest, reply: FastifyReply) {
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
        const responseData = await response.json();
        request.server.log.info("Request POST successfully treated");
        return reply.code(response.status).send(responseData);
      } catch (err: any) {
          request.server.log.error("Internal server error", err);
          return reply.code(500).send({ error: err.message });
    }
 }