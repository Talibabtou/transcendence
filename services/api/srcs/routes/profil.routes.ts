import { FastifyInstance } from 'fastify';
import { deletePic, upload } from '../controllers/profil.controllers.js'

export default async function authRoutes(fastify: FastifyInstance) {
	fastify.post('/profil/uploads', {
		config: { 
		  auth: true, 
		  roles: []
		}},
		upload);

	fastify.delete('/profil/uploads', {
		config: { 
		  auth: true, 
		  roles: ['user', 'admin']
		}},
		deletePic);
}
