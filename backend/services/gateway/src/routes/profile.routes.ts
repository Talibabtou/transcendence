import { FastifyInstance } from 'fastify';
import { deletePic, postPic, getSummary, getPic, getHistory } from '../controllers/profile.controller.js';
import {
  deleteSchema,
  uploadSchema,
  getPicSchema,
  summarySchema,
  // getHistorySchema,
} from '../schemas/profile.schemas.js';
import { IUpload } from '../shared/types/profile.type.js';

const auth = { auth: true, roles: ['user', 'admin'] };

export default async function profileRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/profile/pics/:id',
    {
      schema: {
        ...getPicSchema,
        tags: ['profile'],
      },
      config: auth,
    },
    getPic
  );

  fastify.get(
    '/profile/history/:id',
    {
      // schema: {
      //   ...getHistorySchema,
      //   tags: ['profile'],
      // },
      config: auth,
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
      config: auth,
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
      config: auth,
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
      config: auth,
    },
    deletePic
  );
}
