import { upload, deletePic } from '../controllers/profil.controllers.js';
export default async function profilRoutes(fastify) {
    fastify.post('/uploads/:id', upload);
    fastify.delete('/uploads/id', deletePic);
    fastify.get('/health', (request, reply) => { reply.code(204).send(); });
}
