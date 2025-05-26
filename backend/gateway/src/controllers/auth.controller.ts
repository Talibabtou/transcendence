import {
  IAddUser,
  ILogin,
  IModifyUser,
  IReplyUser,
  IReplyLogin,
  IReplyQrCode,
  IUsername,
  IId,
  IReplyTwofaStatus,
} from '../shared/types/auth.types.js';
import { FastifyJWT } from '../middleware/jwt.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { sendError } from '../helper/friends.helper.js';
import { ErrorResponse } from '../shared/types/error.type.js';
import { ErrorCodes } from '../shared/constants/error.const.js';

/**
 * Retrieves the user ID based on the provided username.
 *
 * @param request - FastifyRequest with username in params.
 * @param reply - FastifyReply for sending the response.
 * @returns 200 with user ID, 404 if not found, 500 on error.
 */
export async function getId(request: FastifyRequest<{ Params: IUsername }>, reply: FastifyReply) {
  try {
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:${process.env.AUTH_PORT || 8082}${subpath}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const id = (await response.json()) as IId | ErrorResponse;
    return reply.code(response.status).send(id);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Retrieves the username based on the provided user ID.
 *
 * @param request - FastifyRequest with user ID in params.
 * @param reply - FastifyReply for sending the response.
 * @returns 200 with username, 404 if not found, 500 on error.
 */
export async function getUsername(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply) {
  try {
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:${process.env.AUTH_PORT || 8082}${subpath}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const username = (await response.json()) as IUsername | ErrorResponse;
    return reply.code(response.status).send(username);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Retrieves user details based on the provided user ID.
 *
 * @param request - FastifyRequest with user ID in params.
 * @param reply - FastifyReply for sending the response.
 * @returns 200 with user details, 404 if not found, 500 on error.
 */
export async function getUser(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply) {
  try {
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:${process.env.AUTH_PORT || 8082}${subpath}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const user = (await response.json()) as IReplyUser | ErrorResponse;
    return reply.code(response.status).send(user);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Generates a 2FA QR code for the authenticated user.
 *
 * @param request - FastifyRequest with authenticated user.
 * @param reply - FastifyReply for sending the response.
 * @returns 200 with QR code, 204 if already enabled, 500 on error.
 */
export async function twofaGenerate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const id: string = (request.user as FastifyJWT['user']).id;
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:${process.env.AUTH_PORT || 8082}${subpath}/${id}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    if (response.status != 204) {
      const responseData = (await response.json()) as IReplyQrCode | ErrorResponse;
      return reply.code(response.status).send(responseData);
    }
    return reply.code(response.status).send();
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Validates the 2FA code for the authenticated user.
 *
 * @param request - FastifyRequest with authenticated user and code in body.
 * @param reply - FastifyReply for sending the response.
 * @returns 200 on success, error response otherwise.
 */
export async function twofaValidate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const id: string = (request.user as FastifyJWT['user']).id;
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:${process.env.AUTH_PORT || 8082}${subpath}/${id}`;
    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.body),
    });
    if (response.status == 200) return reply.code(response.status).send();
    const responseData = (await response.json()) as ErrorResponse;
    return reply.code(response.status).send(responseData);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Registers a new user.
 *
 * @param request - FastifyRequest with user data in body.
 * @param reply - FastifyReply for sending the response.
 * @returns 201 with user info, error response otherwise.
 */
export async function postUser(request: FastifyRequest<{ Body: IAddUser }>, reply: FastifyReply) {
  try {
	  const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:${process.env.AUTH_PORT || 8082}${subpath}`;
    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        From: request.ip,
      },
      body: JSON.stringify(request.body),
    });
    const user = (await response.json()) as IReplyUser[] | ErrorResponse;
    return reply.code(response.status).send(user);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Updates user information for the authenticated user.
 *
 * @param request - FastifyRequest with user data in body.
 * @param reply - FastifyReply for sending the response.
 * @returns 200 on success, error response otherwise.
 */
export async function patchUser(request: FastifyRequest<{ Body: IModifyUser }>, reply: FastifyReply) {
  try {
    const id: string = (request.user as FastifyJWT['user']).id;
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:${process.env.AUTH_PORT || 8082}${subpath}/${id}`;
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
 * Disables 2FA for the authenticated user.
 *
 * @param request - FastifyRequest with authenticated user.
 * @param reply - FastifyReply for sending the response.
 * @returns 200 on success, error response otherwise.
 */
export async function twofaDisable(request: FastifyRequest<{ Body: IModifyUser }>, reply: FastifyReply) {
  try {
	  const id: string = (request.user as FastifyJWT['user']).id;
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:${process.env.AUTH_PORT || 8082}${subpath}/${id}`;
    const response = await fetch(serviceUrl, { method: 'PATCH' });
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
 * Logs out the authenticated user.
 *
 * @param request - FastifyRequest with authenticated user.
 * @param reply - FastifyReply for sending the response.
 * @returns 200 on success, error response otherwise.
 */
export async function postLogout(request: FastifyRequest, reply: FastifyReply) {
  try {
    const jwtId = (request.user as FastifyJWT['user']).jwtId;
    const id = (request.user as FastifyJWT['user']).id;
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:${process.env.AUTH_PORT || 8082}${subpath}/${id}`;
    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jwtId),
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
 * Logs in a user with provided credentials.
 *
 * @param request - FastifyRequest with login data in body.
 * @param reply - FastifyReply for sending the response.
 * @returns 200 with login info, 204 if 2FA required, error response otherwise.
 */
export async function postLogin(request: FastifyRequest<{ Body: ILogin }>, reply: FastifyReply) {
  try {
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:${process.env.AUTH_PORT || 8082}${subpath}`;
    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        From: request.ip,
      },
      body: JSON.stringify(request.body),
    });
    if (response.status === 204) {
      return reply.code(response.status).send();
    }
    const data = (await response.json()) as IReplyLogin | ErrorResponse;
    return reply.code(response.status).send(data);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Logs in a guest user.
 *
 * @param request - FastifyRequest with guest login data in body.
 * @param reply - FastifyReply for sending the response.
 * @returns 200 with login info, error response otherwise.
 */
export async function postLoginGuest(request: FastifyRequest<{ Body: ILogin }>, reply: FastifyReply) {
  try {
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:${process.env.AUTH_PORT || 8082}${subpath}`;
    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.body),
    });
    const responseData = (await response.json()) as IReplyLogin | ErrorResponse;
    return reply.code(response.status).send(responseData);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Retrieves the 2FA status for the authenticated user.
 *
 * @param request - FastifyRequest with authenticated user.
 * @param reply - FastifyReply for sending the response.
 * @returns 200 with 2FA status, error response otherwise.
 */
export async function twofaStatus(request: FastifyRequest, reply: FastifyReply) {
  try {
	  const id: string = (request.user as FastifyJWT['user']).id;
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:${process.env.AUTH_PORT || 8082}${subpath}/${id}`;
    const response = await fetch(serviceUrl, {
      method: 'GET',
      headers: {
        Authorization: request.headers.authorization || '',
      },
    });
    const data = (await response.json()) as IReplyTwofaStatus | ErrorResponse;
    return reply.code(200).send(data);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}
