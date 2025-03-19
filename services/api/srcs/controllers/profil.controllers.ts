import { FastifyRequest, FastifyReply } from 'fastify'
import { Readable } from 'stream';
import { IReply, IGetIdUser } from '../types/types.js'

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string;
      username: string;
      role: string;
    };
  }
}

export async function getPic(request: FastifyRequest<{ Params: IGetIdUser }>, reply: FastifyReply): Promise<void> {
  try {
    const subpath: string = request.url.split('/profil')[1];
    const serviceUrl: string = `http://localhost:8081${subpath}`;
    const response: Response = await fetch(serviceUrl, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.authorization || 'no token'
      },
    });
    if (!response.ok) {
      const errorData: any = await response.json();
      request.server.log.error("Error from auth service", errorData);
      return reply.code(response.status).send({
        success: false,
        message: errorData.message || 'Error from auth service'
      });
    }
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const jsonData = await response.json();
      return reply.code(response.status).send(jsonData);
    } else {
      const blob: Blob = await response.blob();
      request.server.log.info("Request GET successfully treated");
      return reply.code(response.status)
        .header('Content-Type', contentType)
        .send(blob);
    }
  } catch (err: any) {
      request.server.log.error("Internal server error", err);
      return reply.code(500).send({
        success: false,
        message: err.message
      });
  }
}

function verifTypeFile(file: any) {
  const allowedExt: string[] = [ '.jpg', '.jpeg', '.png' ];
  const allowedMimeTypes: string[] = [ 'image/png', 'image/jpeg' ];
  const ext: string = file.filename.substring(file.filename.lastIndexOf('.')).toLowerCase();
  if (!allowedMimeTypes.includes(file.mimetype) || !allowedExt.includes(ext)) {
    return { valid: false, error: "Invalid file type or extension" };
  }
  return { valid: true };
}

export async function upload(request: FastifyRequest, reply: FastifyReply<{ Reply: IReply }>): Promise<void> {
  try {
      const subpath: string = request.url.split('/profil')[1];
      const serviceUrl: string = `http://localhost:8081${subpath}`;
      const file: any = await request.file();
      if (!file) {
        request.server.log.error("No file provided");
        return reply.code(404).send({
          success: false,
          message: "No file provided"
        });
      }
      const verif: any = verifTypeFile(file);
      if (verif.valid === false) {
        request.server.log.error("Invalid file type or extension");
        return reply.code(403).send({
          success: false,
          message: "Invalid file type or extension"
        });
      }
      const buffer: Buffer = await file.toBuffer();
      const formData: FormData = new FormData();
      formData.append('file', new Blob([buffer]), file.filename);
      const response: Response = await fetch(serviceUrl, {
        method: 'POST',
        headers: {
          'Authorization': request.headers.authorization || 'no token'
        },
        body: formData
      });
      const responseData: any = await response.json();
      request.server.log.info(`Uploading file: ${file.filename}, size: ${file.fileSize}, mimetype: ${file.mimetype}`);
      return reply.code(response.status).send(responseData);
    } catch (err: any) {
        request.server.log.error("Internal server error", err);
        return reply.code(500).send({
          success: false,
          message: err.message
        });
  }
}

export async function deletePic(request: FastifyRequest, reply: FastifyReply<{ Reply: IReply }>): Promise<void> {
  try {
    const subpath: string = request.url.split('/profil')[1];
    const serviceUrl: string = `http://localhost:8081${subpath}`;
    const response: Response = await fetch(serviceUrl, {
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
    return reply.code(response.status).send({
      success: response.status < 400,
      message: "Request DELETE failled",
      option: {
        data: responseData
      }
    });
  } catch (err: any) {
    request.server.log.error("Internal server error", err);
    return reply.code(500).send({
      success: false,
      message: err.message
    });
  }
}