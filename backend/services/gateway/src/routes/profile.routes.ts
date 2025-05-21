import {
  routesConfigAuth,
  rateLimitConfigLow,
  rateLimitConfigMid,
  rateLimitConfigHigh,
} from '../config/routes.config.js';
import {
  deleteSchema,
  uploadSchema,
  getPicSchema,
  summarySchema,
  getHistorySchema,
} from '../schemas/profile.schemas.js';
import { FastifyInstance } from 'fastify';
import { IUpload } from '../shared/types/profile.type.js';
import { deletePic, postPic, getSummary, getPic, getHistory } from '../controllers/profile.controller.js';

export default async function profileRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/profile/pics/:id',
    {
      schema: {
        ...getPicSchema,
        tags: ['profile'],
      },
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigHigh,
      },
    },
    getPic
  );

  fastify.get(
    '/profile/history/:id',
    {
      schema: {
        ...getHistorySchema,
        tags: ['profile'],
      },
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigMid,
      },
    },
    getHistory
  );

  fastify.get(
    '/profile/summary/:id',
    {
      schema: {
        ...summarySchema,
        tags: ['profile'],
      },
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigMid,
      },
    },
    getSummary
  );

  fastify.post<{ Body: IUpload }>(
    '/profile/uploads',
    {
      schema: {
        ...uploadSchema,
        tags: ['profile'],
      },
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigLow,
      },
    },
    postPic
  );

  fastify.delete(
    '/profile/uploads',
    {
      schema: {
        ...deleteSchema,
        tags: ['profile'],
      },
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigLow,
      },
    },
    deletePic
  );
}
