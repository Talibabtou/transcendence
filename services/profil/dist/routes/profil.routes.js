import { upload, deletePic } from '../controllers/profil.controllers.js';
const jwt = { auth: true };
const noJwt = { auth: false };
export default async function profilRoutes(fastify) {
    fastify.post('/uploads', { config: jwt }, upload);
    fastify.delete('/uploads', { config: jwt }, deletePic);
}
