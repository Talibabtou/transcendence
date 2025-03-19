import { FastifyInstance } from 'fastify';
import { deletePic, getPic, upload } from '../controllers/profil.controllers.js'
import { IReply, IGetIdUser } from '../types/types.js'


const jwt = { auth: true };
const noJwt = { auth: false };

export default async function authRoutes(fastify: FastifyInstance) {
	fastify.post<{ Reply: IReply }>('/profil/upload', 
		{ config: jwt },
		upload);

	fastify.get<{ Params: IGetIdUser }>('/profil/pic/:id', 
		{ config: noJwt },
		getPic);

	fastify.delete<{ Reply: IReply }>('/profil/pic', 
		{ config: jwt },
		deletePic);
}
