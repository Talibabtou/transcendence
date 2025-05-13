import { postPic, deletePic, getSummary } from '../controllers/profile.controller.js';
export default async function profilRoutes(fastify) {
    fastify.get('/uploads/:id', getSummary);
    fastify.post('/uploads/:id', postPic);
    fastify.delete('/uploads/:id', deletePic);
    fastify.get('/health', (request, reply) => {
        reply.code(204).send();
    });
}
