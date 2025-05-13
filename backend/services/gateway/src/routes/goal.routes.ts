import { FastifyInstance } from 'fastify';
import { IId } from '../shared/types/gateway.types.js';
import { CreateGoalRequest, GetGoalsQuery } from '../shared/types/goal.type.js';
import { getGoal, getGoals, createGoal } from '../controllers/goal.controller.js';
import { getGoalSchema, getGoalsSchema, createGoalSchema } from '../schemas/goal.schemas.js';

const auth = { auth: true, roles: ['user', 'admin'] };

export default async function goalRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: GetGoalsQuery }>(
    '/game/goals',
    {
      schema: {
        ...getGoalsSchema,
        tags: ['goals'],
      },
      config: auth,
    },
    getGoals
  );

  fastify.get<{ Params: IId }>(
    '/game/goal/:id',
    {
      schema: {
        ...getGoalSchema,
        tags: ['goals'],
      },
      config: auth,
    },
    getGoal
  );

  fastify.post<{ Params: IId; Body: CreateGoalRequest }>(
    '/game/goal/:id',
    {
      schema: {
        ...createGoalSchema,
        tags: ['goals'],
      },
      config: auth,
    },
    createGoal
  );
}
