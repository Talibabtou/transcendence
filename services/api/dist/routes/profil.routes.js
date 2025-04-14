import { deletePic, upload } from '../controllers/profil.controllers.js';
import { deleteSchema, uploadSchema } from '../schemas/profil.schemas.js';
const auth = { auth: true, roles: ['user', 'admin'] };
export default async function authRoutes(fastify) {
    fastify.post('/profil/uploads', {
        schema: uploadSchema,
        config: auth
    }, upload);
    fastify.delete('/profil/uploads', {
        schema: deleteSchema,
        config: auth
    }, deletePic);
}
