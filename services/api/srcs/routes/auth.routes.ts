import { FastifyInstance } from 'fastify';
import { getAuth, getIdAuth, postAuth, putAuth, deleteIdAuth, postLogin } from '../controllers/auth.controllers.js'

async function authRoutes(fastify: FastifyInstance) {
	fastify.get('/auth/:id', getIdAuth);
	fastify.get('/auth', getAuth);
	fastify.post('/auth', postAuth);
	fastify.put('/auth/:id', putAuth);
	fastify.delete('/auth/:id', deleteIdAuth);
	fastify.post('/login', postLogin);
}

export default authRoutes;