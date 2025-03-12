import { FastifyInstance } from 'fastify';
import { getAuth, getIdAuth, postAuth, patchAuth, deleteIdAuth, postLogin } from '../controllers/auth.controllers.js'

const jwt = { auth: true };
const noJwt = { auth: false }

export default async function authRoutes(fastify: FastifyInstance) {
  
	fastify.get('/auth/:id', 
		{ config: jwt },
		getIdAuth);

	fastify.get('/auth', 
		{ config: jwt },
		getAuth);

	fastify.post('/auth', 
		{ config: noJwt },
		postAuth);

	fastify.patch('/auth/:id',
		{ config: jwt },
		patchAuth);

	fastify.delete('/auth/:id',
		{ config: jwt },
		deleteIdAuth);

	fastify.post('/login',
		{ config: noJwt },
		postLogin);
}
