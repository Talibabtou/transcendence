import { FastifyInstance } from 'fastify';
import { IId } from '../shared/types/gateway.types.js';
import { CreateGoalRequest, GetGoalsQuery } from '../shared/types/goal.type.js';
import { getGoal, getGoals, createGoal } from '../controllers/goal.controller.js';
import { routesConfigAuth, rateLimitConfigHigh } from '../config/routes.config.js';
import { getGoalSchema, getGoalsSchema, createGoalSchema } from '../schemas/goal.schemas.js';

export default async function goalRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: GetGoalsQuery }>(
    '/game/goals',
    {
      schema: {
        ...getGoalsSchema,
        tags: ['goals'],
      },
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigHigh,
      },
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
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigHigh,
      },
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
      config: {
        ...routesConfigAuth,
        rateLimit: rateLimitConfigHigh,
      },
    },
    createGoal
  );
}
