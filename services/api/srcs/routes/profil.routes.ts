import { FastifyInstance } from 'fastify';
import { deletePic, upload } from '../controllers/profil.controllers.js'
import { deleteSchema, uploadSchema } from '../schemas/profil.schemas.js'

export default async function authRoutes(fastify: FastifyInstance) {
	fastify.post('/profil/uploads', {
		schema: uploadSchema,
		config: { 
		  auth: true, 
		  roles: []
		}},
		upload);

	fastify.delete('/profil/uploads', {
		schema: deleteSchema,
		config: { 
		  auth: true, 
		  roles: ['user', 'admin']
		}},
		deletePic);
}
