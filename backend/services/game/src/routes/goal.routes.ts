import { FastifyInstance } from 'fastify'
import { 
  getGoal, 
  getGoals, 
  createGoal 
} from '../controllers/goal.controller.js'
import { 
  getGoalSchema, 
  getGoalsSchema, 
  createGoalSchema 
} from '../schemas/goal.schema.js'

export default async function goalRoutes(fastify: FastifyInstance) {
  // Get all goals with optional filters
  fastify.get('/', { 
    schema: {
      ...getGoalsSchema,
      tags: ['goals']
    }
  }, getGoals)
  
  // Get a specific goal by ID
  fastify.get('/:id', { 
    schema: {
      ...getGoalSchema,
      tags: ['goals']
    }
  }, getGoal)
  
  // Create a new goal
  fastify.post('/', { 
    schema: {
      ...createGoalSchema,
      tags: ['goals']
    }
  }, createGoal)
}
