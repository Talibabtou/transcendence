import { FastifyRequest, FastifyReply } from 'fastify';
import { IUpload } from '../shared/types/profil.type.js'
import { MultipartFile } from '@fastify/multipart';
import { ErrorResponse } from '../shared/types/error.type.js';
import { ErrorCodes, createErrorResponse } from '../shared/constants/error.const.js'

declare module 'fastify' {
  interface FastifyJWT {
    user: {
      id: string;
      username: string;
      role: string | object | Buffer<ArrayBufferLike>;
    };
  }
}

interface IVerif {
  valid: boolean;
  error?: string;
}

function verifTypeFile(file: MultipartFile) {
  const allowedExt: string[] = [ '.jpg', '.jpeg', '.png' ];
  const allowedMimeTypes: string[] = [ 'image/png', 'image/jpeg' ];
  const ext: string = file.filename.substring(file.filename.lastIndexOf('.')).toLowerCase();
  if (!allowedMimeTypes.includes(file.mimetype) || !allowedExt.includes(ext)) {
    const verif: IVerif = {
      valid: false,
      error: "Invalid file type or extension"
    };
    return verif;
  }
  const verif: IVerif = { valid: true };
  return verif;
}

export async function upload(request: FastifyRequest<{ Body: IUpload }>, reply: FastifyReply): Promise<void> {
  try {
      const subpath: string = request.url.split('/profil')[1];
      const serviceUrl: string = `http://localhost:8081${subpath}`;
      const file: MultipartFile | undefined = await request.file();
      if (!file) {
        const errorMessage = createErrorResponse(404, ErrorCodes.NO_FILE_PROVIDED);
        return reply.code(404).send(errorMessage);
      }
      const verif = verifTypeFile(file);
      if (verif.valid === false) {
        const errorMessage = createErrorResponse(403, ErrorCodes.INVALID_TYPE);
        return reply.code(403).send(errorMessage);
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
      const responseData = await response.json() as ErrorResponse | null;
      return reply.code(response.status).send(responseData);
    } catch (err) {
      const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
      return reply.code(500).send(errorMessage);
  }
}

export async function deletePic(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const subpath: string = request.url.split('/profil')[1];
    const serviceUrl: string = `http://localhost:8081${subpath}`;
    const response: Response = await fetch(serviceUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': request.headers.authorization || 'no token'
      },
    });
    if (response.status == 204)
      return reply.code(response.status).send();
    const responseData = await response.json() as ErrorResponse | null;
    return reply.code(response.status).send(responseData);
  } catch (err) {
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}