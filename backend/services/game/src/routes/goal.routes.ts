import { FastifyInstance } from 'fastify'
import { 
  getGoal, 
  getGoals, 
  createGoal 
} from '../controllers/goal.controller.js'

export default async function goalRoutes(fastify: FastifyInstance) {
  fastify.get('/goal/',
  getGoals)

  fastify.get('/goal/:id',
  getGoal)

  fastify.post('/goal/',
  createGoal)
}
