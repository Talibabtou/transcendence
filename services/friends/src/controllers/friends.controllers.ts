import { FastifyRequest, FastifyReply } from 'fastify';
import { IReplyGetFriends, IId } from '../shared/types/friends.types.js'
import { createErrorResponse, ErrorCodes } from '../shared/constants/error.const.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string;
      username: string;
      role: string;
    };
  }
}

export async function getFriends(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const friends = await request.server.db.all(`
        SELECT 
          CASE 
            WHEN id_1 = ? THEN id_2 
            ELSE id_1 
          END AS id, 
          accepted, 
          created_at 
        FROM friends
        WHERE id_1 = ? OR id_2 = ?`, [request.user.id, request.user.id, request.user.id]);
      console.log({ friends });
      if (!friends) {
        const errorMessage = createErrorResponse(404, ErrorCodes.PLAYER_NOT_FOUND)
        return reply.code(404).send(errorMessage);
      }
      return reply.code(200).send({ friends });
    } catch (err) {
      const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
      return reply.code(500).send(errorMessage);
    }
}

export async function postFriend(request: FastifyRequest<{ Body: IId }>, reply: FastifyReply): Promise<void> {
  try {
    const id = request.body;
    if (id.id === request.user.id) {
      const errorMessage = createErrorResponse(400, ErrorCodes.BAD_REQUEST)
      return reply.code(400).send(errorMessage);
    }
    const result = await request.server.db.get(`
      SELECT
          EXISTS (SELECT 1 FROM friends WHERE (id_1 = ? AND id_2 = ?) OR (id_2 = ? AND id_1 = ?)) AS FriendExists`, [request.user.id, id.id, request.user.id, id.id]);
    console.log(result.FriendExists);
    if (result.FriendExists) {
      const errorMessage = createErrorResponse(409, ErrorCodes.FRIENDSHIP_EXISTS)
      return reply.code(409).send(errorMessage);
    }
    await request.server.db.run('INSERT INTO friends (id_1, id_2, accepted, created_at) VALUES (?, ?, false, CURRENT_TIMESTAMP);', [request.user.id, id.id]);
    return reply.code(201).send();
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('SQLITE_MISMATCH')) {
        const errorMessage = createErrorResponse(400, ErrorCodes.SQLITE_MISMATCH)
        return reply.code(400).send(errorMessage);
      }
      else if (err.message.includes('SQLITE_CONSTRAINT')) {
        const errorMessage = createErrorResponse(409, ErrorCodes.SQLITE_CONSTRAINT)
        return reply.code(409).send(errorMessage);
      }
    }
    console.log(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
    return reply.code(500).send(errorMessage);
  }
}

export async function patchFriend(request: FastifyRequest<{ Body: IId }>, reply: FastifyReply): Promise<void> {
  try {
    const id = request.body;
    const result = await request.server.db.run('UPDATE friends SET accepted = true WHERE id_2 = ? AND id_1 = ?', [request.user.id, id.id]);
    if (result.changes === 0) {
      const errorMessage = createErrorResponse(404, ErrorCodes.FRIENDS_NOTFOUND)
      return reply.code(404).send(errorMessage);
    }
    return reply.code(204).send();
  } catch (err) {
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
    return reply.code(500).send(errorMessage);
  }
}

export async function deleteFriends(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const result = await request.server.db.run('DELETE FROM friends WHERE id_1 = ? AND id_2 = ?', [request.user.id, request.user.id]);
    if (result.changes === 0) {
      const errorMessage = createErrorResponse(404, ErrorCodes.FRIENDS_NOTFOUND);
      return reply.code(404).send(errorMessage);
    }
    return reply.code(204).send();
  } catch (err) {
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

export async function deleteFriend(request: FastifyRequest<{ Params: { id: string }}>, reply: FastifyReply): Promise<void> {
  try {
    const result = await request.server.db.run('DELETE FROM friends WHERE (id_1 = ? AND id_2 = ?) OR (id_1 = ? AND id_2 = ?)', [request.params.id, request.user.id, request.user.id, request.params.id]);
    if (result.changes === 0) {
      const errorMessage = createErrorResponse(404, ErrorCodes.FRIENDS_NOTFOUND)
      return reply.code(404).send(errorMessage);
    }
    return reply.code(204).send();
  } catch (err) {
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR)
    return reply.code(500).send(errorMessage);
  }
}
