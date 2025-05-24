import { FastifyInstance } from 'fastify';
import { IId, CreateGoalRequest } from '../shared/types/goal.type.js';
import { getGoal, getGoals, createGoal } from '../controllers/goal.controller.js';

export default async function goalRoutes(fastify: FastifyInstance) {
  fastify.get('/goals', getGoals);

  fastify.get('/goal/:id', getGoal);

  fastify.post<{ Params: IId; Body: CreateGoalRequest }>('/goal/:id', createGoal);
}
