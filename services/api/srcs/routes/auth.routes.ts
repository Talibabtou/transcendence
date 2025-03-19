import { FastifyInstance } from 'fastify';
import { getUsers, getUser, postUser, patchUser, deleteUser, postLogin } from '../controllers/auth.controllers.js'
import { IReply } from '../types/types.js'

const jwt = { auth: true };
const noJwt = { auth: false };

export default async function authRoutes(fastify: FastifyInstance) {
  
	fastify.get<{ Reply: IReply }>('/auth/user/:id', 
		{ config: jwt },
		getUser);

	fastify.get<{ Reply: IReply }>('/auth/users', 
		{ config: jwt },
		getUsers);

	fastify.post<{ Reply: IReply }>('/auth/user', 
		{ config: noJwt },
		postUser);

	fastify.patch<{ Reply: IReply }>('/auth/user/:id',
		{ config: jwt },
		patchUser);

	fastify.delete<{ Reply: IReply }>('/auth/user/:id',
		{ config: jwt },
		deleteUser);

	fastify.post<{ Reply: IReply }>('/auth/login',
		{ config: noJwt },
		postLogin);

}
