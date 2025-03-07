import { createUserSchema, loginSchema, getIdUserSchema, modifyUserSchema } from '../schemas/auth.schemas.js';
import { FastifyInstance } from 'fastify';
import { ICreateUser, ILogin, IGetIdUser, IModifyUser } from '../types/auth.types.js';
import { addUser, getUsers, getUser, deleteUser, modifyUser, login } from '../controllers/auth.controllers.js';

async function authRoutes(fastify: FastifyInstance) {
  fastify.get('/auth', getUsers);
  fastify.get<{ Params: IGetIdUser }>('/auth/:id', { schema: { params: getIdUserSchema }}, getUser);
  fastify.post<{ Body: ICreateUser }>('/auth', { schema: { body: createUserSchema }}, addUser);
  fastify.put<{ Params: IGetIdUser, Body: IModifyUser }>('/auth/:id', { schema: { params: getIdUserSchema, body: modifyUserSchema }}, modifyUser)
  fastify.delete<{ Params: IGetIdUser }>('/auth/:id', { schema: { params: getIdUserSchema }}, deleteUser);
  fastify.post<{ Body: ILogin }>('/login', { schema: { body: loginSchema }}, login);
}

export default authRoutes;