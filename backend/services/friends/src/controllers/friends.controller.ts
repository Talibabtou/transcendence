import { FastifyRequest, FastifyReply } from 'fastify';
import { IId } from '../shared/types/gateway.types.js';
import { IUsername } from '../shared/types/auth.types.js';
import { IReplyPic } from '../shared/types/profile.type.js';
import { ErrorResponse } from '../shared/types/error.type.js';
import { ErrorCodes } from '../shared/constants/error.const.js';
import { sendError, isValidId } from '../helper/friends.helper.js';
import { IReplyGetFriend, IReplyFriendStatus } from '../shared/types/friends.types.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string;
      username: string;
      role: string;
    };
  }
}

/**
 * Retrieves the list of friends for a given user.
 *
 * @param request - FastifyRequest object containing user ID in params.
 * @param reply - FastifyReply object for sending the response.
 * @returns 200 with a list of friends, 400 if invalid ID, 404 if not found, 500 on server error.
 */
export async function getFriends(
  request: FastifyRequest<{ Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { id } = request.params;
    if (!isValidId(id)) return sendError(reply, 400, ErrorCodes.BAD_REQUEST);
    const friends: IReplyGetFriend[] = await request.server.db.all(
      `
      SELECT 
        CASE 
          WHEN id_1 = ? THEN id_2 
          ELSE id_1 
        END AS id, 
        accepted, 
        created_at 
      FROM friends
      WHERE id_1 = ? OR id_2 = ?`,
      [id, id, id]
    );
    if (!friends) return sendError(reply, 404, ErrorCodes.FRIENDS_NOTFOUND);
    for (let i = 0; i < friends.length; i++) {
      try {
        const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082/username/${friends[i].id}`;
        const response = await fetch(serviceUrl, { method: 'GET' });
        const user = (await response.json()) as IUsername | ErrorResponse;
        if ('username' in user) {
          friends[i].username = user.username;
        } else {
          friends[i].username = 'undefined';
        }
      } catch (err) {
        friends[i].username = 'undefined';
      }
      try {
        const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8081/pics/${friends[i].id}`;
        const response = await fetch(serviceUrl, { method: 'GET' });
        const pic = (await response.json()) as IReplyPic | ErrorResponse;
        if ('link' in pic) {
          friends[i].pic = pic.link;
        } else {
          friends[i].pic = 'default';
        }
      } catch (err) {
        friends[i].pic = 'default';
      }
    }
    return reply.code(200).send(friends);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Retrieves the list of friends for the authenticated user.
 *
 * @param request - FastifyRequest object containing the user ID in the params.
 * @param reply - FastifyReply object used to send the response.
 * @returns 200 with a list of friends, 400 if invalid ID, 404 if not found, 500 on server error.
 */
export async function getFriendsMe(
  request: FastifyRequest<{ Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { id } = request.params;
    if (!isValidId(id)) return sendError(reply, 400, ErrorCodes.BAD_REQUEST);
    const friends: IReplyGetFriend[] = await request.server.db.all(
      `
      SELECT 
        CASE 
          WHEN id_1 = ? THEN id_2 
          ELSE id_1 
        END AS id, 
        accepted, 
        created_at 
      FROM friends
      WHERE id_1 = ? OR id_2 = ?`,
      [id, id, id]
    );
    if (!friends) return sendError(reply, 404, ErrorCodes.FRIENDS_NOTFOUND);
    for (let i = 0; i < friends.length; i++) {
      try {
        const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082/username/${friends[i].id}`;
        const response = await fetch(serviceUrl, { method: 'GET' });
        const user = (await response.json()) as IUsername | ErrorResponse;
        if ('username' in user) {
          friends[i].username = user.username;
        } else {
          friends[i].username = 'undefined';
        }
      } catch (err) {
        friends[i].username = 'undefined';
      }
      try {
        const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8081/pics/${friends[i].id}`;
        const response = await fetch(serviceUrl, { method: 'GET' });
        const pic = (await response.json()) as IReplyPic | ErrorResponse;
        if ('link' in pic) {
          friends[i].pic = pic.link;
        } else {
          friends[i].pic = 'default';
        }
      } catch (err) {
        friends[i].pic = 'default';
      }
    }
    return reply.code(200).send(friends);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Retrieves the friendship status between two users.
 *
 * @param request - FastifyRequest object containing user IDs in params and query.
 * @param reply - FastifyReply object for sending the response.
 * @returns 200 with friendship status and requester ID, 400 if invalid ID or same user, 404 if not found, 500 on server error.
 */
export async function getFriendStatus(
  request: FastifyRequest<{ Querystring: IId; Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { id } = request.query;
    if (!isValidId(id) || id === request.params.id) return sendError(reply, 400, ErrorCodes.BAD_REQUEST);
    const friendStatus = await request.server.db.get(
      `
      SELECT
        id_1,
        accepted AS status
      FROM friends
      WHERE
        ((id_1 = ? AND id_2 = ?) OR (id_1 = ? AND id_2 = ?))
      LIMIT 1
      `,
      [id, request.params.id, request.params.id, id]
    );
    if (!friendStatus) return sendError(reply, 404, ErrorCodes.FRIENDS_NOTFOUND);

    // Transform the response to match the expected format with 'requesting' field
    const response = {
      status: friendStatus.status,
      requesting: friendStatus.id_1,
    };

    return reply.code(200).send(response);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Sends a friend request from one user to another.
 *
 * @param request - FastifyRequest object containing user IDs in params and body.
 * @param reply - FastifyReply object for sending the response.
 * @returns 201 on success, 400 if invalid ID or same user or SQLite mismatch, 409 if friendship exists or SQLite constraint, 500 on server error.
 */
export async function postFriend(
  request: FastifyRequest<{ Body: IId; Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { id } = request.body;
    if (!isValidId(id) || id === request.params.id) return sendError(reply, 400, ErrorCodes.BAD_REQUEST);
    const friend = await request.server.db.get(
      `
      SELECT
          EXISTS (SELECT 1 FROM friends WHERE (id_1 = ? AND id_2 = ?) OR (id_2 = ? AND id_1 = ?)) AS FriendExists`,
      [request.params.id, id, request.params.id, id]
    );
    if (friend.FriendExists) return sendError(reply, 409, ErrorCodes.FRIENDSHIP_EXISTS);

    await request.server.db.run(
      'INSERT INTO friends (id_1, id_2, accepted, created_at) VALUES (?, ?, false, CURRENT_TIMESTAMP);',
      [request.params.id, id]
    );
    return reply.code(201).send();
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('SQLITE_MISMATCH')) return sendError(reply, 400, ErrorCodes.SQLITE_MISMATCH);
      if (err.message.includes('SQLITE_CONSTRAINT'))
        return sendError(reply, 409, ErrorCodes.SQLITE_CONSTRAINT);
    }
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Accepts a pending friend request.
 *
 * @param request - FastifyRequest object containing user IDs in params and body.
 * @param reply - FastifyReply object for sending the response.
 * @returns 204 on success, 400 if invalid ID or same user, 404 if not found, 500 on server error.
 */
export async function patchFriend(
  request: FastifyRequest<{ Body: IId; Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { id } = request.body;
    if (!isValidId(id) || id === request.params.id) return sendError(reply, 400, ErrorCodes.BAD_REQUEST);
    const friend = await request.server.db.run(
      'UPDATE friends SET accepted = true WHERE id_2 = ? AND id_1 = ?',
      [request.params.id, id]
    );
    if (friend.changes === 0) return sendError(reply, 404, ErrorCodes.FRIENDS_NOTFOUND);
    return reply.code(204).send();
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Deletes all friends for a given user.
 *
 * @param request - FastifyRequest object containing user ID in params.
 * @param reply - FastifyReply object for sending the response.
 * @returns 204 on success, 404 if no friends found, 500 on server error.
 */
export async function deleteFriends(
  request: FastifyRequest<{ Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const result = await request.server.db.run('DELETE FROM friends WHERE id_1 = ? OR id_2 = ?', [
      request.params.id,
      request.params.id,
    ]);
    if (result.changes === 0) return sendError(reply, 404, ErrorCodes.FRIENDS_NOTFOUND);

    return reply.code(204).send();
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Deletes a specific friend relationship between two users.
 *
 * @param request - FastifyRequest object containing user IDs in params and query.
 * @param reply - FastifyReply object for sending the response.
 * @returns 204 on success, 400 if invalid ID, 404 if not found, 500 on server error.
 */
export async function deleteFriend(
  request: FastifyRequest<{ Querystring: IId; Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { id } = request.query;
    if (!isValidId(id)) return sendError(reply, 400, ErrorCodes.BAD_REQUEST);
    const result = await request.server.db.run(
      'DELETE FROM friends WHERE (id_1 = ? AND id_2 = ?) OR (id_1 = ? AND id_2 = ?)',
      [request.params.id, id, id, request.params.id]
    );
    if (result.changes === 0) return sendError(reply, 404, ErrorCodes.FRIENDS_NOTFOUND);

    return reply.code(204).send();
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}
