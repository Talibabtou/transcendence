import path from 'path';
import fs from 'node:fs';
import { IId } from '../shared/types/gateway.types.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { IReplyUser } from '../shared/types/auth.types.js';
import { ErrorResponse } from '../shared/types/error.type.js';
import { MatchHistory, PlayerMatchSummary } from '../shared/types/match.type.js';
import { IReplySummary, IReplyPic } from '../shared/types/profile.type.js';
import { createErrorResponse, ErrorCodes } from '../shared/constants/error.const.js';

/**
 * Retrieves the profile picture link for a given user ID.
 * If a picture exists, returns its link; otherwise, returns 'default'.
 * @param request Fastify request with user ID in params
 * @param reply Fastify reply instance
 * @returns 200 with picture link or 'default', 500 on error
 */
export async function getPic(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply) {
  try {
    const id = request.params.id;
    const uploadDir = path.join(path.resolve(), process.env.UPLOADS_DIR || './uploads');
    const existingFile: string | undefined = fs.readdirSync(uploadDir).find((file) => file.startsWith(id));
    if (existingFile) {
      const link: IReplyPic = {
        link: `/uploads/${existingFile}`,
      };
      return reply.code(200).send(link);
    } else {
      const link: IReplyPic = {
        link: 'default',
      };
      return reply.code(200).send(link);
    }
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

/**
 * Fetches the match history for a given user ID from the match service.
 * @param request Fastify request with user ID in params
 * @param reply Fastify reply instance
 * @returns 200 with match history array, 500 on error
 */
export async function getHistory(
  request: FastifyRequest<{ Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const id = request.params.id;
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8083/match/history/${id}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const responseData = (await response.json()) as MatchHistory[];
    return reply.code(200).send(responseData);
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

/**
 * Aggregates and returns a summary of the user's profile, including username, match summary, and profile picture.
 * Fetches data from multiple services.
 * @param request Fastify request with user ID in params
 * @param reply Fastify reply instance
 * @returns 200 with summary, 404 if not found, 500 on error
 */
export async function getSummary(
  request: FastifyRequest<{ Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const id = request.params.id;
    const serviceUrlMatchSummary = `http://${process.env.GAME_ADDR || 'localhost'}:8083/match/summary/${id}`;
    const responseMatchSummary = await fetch(serviceUrlMatchSummary, { method: 'GET' });
    const reponseDataMatchSummary = (await responseMatchSummary.json()) as PlayerMatchSummary | ErrorResponse;
    const serviceUrlUser = `http://${process.env.GAME_ADDR || 'localhost'}:8082/user/${id}`;
    const responseUser = await fetch(serviceUrlUser, { method: 'GET' });
    const reponseDataUser = (await responseUser.json()) as IReplyUser | ErrorResponse;
    const serviceUrlPic = `http://${process.env.GAME_ADDR || 'localhost'}:8081/pics/${id}`;
    const responsePic = await fetch(serviceUrlPic, { method: 'GET' });
    const reponseDataPic = (await responsePic.json()) as IReplyPic | ErrorResponse;
    if ('total_matches' in reponseDataMatchSummary) {
      const summary: IReplySummary = {
        username: 'username' in reponseDataUser ? reponseDataUser.username : 'undefined',
        id: 'id' in reponseDataUser ? reponseDataUser.id : 'undefined',
        summary: reponseDataMatchSummary,
        pics: 'link' in reponseDataPic ? reponseDataPic : { link: 'undefined' },
      };
      return reply.code(200).send(summary);
    } else {
      const errorMessage = createErrorResponse(404, ErrorCodes.SUMMARY_NOT_FOUND);
      return reply.code(404).send(errorMessage);
    }
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

/**
 * Handles uploading a new profile picture for a user.
 * Deletes any existing picture for the user before saving the new one.
 * @param request Fastify request with multipart file and user ID in params
 * @param reply Fastify reply instance
 * @returns 201 on success, 404 if no file provided, 500 on error
 */
export async function postPic(
  request: FastifyRequest<{ Body: FormData; Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const id = request.params.id;
    const file = await request.file();
    if (!file) {
      const errorMessage = createErrorResponse(404, ErrorCodes.NO_FILE_PROVIDED);
      return reply.code(404).send(errorMessage);
    }
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
    return reply.code(201).send();
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

/**
 * Deletes the profile picture for a given user ID.
 * @param request Fastify request with user ID in params
 * @param reply Fastify reply instance
 * @returns 204 on success, 404 if no picture found, 500 on error
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
    } else {
      const errorMessage = createErrorResponse(404, ErrorCodes.PICTURE_NOT_FOUND);
      return reply.code(404).send(errorMessage);
    }
    return reply.code(204).send();
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}
