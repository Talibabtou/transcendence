import { FastifyInstance } from 'fastify';
import { createUserSchema, loginSchema, modifyUserSchema } from '../schemas/auth.schemas.js';
import { ICreateUser, ILogin, IModifyUser, IReply } from '../types/auth.types.js';
import { addUser, getUsers, getUser, deleteUser, modifyUser, login } from '../controllers/auth.controllers.js';

const jwt = { auth: true };
const noJwt = { auth: false };

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Reply: IReply }>('/users',
    { config: jwt },
    getUsers);

  fastify.get<{ Reply: IReply }>('/user',
    { config: jwt },
    getUser);

  fastify.post<{ Body: ICreateUser, Reply: IReply }>('/user',
    { schema: createUserSchema, config: noJwt },
    addUser);

  fastify.patch<{ Body: IModifyUser, Reply: IReply }>('/user',
    { schema: modifyUserSchema, config: jwt },
    modifyUser)
  
  fastify.delete<{ Reply: IReply }>('/user',
    { config: jwt },
    deleteUser);

  fastify.post<{ Body: ILogin, Reply: IReply }>('/login',
    { schema: loginSchema, config: noJwt },
    login);
}
