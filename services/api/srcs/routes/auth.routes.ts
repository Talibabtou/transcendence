import { FastifyInstance } from 'fastify';
import { getUsers, getUser, postUser, patchUser, deleteUser, postLogin } from '../controllers/auth.controllers.js'
import { IReply } from '../types/types.js'

export default async function authRoutes(fastify: FastifyInstance) {
	fastify.get<{ Reply: IReply }>('/auth/user', {
		config: { 
		  auth: true, 
		  roles: ['user', 'admin']
		}},
		getUser);

	fastify.get<{ Reply: IReply }>('/auth/users', {
		config: { 
		  auth: true, 
		  roles: ['user', 'admin']
		}},
		getUsers);

	fastify.post<{ Reply: IReply }>('/auth/user', {
		config: { 
		  auth: false
		}},
		postUser);

	fastify.patch<{ Reply: IReply }>('/auth/user', {
		config: { 
		  auth: true, 
		  roles: ['user', 'admin']
		}},
		patchUser);

	fastify.delete<{ Reply: IReply }>('/auth/user', {
		config: { 
		  auth: true, 
		  roles: ['user', 'admin']
		}},
		deleteUser);

	fastify.post<{ Reply: IReply }>('/auth/login', {
		config: { 
		  auth: false
		}},
		postLogin);

}
