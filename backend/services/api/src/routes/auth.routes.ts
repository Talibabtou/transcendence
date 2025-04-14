import { FastifyInstance } from 'fastify';
import { IAddUser, ILogin, IModifyUser } from '../shared/types/auth.types.js';
import { getUsers, getUser, getUserMe, postUser, patchUser, deleteUser, postLogin } from '../controllers/auth.controllers.js'
import { getUserSchema, getUserMeSchema, getUsersSchema, deleteUserSchema, createUserSchema, modifyUserSchema, loginSchema } from '../schemas/auth.schemas.js';

const auth = { auth: true, roles: ['user', 'admin'] }

export default async function authRoutes(fastify: FastifyInstance) {
	fastify.get('/auth/users', {
		schema: getUsersSchema,
		config: auth
		},
		getUsers);	
	
	fastify.get<{ Params: { id: string }}>('/auth/user/:id', {
		schema: getUserSchema,
		config: auth
		},
		getUser);
	
	fastify.get('/auth/user/me', {
		schema: getUserMeSchema,
		config: auth
		},
		getUserMe);

	fastify.post<{ Body: IAddUser }>('/auth/register', {
		schema: createUserSchema
		},
		postUser);

	fastify.patch<{ Body: IModifyUser }>('/auth/user', {
		schema: modifyUserSchema,
		config: auth
		},
		patchUser);

	fastify.delete('/auth/user', {
		schema: deleteUserSchema,
		config: auth
		},
		deleteUser);

	fastify.post<{ Body: ILogin }>('/auth/login', {
		schema: loginSchema,
		},
		postLogin);

}
