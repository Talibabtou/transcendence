import { MultipartFile } from '@fastify/multipart';
import { FastifyJWT } from '../plugins/jwtPlugin.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { ErrorResponse } from '../shared/types/error.type.js';
import { IUpload, IId, IReplyPic } from '../shared/types/profile.type.js';
import { ErrorCodes, createErrorResponse } from '../shared/constants/error.const.js';
import { MatchHistory } from '../shared/types/match.type.js';
import { GetPageQuery } from '../shared/types/match.type.js';

export async function getPic(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply): Promise<void> {
  try {
    const subpath: string = request.url.split('/profile')[1];
    const serviceUrl: string = `http://${process.env.PROFIL_ADDR || 'localhost'}:8081${subpath}`;
    const response: Response = await fetch(serviceUrl, { method: 'GET' });
    const responseData = (await response.json()) as IReplyPic | ErrorResponse;
    return reply.code(response.status).send(responseData);
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

export async function getHistory(
  request: FastifyRequest<{ Params: IId; Querystring: GetPageQuery }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const subpath: string = request.url.split('/profile')[1];
    const serviceUrl: string = `http://${process.env.PROFIL_ADDR || 'localhost'}:8081${subpath}`;
    const response: Response = await fetch(serviceUrl, { method: 'GET' });
    const responseData = (await response.json()) as MatchHistory[] | ErrorResponse;
    return reply.code(response.status).send(responseData);
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

export async function getSummary(
  request: FastifyRequest<{ Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const subpath: string = request.url.split('/profile')[1];
    const serviceUrl: string = `http://${process.env.PROFIL_ADDR || 'localhost'}:8081${subpath}`;
    const response: Response = await fetch(serviceUrl, { method: 'GET' });
    const responseData = (await response.json()) as ErrorResponse | unknown;
    return reply.code(response.status).send(responseData);
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

function verifTypeFile(file: MultipartFile): boolean {
  const allowedExt: string[] = ['.jpg', '.jpeg', '.png', '.gif'];
  const allowedMimeTypes: string[] = ['image/png', 'image/jpeg', 'image/gif'];
  const ext: string = file.filename.substring(file.filename.lastIndexOf('.')).toLowerCase();
  if (!allowedMimeTypes.includes(file.mimetype) || !allowedExt.includes(ext)) return false;
  return true;
}

export async function postPic(
  request: FastifyRequest<{ Body: IUpload }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const id: string = (request.user as FastifyJWT['user']).id;
    const subpath: string = request.url.split('/profile')[1];
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
    const subpath: string = request.url.split('/profile')[1];
    const serviceUrl: string = `http://${process.env.PROFIL_ADDR || 'localhost'}:8081${subpath}/${id}`;
    const response: Response = await fetch(serviceUrl, { method: 'DELETE' });
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
