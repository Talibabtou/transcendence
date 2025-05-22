import {
  getUserSchema,
  deleteUserSchema,
  createUserSchema,
  modifyUserSchema,
  loginGuestSchema,
  loginSchema,
  logoutSchema,
  twofaDisableSchema,
  twofaValidateSchema,
  twofaGenerateSchema,
  getIdSchema,
  getUsernameSchema,
  twofaStatusSchema,
} from '../schemas/auth.schemas.js';
import {
  routesConfigAuth,
  routesConfigTwofa,
  rateLimitConfigLow,
  rateLimitConfigMid,
} from '../config/routes.config.js';
import { FastifyInstance } from 'fastify';
import {
  getId,
  getUser,
  postUser,
  patchUser,
  deleteUser,
  postLogin,
  postLoginGuest,
  postLogout,
  twofaGenerate,
  twofaValidate,
  twofaDisable,
  getUsername,
  twofaStatus,
} from '../controllers/auth.controller.js';
import { IAddUser, ILogin, IModifyUser, IId, IUsername } from '../shared/types/auth.types.js';

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: IUsername }>(
    '/auth/id/:username',
    {
      schema: {
        ...getIdSchema,
        tags: ['auth'],
      },
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigMid,
      },
    },
    getId
  );

  fastify.get<{ Params: IId }>(
    '/auth/username/:id',
    {
      schema: {
        ...getUsernameSchema,
        tags: ['auth'],
      },
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigMid,
      },
    },
    getUsername
  );

  fastify.get<{ Params: IId }>(
    '/auth/user/:id',
    {
      schema: {
        ...getUserSchema,
        tags: ['auth'],
      },
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigMid,
      },
    },
    getUser
  );

  fastify.get(
    '/auth/2fa/generate',
    {
      schema: {
        ...twofaGenerateSchema,
        tags: ['2fa'],
      },
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigLow,
      },
    },
    twofaGenerate
  );

  fastify.get(
    '/auth/2fa/status',
    {
      schema: {
        ...twofaStatusSchema,
        tags: ['2fa'],
      },
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigMid,
      },
    },
    twofaStatus
  );

  fastify.post(
    '/auth/2fa/validate',
    {
      schema: {
        ...twofaValidateSchema,
        tags: ['2fa'],
      },
      config: {
        ...routesConfigTwofa,
        rateLimit: rateLimitConfigLow,
      },
    },
    twofaValidate
  );

  fastify.post<{ Body: IAddUser }>(
    '/auth/register',
    {
      schema: {
        ...createUserSchema,
        tags: ['auth'],
      },
      config: {
        rateLimit: rateLimitConfigLow,
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
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigLow,
      },
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
      config: {
        rateLimit: rateLimitConfigLow,
      },
    },
    postLogin
  );

  fastify.post<{ Body: ILogin }>(
    '/auth/login/guest',
    {
      schema: {
        ...loginGuestSchema,
        tags: ['auth'],
      },
      config: {
        rateLimit: rateLimitConfigMid,
      },
    },
    postLoginGuest
  );

  fastify.patch<{ Body: IModifyUser }>(
    '/auth/user',
    {
      schema: {
        ...modifyUserSchema,
        tags: ['auth'],
      },
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigLow,
      },
    },
    patchUser
  );

  fastify.patch<{ Body: IModifyUser }>(
    '/auth/2fa/disable',
    {
      schema: {
        ...twofaDisableSchema,
        tags: ['2fa'],
      },
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigLow,
      },
    },
    twofaDisable
  );

  fastify.delete(
    '/auth/user',
    {
      schema: {
        ...deleteUserSchema,
        tags: ['auth'],
      },
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigLow,
      },
    },
    deleteUser
  );
}
