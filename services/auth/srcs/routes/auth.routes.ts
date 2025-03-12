import { createUserSchema, loginSchema, getIdUserSchema, modifyUserSchema } from '../schemas/auth.schemas.js';
import { FastifyInstance } from 'fastify';
import { ICreateUser, ILogin, IGetIdUser, IModifyUser } from '../types/auth.types.js';
import { addUser, getUsers, getUser, deleteUser, modifyUser, login } from '../controllers/auth.controllers.js';

const jwt = { auth: true };
const noJwt = { auth: false };

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.get('/auth',
    { config: jwt },
    getUsers);

  fastify.get<{ Params: IGetIdUser }>('/auth/:id',
    { schema: getIdUserSchema, config: jwt },
    getUser);

  fastify.post<{ Body: ICreateUser }>('/auth',
    { schema: createUserSchema, config: noJwt },
    addUser);

  fastify.patch<{ Params: IGetIdUser, Body: IModifyUser }>('/auth/:id',
    { schema: { ...getIdUserSchema, ...modifyUserSchema}, config: jwt },
    modifyUser)
  
  fastify.delete<{ Params: IGetIdUser }>('/auth/:id',
    { schema: getIdUserSchema, config: jwt },
    deleteUser);

  fastify.post<{ Body: ILogin }>('/login',
    { schema: loginSchema, config: noJwt },
    login);
}
