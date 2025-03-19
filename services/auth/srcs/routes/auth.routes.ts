import { FastifyInstance } from 'fastify';
import { createUserSchema, loginSchema, getIdUserSchema, modifyUserSchema } from '../schemas/auth.schemas.js';
import { ICreateUser, ILogin, IGetIdUser, IModifyUser, IReply } from '../types/auth.types.js';
import { addUser, getUsers, getUser, deleteUser, modifyUser, login } from '../controllers/auth.controllers.js';

const jwt = { auth: true };
const noJwt = { auth: false };

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Reply: IReply }>('/users',
    { config: jwt },
    getUsers);

  fastify.get<{ Params: IGetIdUser, Reply: IReply }>('/user/:id',
    { schema: getIdUserSchema, config: jwt },
    getUser);

  fastify.post<{ Body: ICreateUser, Reply: IReply }>('/users',
    { schema: createUserSchema, config: noJwt },
    addUser);

  fastify.patch<{ Params: IGetIdUser, Body: IModifyUser, Reply: IReply }>('/user/:id',
    { schema: { ...getIdUserSchema, ...modifyUserSchema}, config: jwt },
    modifyUser)
  
  fastify.delete<{ Params: IGetIdUser, Reply: IReply }>('/user/:id',
    { schema: getIdUserSchema, config: jwt },
    deleteUser);

  fastify.post<{ Body: ILogin, Reply: IReply }>('/login',
    { schema: loginSchema, config: noJwt },
    login);
}
