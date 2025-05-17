import { getGoal, getGoals, createGoal } from '../controllers/goal.controller.js';
import { getGoalSchema, getGoalsSchema, createGoalSchema } from '../schemas/goal.schemas.js';
const auth = { auth: true, roles: ['user', 'admin'] };
export default async function goalRoutes(fastify) {
    fastify.get('/game/goals', {
        schema: {
            ...getGoalsSchema,
            tags: ['goals'],
        },
        config: auth,
    }, getGoals);
    fastify.get('/game/goal/:id', {
        schema: {
            ...getGoalSchema,
            tags: ['goals'],
        },
        config: auth,
    }, getGoal);
    fastify.post('/game/goal/:id', {
        schema: {
            ...createGoalSchema,
            tags: ['goals'],
        },
        config: auth,
    }, createGoal);
}
