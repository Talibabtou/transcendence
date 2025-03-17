import { FastifyMultipartAttachFieldsToBodyOptions, FastifyMultipartBaseOptions } from '@fastify/multipart';
import { FastifyRequest, FastifyReply } from 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string;
      username: string;
      role: string;
    };
  }
}

export async function getPic(request: FastifyRequest, reply: FastifyReply) {
  try {
      const subpath = request.url.split('/profil')[1];
      const serviceUrl = `http://localhost:8081${subpath}`;
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

export async function upload(request: FastifyRequest, reply: FastifyReply) {
  try {
      const subpath: string = request.url.split('/profil')[1];
      const serviceUrl: string = `http://localhost:8081${subpath}`;
      const file: any = await request.file();
      console.log({ mimetype: file.mimetype });
      if (!file) {
        request.server.log.error("No file provided");
        return reply.code(404).send({ error: "No file provided" });
      } else if (file.mimetype != 'image/png' && file.mimetype != 'image/jpeg') {
        request.server.log.error("Bad format, allow only png, jpg and jpeg");
        return reply.code(403).send({ error: "Bad format, allow only png, jpg and jpeg" });
      }
      const buffer = await file.toBuffer();
      const formData = new FormData();
      formData.append('file', new Blob([buffer]), file.filename);
      const response = await fetch(serviceUrl, {
        method: 'POST',
        headers: {
          'Authorization': request.headers.authorization || 'no token'
        },
        body: formData
      });
      const responseData: any = await response.json();
      request.server.log.info("Request GET successfully treated");
      return reply.code(response.status).send(responseData);
    } catch (err: any) {
        request.server.log.error("Internal server error", err);
        return reply.code(500).send({ error: err.message });
  }
}

export async function deletePic(request: FastifyRequest, reply: FastifyReply) {
  try {
      const subpath = request.url.split('/profil')[1];
      const serviceUrl = `http://localhost:8081${subpath}`;
      const response = await fetch(serviceUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': request.headers.authorization || 'no token'
        },
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