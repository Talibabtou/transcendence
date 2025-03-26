import { FastifyInstance } from 'fastify';
import { deletePic, upload } from '../controllers/profil.controllers.js'
import { IReply } from '../types/types.js'

export default async function authRoutes(fastify: FastifyInstance) {
	fastify.post<{ Reply: IReply }>('/profil/uploads', {
		config: { 
		  auth: true, 
		  roles: ['user', 'admin']
		}},
		upload);

	fastify.delete<{ Reply: IReply }>('/profil/uploads', {
		config: { 
		  auth: true, 
		  roles: ['user', 'admin']
		}},
		deletePic);
}
