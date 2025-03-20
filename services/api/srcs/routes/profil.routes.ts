import { FastifyInstance } from 'fastify';
import { deletePic, upload } from '../controllers/profil.controllers.js'
import { IReply } from '../types/types.js'


const jwt = { auth: true };
const noJwt = { auth: false };

export default async function authRoutes(fastify: FastifyInstance) {
	fastify.post<{ Reply: IReply }>('/profil/uploads', 
		{ config: jwt },
		upload);

	fastify.delete<{ Reply: IReply }>('/profil/uploads', 
		{ config: jwt },
		deletePic);
}
