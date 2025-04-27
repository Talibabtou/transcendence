import { MultipartFile } from '@fastify/multipart';
import { FastifyRequest, FastifyReply } from 'fastify';
import { IUpload } from '../shared/types/profil.type.js';
import { FastifyJWT } from '../plugins/jwtPlugin.js';
import { ErrorResponse } from '../shared/types/error.type.js';
import { ErrorCodes, createErrorResponse } from '../shared/constants/error.const.js';

function verifTypeFile(file: MultipartFile): boolean {
  const allowedExt: string[] = ['.jpg', '.jpeg', '.png'];
  const allowedMimeTypes: string[] = ['image/png', 'image/jpeg'];
  const ext: string = file.filename.substring(file.filename.lastIndexOf('.')).toLowerCase();
  if (!allowedMimeTypes.includes(file.mimetype) || !allowedExt.includes(ext)) return false;
  return true;
}

export async function upload(
  request: FastifyRequest<{ Body: IUpload }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const id: string = (request.user as FastifyJWT['user']).id;
    const subpath: string = request.url.split('/profil')[1];
    const serviceUrl: string = `http://${process.env.PROFIL_ADDR || 'localhost'}:8081${subpath}/${id}`;
    const file: MultipartFile | undefined = await request.file();
    if (!file) {
      const errorMessage = createErrorResponse(404, ErrorCodes.NO_FILE_PROVIDED);
      return reply.code(404).send(errorMessage);
    }
    const verif = verifTypeFile(file);
    if (!verif) {
      const errorMessage = createErrorResponse(403, ErrorCodes.INVALID_TYPE);
      return reply.code(403).send(errorMessage);
    }
    const buffer: Buffer = await file.toBuffer();
    const formData: FormData = new FormData();
    formData.append('file', new Blob([buffer]), file.filename);
    const response: Response = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        Authorization: request.headers.authorization || 'no token',
      },
      body: formData,
    });
    if (response.status >= 400) {
      const responseData = (await response.json()) as ErrorResponse;
      return reply.code(response.status).send(responseData);
    }
    return reply.code(response.status).send();
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

export async function deletePic(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const id: string = (request.user as FastifyJWT['user']).id;
    const subpath: string = request.url.split('/profil')[1];
    const serviceUrl: string = `http://${process.env.PROFIL_ADDR || 'localhost'}:8081${subpath}/${id}`;
    const response: Response = await fetch(serviceUrl, {
      method: 'DELETE',
      headers: {
        Authorization: request.headers.authorization || 'no token',
      },
    });
    if (response.status >= 400) {
      const responseData = (await response.json()) as ErrorResponse;
      return reply.code(response.status).send(responseData);
    }
    return reply.code(response.status).send();
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}
