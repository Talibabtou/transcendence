import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createUserSchema, loginSchema, modifyUserSchema } from '../schemas/auth.schemas.js';
import { ICreateUser, ILogin, IModifyUser, IReply } from '../types/auth.types.js';
import { addUser, getUsers, getUser, deleteUser, modifyUser, login } from '../controllers/auth.controllers.js';

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Reply: IReply }>('/users', {
    config: { 
      auth: true, 
      roles: ['user', 'admin']
    }},
    getUsers);

  fastify.get<{ Reply: IReply }>('/user', {
    config: { 
      auth: true, 
      roles: ['user', 'admin']
    }},
    getUser);

  fastify.post<{ Body: ICreateUser, Reply: IReply }>('/user', {
    schema: createUserSchema,
    config: { 
      auth: false
    }},
    addUser);

  fastify.patch<{ Body: IModifyUser, Reply: IReply }>('/user', {
    schema: modifyUserSchema,
    config: { 
      auth: true, 
      roles: ['user', 'admin']
    }},
    modifyUser)
  
  fastify.delete<{ Reply: IReply }>('/user', {
    config: { 
      auth: true, 
      roles: ['user', 'admin']
    }},
    deleteUser);

  fastify.post<{ Body: ILogin, Reply: IReply }>('/login', {
    schema: loginSchema,
    config: { 
      auth: false
    }},
    login);

  fastify.get('/check', {
    config: { 
      auth: false
    }},
    (request: FastifyRequest, reply: FastifyReply) => { reply.code(204).send(); });
}
