import { FastifyInstance } from 'fastify';
import { deletePic, upload } from '../controllers/profil.controllers.js'
import { deleteSchema, uploadSchema } from '../schemas/profil.schemas.js'
import { IUpload } from '../shared/types/profil.type.js'

export default async function authRoutes(fastify: FastifyInstance) {
	fastify.post<{ Body: IUpload }>('/profil/uploads', {
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
