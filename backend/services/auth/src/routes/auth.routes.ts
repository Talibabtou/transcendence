import { IId } from '../shared/types/api.types.js';
import { IModifyUser, IAddUser, ILogin } from '../shared/types/auth.types.js';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  addUser,
  getUsers,
  getUser,
  getUserMe,
  deleteUser,
  modifyUser,
  login,
  logout,
  checkRevoked,
} from '../controllers/auth.controller.js';

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', (request: FastifyRequest, reply: FastifyReply) => {
    reply.code(200).send();
  });

  fastify.get('/users', getUsers);

  fastify.get<{ Params: IId }>('/user/:id', getUser);

  fastify.get<{ Params: IId }>('/user/me/:id', getUserMe);

  fastify.get<{ Params: IId }>('/user/revoked/:id', checkRevoked);

  fastify.patch<{ Body: IModifyUser; Params: IId }>('/user/:id', modifyUser);

  fastify.delete<{ Params: IId }>('/user/:id', deleteUser);

  fastify.post<{ Body: IAddUser }>('/register', addUser);

  fastify.post<{ Body: IId }>('/logout', logout);

  fastify.post<{ Body: ILogin }>('/login', login);
}
