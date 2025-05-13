import { deletePic, postPic, getSummary } from '../controllers/profile.controller.js';
import { deleteSchema, uploadSchema } from '../schemas/profile.schemas.js';
const auth = { auth: true, roles: ['user', 'admin'] };
export default async function profileRoutes(fastify) {
    fastify.get('/profile/summary/:id', {
        // schema: {
        //   ...summarySchema,
        //   tags: ['profile'],
        // },
        config: auth,
    }, getSummary);
    fastify.post('/profile/uploads', {
        schema: {
            ...uploadSchema,
            tags: ['profile'],
        },
        config: auth,
    }, postPic);
    fastify.delete('/profile/uploads', {
        schema: {
            ...deleteSchema,
            tags: ['profile'],
        },
        config: auth,
    }, deletePic);
}
