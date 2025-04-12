import { deletePic, upload } from '../controllers/profil.controllers.js';
import { deleteSchema } from '../schemas/profil.schemas.js';
export default async function authRoutes(fastify) {
    fastify.post('/profil/uploads', {
        // schema: uploadSchema,
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, upload);
    fastify.delete('/profil/uploads', {
        schema: deleteSchema,
        config: {
            auth: true,
            roles: ['user', 'admin']
        }
    }, deletePic);
}
