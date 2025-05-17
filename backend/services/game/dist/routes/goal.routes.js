import { getGoal, getGoals, createGoal } from '../controllers/goal.controller.js';
export default async function goalRoutes(fastify) {
    fastify.get('/goals', getGoals);
    fastify.get('/goal/:id', getGoal);
    fastify.post('/goal/:id', createGoal);
}
