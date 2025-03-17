import { FastifyInstance } from 'fastify';
import { deletePic, getPic, upload } from '../controllers/profil.controllers.js'


const jwt = { auth: true };
const noJwt = { auth: false };

export default async function authRoutes(fastify: FastifyInstance) {
  
	fastify.post('/profil/upload', 
		{ config: jwt },
		upload);

	fastify.get('/profil/pic/:id', 
		{ config: jwt },
		getPic);

	fastify.delete('/profil/pic/:id', 
		{ config: jwt },
		deletePic);
}
