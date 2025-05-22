import {
  IModifyUser,
  IAddUser,
  ILogin,
  IId,
  IJwtId,
  I2faCode,
  IUsername,
} from '../shared/types/auth.types.js';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  addUser,
  getUser,
  deleteUser,
  modifyUser,
  logout,
  login,
  loginGuest,
  checkRevoked,
  twofaDisable,
  twofaGenerate,
  twofaValidate,
  getId,
  getUsername,
} from '../controllers/auth.controller.js';

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', (request: FastifyRequest, reply: FastifyReply) => {
    reply.code(200).send();
  });

  fastify.get<{ Params: IUsername }>('/id/:username', getId);

  fastify.get<{ Params: IId }>('/username/:id', getUsername);

  fastify.get<{ Params: IId }>('/user/:id', getUser);

  fastify.get<{ Params: IId }>('/revoked/:id', checkRevoked);

  fastify.get<{ Params: IId }>('/2fa/generate/:id', twofaGenerate);

  fastify.post<{ Body: I2faCode; Params: IId }>('/2fa/validate/:id', twofaValidate);

  fastify.post<{ Body: IAddUser }>('/register', addUser);

  fastify.post<{ Body: IJwtId; Params: IId }>('/logout/:id', logout);

  fastify.post<{ Body: ILogin }>('/login', login);

  fastify.post<{ Body: ILogin }>('/login/guest', loginGuest);

  fastify.patch<{ Body: IModifyUser; Params: IId }>('/user/:id', modifyUser);

  fastify.patch<{ Params: IId }>('/2fa/disable/:id', twofaDisable);

  fastify.delete<{ Params: IId }>('/user/:id', deleteUser);
}
