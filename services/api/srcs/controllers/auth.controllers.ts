import { FastifyRequest, FastifyReply } from 'fastify'

export async function getIdAuth(request: FastifyRequest, reply: FastifyReply) {
    try {
        const subpath = request.url.split('/v1')[1];
        const serviceUrl = `http://localhost:8082${subpath}`;
        const response = await fetch(serviceUrl, { method: 'GET' });
        const responseData: any = await response.json();
        return reply.code(response.status).send(responseData); // Response successfully obtained
      } catch (err: any) {
          console.error(err.message);
          return reply.code(500).send({ error: err.message }); // Internal server error
    }
 }

export async function getAuth(request: FastifyRequest, reply: FastifyReply) {
    try {
        const subpath = request.url.split('/v1')[1];
        const serviceUrl = `http://localhost:8082${subpath}`;
        const response = await fetch(serviceUrl);
        const responseData: any = await response.json();
        return reply.code(response.status).send(responseData); // Response successfully obtained
      } catch (err: any) {
          console.error(err.message);
          return reply.code(500).send({ error: err.message }); // Internal server error
    }
 }

 export async function postAuth(request: FastifyRequest, reply: FastifyReply) {
    try {
        const subpath = request.url.split('/v1')[1];
        const serviceUrl = `http://localhost:8082${subpath}`;
        const response = await fetch(serviceUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request.body)
        });
        const responseData: any = await response.json();
        return reply.code(response.status).send(responseData); // Response successfully obtained
      } catch (err: any) {
          console.error(err.message);
          return reply.code(500).send({ error: err.message }); // Internal server error
    }
 }

export async function putAuth(request: FastifyRequest, reply: FastifyReply) {
    try {
        const subpath = request.url.split('/v1')[1];
        const serviceUrl = `http://localhost:8082${subpath}`;
        const response = await fetch(serviceUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request.body)
        });
        const responseData: any = await response.json();
        return reply.code(response.status).send(responseData); // Response successfully obtained
      } catch (err: any) {
          console.error(err.message);
          return reply.code(500).send({ error: err.message }); // Internal server error
    }
 }

export async function deleteIdAuth(request: FastifyRequest, reply: FastifyReply) {
    try {
        const subpath = request.url.split('/v1')[1];
        const serviceUrl = `http://localhost:8082${subpath}`;
        const response = await fetch(serviceUrl, { method: 'DELETE' });
        return reply.code(response.status).send(); // Response successfully obtained
      } catch (err: any) {
        console.error(err.message);
        return reply.code(500).send({ error: err.message }); // Internal server error
    }
 }

export async function postLogin(request: FastifyRequest, reply: FastifyReply) {
    try {
        const subpath = request.url.split('/v1')[1];
        const serviceUrl = `http://localhost:8082${subpath}`;
        const response = await fetch(serviceUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request.body)
        });
        const responseData = await response.json();
        return reply.code(response.status).send(responseData); // Response successfully obtained
      } catch (err: any) {
          console.error(err.message);
          return reply.code(500).send({ error: err.message }); // Internal server error
    }
 }