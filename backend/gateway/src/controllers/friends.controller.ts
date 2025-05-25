import { FastifyJWT } from '../middleware/jwt.js';
import { IId } from '../shared/types/gateway.types.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { sendError } from '../helper/friends.helper.js';
import { ErrorResponse } from '../shared/types/error.type.js';
import { ErrorCodes } from '../shared/constants/error.const.js';
import { IReplyGetFriend, IReplyFriendStatus } from '../shared/types/friends.types.js';

/**
 * Retrieves the friends list for a specific user by ID.
 *
 * @param request - FastifyRequest object containing the user ID in params.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns friends data (IReplyGetFriend[])
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function getFriends(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply) {
  try {
    const subpath = request.url.split('/friends')[1];
    const serviceUrl = `http://${process.env.FRIENDS_ADDR || 'localhost'}:8084${subpath}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const friends = (await response.json()) as IReplyGetFriend[] | ErrorResponse;
    return reply.code(response.status).send(friends);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Retrieves the friends list for the authenticated user.
 *
 * @param request - FastifyRequest object (user must be authenticated).
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns friends data (IReplyGetFriend[])
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function getFriendsMe(request: FastifyRequest, reply: FastifyReply) {
  try {
    const id: string = (request.user as FastifyJWT['user']).id;
    const subpath = request.url.split('/friends')[1];
    const serviceUrl = `http://${process.env.FRIENDS_ADDR || 'localhost'}:8084${subpath}/${id}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const friends = (await response.json()) as IReplyGetFriend[] | ErrorResponse;
    return reply.code(response.status).send(friends);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Retrieves the friendship status between the authenticated user and another user.
 *
 * @param request - FastifyRequest object containing the other user's ID in params.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns friendship status (IReplyFriendStatus)
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function getFriendStatus(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply) {
  try {
    const id: string = (request.user as FastifyJWT['user']).id;
    const subpath = request.url.split('/friends')[1];
    const serviceUrl = `http://${process.env.FRIENDS_ADDR || 'localhost'}:8084${subpath}?id=${id}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const responseData = (await response.json()) as IReplyFriendStatus | ErrorResponse;
    return reply.code(response.status).send(responseData);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Sends a friend request from the authenticated user to another user.
 *
 * @param request - FastifyRequest object containing the target user ID in body.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, friend request sent
 *   400/404/409 - ErrorResponse from friends service
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function postFriend(request: FastifyRequest<{ Body: IId }>, reply: FastifyReply) {
  try {
    const id: string = (request.user as FastifyJWT['user']).id;
    const subpath = request.url.split('/friends')[1];
    const serviceUrl = `http://${process.env.FRIENDS_ADDR || 'localhost'}:8084${subpath}/${id}`;
    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.body),
    });
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

/**
 * Accepts or updates a friend request for the authenticated user.
 *
 * @param request - FastifyRequest object containing the target user ID in body.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, friend request updated
 *   400/404/409 - ErrorResponse from friends service
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function patchFriend(request: FastifyRequest<{ Body: IId }>, reply: FastifyReply) {
  try {
    const id: string = (request.user as FastifyJWT['user']).id;
    const subpath = request.url.split('/friends')[1];
    const serviceUrl = `http://${process.env.FRIENDS_ADDR || 'localhost'}:8084${subpath}/${id}`;
    const response = await fetch(serviceUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.body),
    });
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

/**
 * Deletes all friends for the authenticated user.
 *
 * @param request - FastifyRequest object (user must be authenticated).
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, all friends deleted
 *   400/404/409 - ErrorResponse from friends service
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function deleteFriends(request: FastifyRequest, reply: FastifyReply) {
  try {
    const id: string = (request.user as FastifyJWT['user']).id;
    const subpath = request.url.split('/friends')[1];
    const serviceUrl = `http://${process.env.FRIENDS_ADDR || 'localhost'}:8084${subpath}/${id}`;
    const response = await fetch(serviceUrl, { method: 'DELETE' });
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

/**
 * Deletes a specific friend for the authenticated user.
 *
 * @param request - FastifyRequest object containing the friend's ID in params.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, friend deleted
 *   400/404/409 - ErrorResponse from friends service
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function deleteFriend(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply) {
  try {
    const id: string = (request.user as FastifyJWT['user']).id;
    const subpath = request.url.split('/friends')[1];
    const serviceUrl = `http://${process.env.FRIENDS_ADDR || 'localhost'}:8084${subpath}?id=${id}`;
    const response = await fetch(serviceUrl, { method: 'DELETE' });
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
