// import { FastifyInstance } from 'fastify'
// // import { 
// //   getMatch, 
// //   getMatches, 
// //   createMatch,
// // 	matchTimeline,
// // 	matchStats,
// // 	matchSummary
// // } from '../controllers/match.controller.js'
// import { 
//   getMatchSchema, 
//   getMatchesSchema, 
//   createMatchSchema,
// 	matchTimelineSchema,
// 	matchStatsSchema,
// 	matchSummarySchema
// } from '../schemas/match.schemas.js'

// export default async function matchRoutes(fastify: FastifyInstance): Promise<void> {
//   // Get all matches with optional filters
//   fastify.get('match/', { 
//     schema: {
//       ...getMatchesSchema,
//       tags: ['matches']
//     }
//   },
// )
  
//   // Get a specific match by ID
//   fastify.get('match/:id', { 
//     schema: {
//       ...getMatchSchema,
//       tags: ['matches']
//     }
//   },
// )
  
//   // Create a new match
//   fastify.post('match/', {
//     schema: {
//       ...createMatchSchema,
//       tags: ['matches']
//     },
//   },
// )

// 	fastify.get('match/:id/stats', { 
//     schema: {
//       ...matchTimelineSchema,
//       tags: ['matches']
//     }
//   },
// )

// 	fastify.get('match/stats/:id', { 
//     schema: {
//       ...matchStatsSchema,
//       tags: ['matches']
//     }
//   },
// )

// 	fastify.get('match/summary/:id', { 
//     schema: {
//       ...matchSummarySchema,
//       tags: ['matches']
//     }
//   },
// )
// }
