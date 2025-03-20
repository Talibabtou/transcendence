import { FastifyInstance } from 'fastify';
import { IReply } from '../types/profil.types.js';
import { upload, deletePic } from '../controllers/profil.controllers.js';

const jwt = { auth: true };
const noJwt = { auth: false };

export default async function profilRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Reply: IReply }>('/uploads',
    { config: jwt },
    upload);
  
  fastify.delete<{ Reply: IReply }>('/uploads',
    { config: jwt },
    deletePic);
}
