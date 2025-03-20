import { deletePic, upload } from '../controllers/profil.controllers.js';
const jwt = { auth: true };
const noJwt = { auth: false };
export default async function authRoutes(fastify) {
    fastify.post('/profil/uploads', { config: jwt }, upload);
    fastify.delete('/profil/uploads', { config: jwt }, deletePic);
}
