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
import { FastifyJWT } from '../shared/types/auth.types.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { sendError } from '../helper/friends.helper.js';
import { ErrorResponse } from '../shared/types/error.type.js';
import { ErrorCodes } from '../shared/constants/error.const.js';

/**
 * Retrieves the ID of a user by their username.
 *
 * @param request - FastifyRequest object containing the username in the request parameters.
 * @param reply - FastifyReply object used to send the response.
 * @returns Promise<void>
 *   - 200: Sends the user ID if found.
 *   - 500: Sends an error response for internal server issues.
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
 * Retrieves the username of a user by their ID.
 *
 * @param request - FastifyRequest object containing the user ID in the request parameters.
 * @param reply - FastifyReply object used to send the response.
 * @returns Promise<void>
 *   - 200: Sends the username if found.
 *   - 500: Sends an error response for internal server issues.
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
 * Retrieves a user by their ID.
 *
 * @param request - FastifyRequest object containing the user ID in the request parameters.
 * @param reply - FastifyReply object used to send the response.
 * @returns Promise<void>
 *   - 200: Sends the user data if found.
 *   - 500: Sends an error response for internal server issues.
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
 * Generates a two-factor authentication QR code for a user.
 *
 * @param request - FastifyRequest object containing the user ID in the request parameters.
 * @param reply - FastifyReply object used to send the response.
 * @returns Promise<void>
 *   - 204: Sends a success response if the QR code is generated.
 *   - 400: Sends an error response if the QR code generation fails.
 *   - 500: Sends an error response for internal server issues.
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
 * Validates a two-factor authentication code for a user.
 *
 * @param request - FastifyRequest object containing the user ID in the request parameters.
 * @param reply - FastifyReply object used to send the response.
 * @returns Promise<void>
 *   - 200: Sends a success response if the code is valid.
 *   - 400: Sends an error response if the code is invalid.
 *   - 500: Sends an error response for internal server issues.
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
 * Creates a new user.
 *
 * @param request - FastifyRequest object containing the user data in the request body.
 * @param reply - FastifyReply object used to send the response.
 * @returns Promise<void>
 *   - 200: Sends the created user data.
 *   - 500: Sends an error response for internal server issues.
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
 * Updates a user's information.
 *
 * @param request - FastifyRequest object containing the user ID in the request parameters and the user data in the request body.
 * @param reply - FastifyReply object used to send the response.
 * @returns Promise<void>
 *   - 200: Sends a success response if the user is updated.
 *   - 400: Sends an error response if the user update fails.
 *   - 500: Sends an error response for internal server issues.
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
 * Disables two-factor authentication for a user.
 *
 * @param request - FastifyRequest object containing the user ID in the request parameters.
 * @param reply - FastifyReply object used to send the response.
 * @returns Promise<void>
 *   - 200: Sends a success response if the two-factor authentication is disabled.
 *   - 400: Sends an error response if the two-factor authentication disable fails.
 *   - 500: Sends an error response for internal server issues.
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
 * Logs out a user.
 *
 * @param request - FastifyRequest object containing the user ID in the request parameters.
 * @param reply - FastifyReply object used to send the response.
 * @returns Promise<void>
 *   - 200: Sends a success response if the user is logged out.
 *   - 400: Sends an error response if the logout fails.
 *   - 500: Sends an error response for internal server issues.
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
 * Logs in a user.
 *
 * @param request - FastifyRequest object containing the user data in the request body.
 * @param reply - FastifyReply object used to send the response.
 * @returns Promise<void>
 *   - 204: Sends a success response if the user is logged in.
 *   - 400: Sends an error response if the login fails.
 *   - 500: Sends an error response for internal server issues.
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
 * @param request - FastifyRequest object containing the user data in the request body.
 * @param reply - FastifyReply object used to send the response.
 * @returns Promise<void>
 *   - 204: Sends a success response if the guest user is logged in.
 *   - 400: Sends an error response if the login fails.
 *   - 500: Sends an error response for internal server issues.
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
 * Retrieves the two-factor authentication status of a user.
 *
 * @param request - FastifyRequest object containing the user ID in the request parameters.
 * @param reply - FastifyReply object used to send the response.
 * @returns Promise<void>
 *   - 200: Sends the two-factor authentication status.
 *   - 500: Sends an error response for internal server issues.
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
