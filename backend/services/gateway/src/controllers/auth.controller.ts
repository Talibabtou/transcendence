import { FastifyRequest, FastifyReply } from 'fastify';
import { FastifyJWT } from '../plugins/jwtPlugin.js';
import { ErrorResponse } from '../shared/types/error.type.js';
import { ErrorCodes, createErrorResponse } from '../shared/constants/error.const.js';
import {
  IAddUser,
  ILogin,
  IModifyUser,
  IReplyUser,
  IReplyLogin,
  IReplyQrCode,
  IUsername,
  IId,
} from '../shared/types/auth.types.js';

export async function getId(request: FastifyRequest<{ Params: IUsername }>, reply: FastifyReply) {
  try {
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const id = (await response.json()) as IId | ErrorResponse;
    return reply.code(response.status).send(id);
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
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
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

export async function getUsers(request: FastifyRequest, reply: FastifyReply) {
  try {
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const users = (await response.json()) as IReplyUser[] | ErrorResponse;
    return reply.code(response.status).send(users);
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
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
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

export async function getUserMe(request: FastifyRequest, reply: FastifyReply) {
  try {
    const id: string = (request.user as FastifyJWT['user']).id;
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}/${id}`;
    const response = await fetch(serviceUrl, { method: 'GET' });
    const user = (await response.json()) as IReplyUser | ErrorResponse;
    return reply.code(response.status).send(user);
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
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
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
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
    if (response.status == 200) {
      return reply.code(response.status).send();
    }
    const responseData = (await response.json()) as ErrorResponse;
    return reply.code(response.status).send(responseData);
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
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
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
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
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
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
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

export async function deleteUser(request: FastifyRequest, reply: FastifyReply) {
  try {
    const id: string = (request.user as FastifyJWT['user']).id;
    const subpath = request.url.split('/auth')[1];
    const serviceUrl = `http://${process.env.AUTH_ADDR || 'localhost'}:8082${subpath}/${id}`;
    const response = await fetch(serviceUrl, { method: 'DELETE' });
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
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
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
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
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
