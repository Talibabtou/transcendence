// import { FastifyInstance } from 'fastify'
// // import { 
// //   getElo, 
// //   getElos,
// // 	createElo,
// // 	getLeaderboard
// // } from '../controllers/elo.controller.js'

// import { 
//   getEloSchema, 
//   getElosSchema,
// 	createEloSchema
// } from '../schemas/elo.schemas.js'

// export default async function eloRoutes(fastify: FastifyInstance) {
//   // Get all goals with optional filters
//   fastify.get('elo/', { 
//     schema: {
//       ...getElosSchema,
//       tags: ['elos']
//     }
//   }, 
// )
  
// 	// make it only accessible from auth service
// 	fastify.post('elo/', { 
//     schema: {
//       ...createEloSchema,
//       tags: ['elos']
//     }
//   }, 
// )


//   // Get a specific goal by ID
//   fastify.get('elo/:id', { 
//     schema: {
//       ...getEloSchema,
//       tags: ['elos']
//     }
//   },
// )

// 	fastify.get('elo/leaderboard', { 
//     schema: {
//       tags: ['elos']
//     }
//   },
// )
// }



