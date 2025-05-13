import { FastifyInstance } from 'fastify';
import { deletePic, postPic, getSummary } from '../controllers/profile.controller.js';
import { deleteSchema, uploadSchema } from '../schemas/profile.schemas.js';
import { IUpload } from '../shared/types/profile.type.js';

const auth = { auth: true, roles: ['user', 'admin'] };

export default async function profileRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/profile/summary/:id',
    {
      // schema: {
      //   ...summarySchema,
      //   tags: ['profile'],
      // },
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
