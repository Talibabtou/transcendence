import { FastifyInstance } from 'fastify';
import { IAddUser, ILogin, IModifyUser } from '../shared/types/auth.types.js';
import {
  getUsers,
  getUser,
  getUserMe,
  postUser,
  patchUser,
  deleteUser,
  postLogin,
  postLogout,
} from '../controllers/auth.controller.js';
import {
  getUserSchema,
  getUserMeSchema,
  getUsersSchema,
  deleteUserSchema,
  createUserSchema,
  modifyUserSchema,
  loginSchema,
  logoutSchema,
} from '../schemas/auth.schemas.js';

const auth = { auth: true, roles: ['user', 'admin'] };

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/auth/users',
    {
      schema: {
        ...getUsersSchema,
        tags: ['auth'],
      },
      config: auth,
    },
    getUsers
  );

  fastify.get<{ Params: { id: string } }>(
    '/auth/user/:id',
    {
      schema: {
        ...getUserSchema,
        tags: ['auth'],
      },
      config: auth,
    },
    getUser
  );

  fastify.get(
    '/auth/user/me',
    {
      schema: {
        ...getUserMeSchema,
        tags: ['auth'],
      },
      config: auth,
    },
    getUserMe
  );

  fastify.post<{ Body: IAddUser }>(
    '/auth/register',
    {
      schema: {
        ...createUserSchema,
        tags: ['auth'],
      },
    },
    postUser
  );

  fastify.post(
    '/auth/logout',
    {
      schema: {
        ...logoutSchema,
        tags: ['auth'],
      },
      config: auth,
    },
    postLogout
  );

  fastify.post<{ Body: ILogin }>(
    '/auth/login',
    {
      schema: {
        ...loginSchema,
        tags: ['auth'],
      },
    },
    postLogin
  );

  fastify.patch<{ Body: IModifyUser }>(
    '/auth/user',
    {
      schema: {
        ...modifyUserSchema,
        tags: ['auth'],
      },
      config: auth,
    },
    patchUser
  );

  fastify.delete(
    '/auth/user',
    {
      schema: {
        ...deleteUserSchema,
        tags: ['auth'],
      },
      config: auth,
    },
    deleteUser
  );
}
