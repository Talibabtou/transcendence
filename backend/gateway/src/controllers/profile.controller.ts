import { FastifyJWT } from '../shared/types/auth.types.js';
import { MultipartFile } from '@fastify/multipart';
import { FastifyRequest, FastifyReply } from 'fastify';
import { sendError } from '../helper/friends.helper.js';
import { MatchHistory } from '../shared/types/match.type.js';
import { GetPageQuery } from '../shared/types/match.type.js';
import { ErrorResponse } from '../shared/types/error.type.js';
import { ErrorCodes } from '../shared/constants/error.const.js';
import { IUpload, IId, IReplyPic, IReplySummary } from '../shared/types/profile.type.js';

/**
 * Retrieves the profile picture for a user by ID.
 *
 * @param request - FastifyRequest object containing the user ID in params.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns profile picture (IReplyPic)
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function getPic(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply): Promise<void> {
  try {
    const subpath: string = request.url.split('/profile')[1];
    const serviceUrl: string = `http://${process.env.PROFILE_ADDR || 'localhost'}:${process.env.PROFILE_PORT || 8081}${subpath}`;
    const response: Response = await fetch(serviceUrl, { method: 'GET' });
    const responseData = (await response.json()) as IReplyPic | ErrorResponse;
    return reply.code(response.status).send(responseData);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Retrieves the match history for a user by ID, with optional pagination.
 *
 * @param request - FastifyRequest object containing the user ID in params and pagination in querystring.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns match history (MatchHistory[])
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function getHistory(
  request: FastifyRequest<{ Params: IId; Querystring: GetPageQuery }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const subpath: string = request.url.split('/profile')[1];
    const serviceUrl: string = `http://${process.env.PROFILE_ADDR || 'localhost'}:${process.env.PROFILE_PORT || 8081}${subpath}`;
    const response: Response = await fetch(serviceUrl, { method: 'GET' });
    const responseData = (await response.json()) as MatchHistory[] | ErrorResponse;
    return reply.code(response.status).send(responseData);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Retrieves the summary statistics for a user by ID.
 *
 * @param request - FastifyRequest object containing the user ID in params.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns summary (IReplySummary)
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function getSummary(
  request: FastifyRequest<{ Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const subpath: string = request.url.split('/profile')[1];
    const serviceUrl: string = `http://${process.env.PROFILE_ADDR || 'localhost'}:${process.env.PROFILE_PORT || 8081}${subpath}`;
    const response: Response = await fetch(serviceUrl, { method: 'GET' });
    const responseData = (await response.json()) as IReplySummary | ErrorResponse;
    return reply.code(response.status).send(responseData);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Verifies if the uploaded file is an allowed image type.
 *
 * @param file - MultipartFile object representing the uploaded file.
 * @returns boolean - True if the file type is valid, false otherwise.
 */
function verifTypeFile(file: MultipartFile): boolean {
  const allowedExt: string[] = ['.jpg', '.jpeg', '.png', '.gif'];
  const allowedMimeTypes: string[] = ['image/png', 'image/jpeg', 'image/gif'];
  const ext: string = file.filename.substring(file.filename.lastIndexOf('.')).toLowerCase();
  if (!allowedMimeTypes.includes(file.mimetype) || !allowedExt.includes(ext)) return false;
  return true;
}

/**
 * Uploads a new profile picture for the authenticated user.
 *
 * @param request - FastifyRequest object containing the file in body.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, picture uploaded
 *   403 - Invalid file type (ErrorCodes.INVALID_TYPE)
 *   404 - No file provided (ErrorCodes.NO_FILE_PROVIDED)
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function postPic(
  request: FastifyRequest<{ Body: IUpload }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const id: string = (request.user as FastifyJWT['user']).id;
    const subpath: string = request.url.split('/profile')[1];
    const serviceUrl: string = `http://${process.env.PROFILE_ADDR || 'localhost'}:${process.env.PROFILE_PORT || 8081}${subpath}/${id}`;
    const file: MultipartFile | undefined = await request.file();
    if (!file) return sendError(reply, 404, ErrorCodes.NO_FILE_PROVIDED);
    const verif = verifTypeFile(file);
    if (!verif) return sendError(reply, 401, ErrorCodes.INVALID_TYPE);
    const buffer: Buffer = await file.toBuffer();
    const formData: FormData = new FormData();
    formData.append('file', new Blob([buffer]), file.filename);
    const response: Response = await fetch(serviceUrl, {
      method: 'POST',
      body: formData,
    });
    const responseData = (await response.json()) as IReplyPic | ErrorResponse;
    return reply.code(response.status).send(responseData);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Deletes the profile picture for the authenticated user.
 *
 * @param request - FastifyRequest object (user must be authenticated).
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, picture deleted
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function deletePic(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const id: string = (request.user as FastifyJWT['user']).id;
    const subpath: string = request.url.split('/profile')[1];
    const serviceUrl: string = `http://${process.env.PROFILE_ADDR || 'localhost'}:${process.env.PROFILE_PORT || 8081}${subpath}/${id}`;
    const response: Response = await fetch(serviceUrl, { method: 'DELETE' });
    if (response.status >= 400) {
      const responseData = (await response.json()) as ErrorResponse;
      return reply.code(response.status).send(responseData);
    }
    return reply.code(response.status).send();
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}
