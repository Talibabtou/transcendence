import { createUserSchema, loginSchema, getIdUserSchema } from '../schemas/auth.schemas.js';
import { FastifyInstance } from 'fastify';
import { ICreateUser, ILogin, IGetIdUser } from '../types/auth.types.js';
import { addUser, getUsers, getUser, deleteUser } from '../controllers/auth.controllers.js';

async function authRoutes(fastify: FastifyInstance) {
  fastify.get('/auth', getUsers);
  fastify.get<{ Params: IGetIdUser }>('/auth/:id', { schema: { params: getIdUserSchema }}, getUser);
  fastify.post<{ Body: ICreateUser }>('/auth', { schema: { body: createUserSchema }}, addUser);
  fastify.put<{ Params: IGetIdUser }>('/auth/:id', { schema: { params: getIdUserSchema }}, async (request: any, reply: any) => {
    reply.code(200).send({ 
      status: "success",
      message: "PUT /auth/:id reached"
    })
  });
  fastify.delete<{ Params: IGetIdUser }>('/auth/:id', { schema: { params: getIdUserSchema }}, deleteUser);
}

export default authRoutes;