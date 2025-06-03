import { FastifyInstance } from 'fastify';
import { IId } from '../shared/types/gateway.types.js';
import { CreateGoalRequest } from '../shared/types/goal.type.js';
import { getGoal, createGoal } from '../controllers/goal.controller.js';
import { routesConfigAuth, rateLimitConfigHigh } from '../config/routes.config.js';
import { getGoalSchema, createGoalSchema } from '../schemas/goal.schemas.js';

export default async function goalRoutes(fastify: FastifyInstance) {

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
