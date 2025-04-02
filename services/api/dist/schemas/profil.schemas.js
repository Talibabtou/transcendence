export {};
// export const uploadSchema = {
//     consumes: ['multipart/form-data'],
//     body: {
//       type: 'object',
//       required: ['file'], 
//       properties: {
//         file: { 
//           type: 'string',
//           format: 'binary'
//         },
//         description: { type: 'string' }
//       }
//     },
//     response: {
//       200: {
//         body: {
//         type: 'object',
//         properties: {
//           link: { type: 'string' }
//         },
//         required: ['link'],
//         additionalProperties: false
//       }},
//       404: {
//         ...errorResponseSchema,
//         example: ErrorExamples.playerNotFound
//       },
//       500: {
//         ...errorResponseSchema,
//         example: ErrorExamples.internalError
//       }
//     }
//   };
