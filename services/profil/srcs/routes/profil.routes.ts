import { getIdUserSchema } from '../schemas/profil.schemas.js';
import { FastifyInstance } from 'fastify';
import { IGetIdUser, IReply, IReplyBuffer } from '../types/profil.types.js';
import { getPic, upload, deletePic} from '../controllers/profil.controllers.js';

const jwt = { auth: true };
const noJwt = { auth: false };

export default async function profilRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Reply: IReply }>('/upload',
    { config: jwt },
    upload);
  
    fastify.get<{ Params: IGetIdUser }>('/pic/:id',
    { config: noJwt },
    getPic);

  fastify.delete<{ Reply: IReply }>('/pic',
    { config: jwt },
    deletePic);
}
