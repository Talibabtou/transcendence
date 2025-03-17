import { getIdUserSchema } from '../schemas/profil.schemas.js';
import { FastifyInstance } from 'fastify';
import { IGetIdUser } from '../types/profil.types.js';
import { getPic, upload, deletePic} from '../controllers/profil.controllers.js';

const jwt = { auth: true };
const noJwt = { auth: false };

export default async function profilRoutes(fastify: FastifyInstance) {
  fastify.post('/upload',
    { config: jwt },
    upload);
  
    fastify.get<{ Params: IGetIdUser }>('/pic/:id',
    { schema: getIdUserSchema, config: jwt },
    getPic);

  fastify.delete<{ Params: IGetIdUser}>('/pic/:id',
    { schema: getIdUserSchema, config: jwt },
    deletePic);
}
