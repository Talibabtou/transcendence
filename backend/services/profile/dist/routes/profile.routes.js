import { postPic, deletePic, getSummary, getPic, getHistory } from '../controllers/profile.controller.js';
export default async function profilRoutes(fastify) {
    fastify.get('/pics/:id', getPic);
    fastify.get('/summary/:id', getSummary);
    fastify.get('/history/: id', getHistory);
    fastify.post('/uploads/:id', postPic);
    fastify.delete('/uploads/:id', deletePic);
    fastify.get('/health', (request, reply) => {
        reply.code(204).send();
    });
}
