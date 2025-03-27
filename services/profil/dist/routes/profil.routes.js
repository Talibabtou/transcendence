import { upload, deletePic } from '../controllers/profil.controllers.js';
export default async function profilRoutes(fastify) {
    fastify.post('/uploads', { config: {
            auth: false,
            // roles: ['user', 'admin']
        } }, upload);
    fastify.delete('/uploads', { config: {
            auth: false,
            // roles: ['user', 'admin']
        } }, deletePic);
    fastify.get('/check', {
        config: {
            auth: false
        }
    }, (request, reply) => { reply.code(204).send(); });
}
