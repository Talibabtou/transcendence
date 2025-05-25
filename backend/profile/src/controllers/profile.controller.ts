import path from 'path';
import fs from 'node:fs';
import { IId } from '../shared/types/gateway.types.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { IReplyUser } from '../shared/types/auth.types.js';
import { ErrorResponse } from '../shared/types/error.type.js';
import { ErrorCodes } from '../shared/constants/error.const.js';
import { isValidId, sendError } from '../helper/profile.helper.js';
import { MatchHistory, PlayerMatchSummary } from '../shared/types/match.type.js';
import { IReplySummary, IReplyPic } from '../shared/types/profile.type.js';

/**
 * Retrieves the profile picture link for a given user ID.
 * If a picture exists, returns its link; otherwise, returns 'default'.
 *
 * @param request - FastifyRequest object containing the user ID in params.
 * @param reply - FastifyReply object used to send the response.
 * @returns 200 with picture link or 'default', 400 if invalid ID, 500 on error.
 */
export async function getPic(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply) {
  try {
    const id = request.params.id;
    if (!isValidId(id)) return sendError(reply, 400, ErrorCodes.BAD_REQUEST);
    const uploadDir = path.join(path.resolve(), process.env.UPLOADS_DIR || './uploads');
    const existingFile: string | undefined = fs.readdirSync(uploadDir).find((file) => file.startsWith(id));
    const link: IReplyPic = {
      link: 'default',
    };
    if (existingFile) link.link = `/uploads/${existingFile}`;
    return reply.code(200).send(link);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Fetches the match history for a given user ID from the match service.
 *
 * @param request - FastifyRequest object containing the user ID in params.
 * @param reply - FastifyReply object used to send the response.
 * @returns 200 with match history array, 400 if invalid ID, 500 on error.
 */
export async function getHistory(
  request: FastifyRequest<{ Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const id = request.params.id;
    if (!isValidId(id)) return sendError(reply, 400, ErrorCodes.BAD_REQUEST);
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8083/match/history/${id}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const responseData = (await response.json()) as MatchHistory[];
    return reply.code(200).send(responseData);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Aggregates and returns a summary of the user's profile, including username, match summary, and profile picture.
 * Fetches data from multiple services.
 *
 * @param request - FastifyRequest object containing the user ID in params.
 * @param reply - FastifyReply object used to send the response.
 * @returns 200 with summary, 400 if invalid ID, 404 if not found, 500 on error.
 */
export async function getSummary(
  request: FastifyRequest<{ Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const id = request.params.id;
    if (!isValidId(id)) return sendError(reply, 400, ErrorCodes.BAD_REQUEST);
    let reponseDataMatchSummary: PlayerMatchSummary | ErrorResponse = {} as PlayerMatchSummary;
    let reponseDataUser: IReplyUser | ErrorResponse = {} as IReplyUser;
    let reponseDataPic: IReplyPic | ErrorResponse = {} as IReplyPic;
    try {
      const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083/match/summary/${id}`;
      const response = await fetch(serviceUrl, { method: 'GET' });
      reponseDataMatchSummary = (await response.json()) as PlayerMatchSummary | ErrorResponse;
    } catch (err) {
      request.server.log.error(err);
    }
    try {
      const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8082/user/${id}`;
      const response = await fetch(serviceUrl, { method: 'GET' });
      reponseDataUser = (await response.json()) as IReplyUser | ErrorResponse;
    } catch (err) {
      request.server.log.error(err);
    }
    try {
      const serviceUrlPic = `http://${process.env.GAME_ADDR || 'localhost'}:8081/pics/${id}`;
      const responsePic = await fetch(serviceUrlPic, { method: 'GET' });
      reponseDataPic = (await responsePic.json()) as IReplyPic | ErrorResponse;
    } catch (err) {
      request.server.log.error(err);
    }
    if ('total_matches' in reponseDataMatchSummary) {
      const summary: IReplySummary = {
        username: 'username' in reponseDataUser ? reponseDataUser.username : 'undefined',
        id: 'id' in reponseDataUser ? reponseDataUser.id : 'undefined',
        summary: reponseDataMatchSummary,
        pics: 'link' in reponseDataPic ? reponseDataPic : { link: 'undefined' },
      };
      return reply.code(200).send(summary);
    } else return sendError(reply, 404, ErrorCodes.SUMMARY_NOT_FOUND);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Handles uploading a new profile picture for the current user.
 * Deletes any existing picture for the user before saving the new one.
 *
 * @param request - FastifyRequest object containing multipart file and user ID in params.
 * @param reply - FastifyReply object used to send the response.
 * @returns 201 on success, 404 if no file provided, 500 on error.
 */
export async function postPic(
  request: FastifyRequest<{ Body: FormData; Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const id = request.params.id;
    const file = await request.file();
    if (!file) return sendError(reply, 404, ErrorCodes.NO_FILE_PROVIDED);
    const uploadDir: string = process.env.UPLOADS_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    const existingFiles: string[] = fs.readdirSync(uploadDir).filter((f) => f.startsWith(id));
    if (existingFiles.length > 0) {
      existingFiles.forEach((file) => {
        const filePath: string = path.join(uploadDir, file);
        fs.unlinkSync(filePath);
      });
    }
    const ext: string = file.filename.substring(file.filename.lastIndexOf('.'));
    const filePath: string = path.join(uploadDir, `${id}${ext}`);
    const buffer: Buffer = await file.toBuffer();
    fs.promises.writeFile(filePath, buffer);
    const link: IReplyPic = {
      link: filePath,
    };
    return reply.code(201).send(link);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Deletes the profile picture for the current user.
 *
 * @param request - FastifyRequest object containing the user ID in params.
 * @param reply - FastifyReply object used to send the response.
 * @returns 204 on success, 400 if invalid ID, 404 if no picture found, 500 on error.
 */
export async function deletePic(
  request: FastifyRequest<{ Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const id = request.params.id;
    const uploadDir: string = process.env.UPLOADS_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    const existingFiles: string[] = fs.readdirSync(uploadDir).filter((file) => file.startsWith(id));
    if (existingFiles.length > 0) {
      existingFiles.forEach((file) => {
        const filePath = path.join(uploadDir, file);
        fs.unlinkSync(filePath);
      });
    } else return sendError(reply, 404, ErrorCodes.PICTURE_NOT_FOUND);
    return reply.code(204).send();
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}
