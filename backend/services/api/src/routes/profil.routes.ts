import { FastifyInstance } from 'fastify';
import { deletePic, upload } from '../controllers/profil.controllers.js'
import { deleteSchema, uploadSchema } from '../schemas/profil.schemas.js'
import { IUpload } from '../shared/types/profil.type.js'

const auth = { auth: true, roles: ['user', 'admin'] }

export default async function authRoutes(fastify: FastifyInstance) {
	fastify.post<{ Body: IUpload }>('/profil/uploads', {
		schema: uploadSchema,
		config: auth
		},
		upload);

	fastify.delete('/profil/uploads', {
		schema: deleteSchema,
		config: auth
		},
		deletePic);
}
