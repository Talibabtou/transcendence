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

export async function getId(request: FastifyRequest<{ Params: IUsername }>, reply: FastifyReply) {
  try {
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const id = (await response.json()) as IId | ErrorResponse;
    return reply.code(response.status).send(id);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

export async function getUsername(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply) {
  try {
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const username = (await response.json()) as IUsername | ErrorResponse;
    return reply.code(response.status).send(username);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

export async function getUser(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply) {
  try {
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const user = (await response.json()) as IReplyUser | ErrorResponse;
    return reply.code(response.status).send(user);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

export async function twofaGenerate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const id: string = (request.user as FastifyJWT['user']).id;
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}/${id}`;
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

export async function twofaValidate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const id: string = (request.user as FastifyJWT['user']).id;
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}/${id}`;
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

export async function postUser(request: FastifyRequest<{ Body: IAddUser }>, reply: FastifyReply) {
  try {
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}`;
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

export async function patchUser(request: FastifyRequest<{ Body: IModifyUser }>, reply: FastifyReply) {
  try {
    const id: string = (request.user as FastifyJWT['user']).id;
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}/${id}`;
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

export async function twofaDisable(request: FastifyRequest<{ Body: IModifyUser }>, reply: FastifyReply) {
  try {
    const id: string = (request.user as FastifyJWT['user']).id;
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}/${id}`;
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

export async function postLogout(request: FastifyRequest, reply: FastifyReply) {
  try {
    const jwtId = (request.user as FastifyJWT['user']).jwtId;
    const id = (request.user as FastifyJWT['user']).id;
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}/${id}`;
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

export async function postLogin(request: FastifyRequest<{ Body: ILogin }>, reply: FastifyReply) {
  try {
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}`;
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
export async function postLoginGuest(request: FastifyRequest<{ Body: ILogin }>, reply: FastifyReply) {
  try {
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}`;
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

export async function twofaStatus(request: FastifyRequest, reply: FastifyReply) {
  try {
    const id: string = (request.user as FastifyJWT['user']).id;
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}/${id}`;
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
