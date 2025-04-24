import { FastifyInstance } from 'fastify';
import {
  getGoal,
  getGoals,
  createGoal,
} from '../controllers/goal.controller.js';
import { IId, CreateGoalRequest } from '../shared/types/goal.type.js';

export default async function goalRoutes(fastify: FastifyInstance) {
  fastify.get('/goal', getGoals);

  fastify.get('/goal/:id', getGoal);

  fastify.post<{ Params: IId, Body: CreateGoalRequest }>('/goal/:id', createGoal);
}
