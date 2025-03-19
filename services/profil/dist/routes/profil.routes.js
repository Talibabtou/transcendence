import { getPic, upload, deletePic } from '../controllers/profil.controllers.js';
const jwt = { auth: true };
const noJwt = { auth: false };
export default async function profilRoutes(fastify) {
    fastify.post('/upload', { config: jwt }, upload);
    fastify.get('/pic/:id', { config: noJwt }, getPic);
    fastify.delete('/pic', { config: jwt }, deletePic);
}
