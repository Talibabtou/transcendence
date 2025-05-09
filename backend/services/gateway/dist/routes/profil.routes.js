import { deletePic, upload } from '../controllers/profil.controller.js';
import { deleteSchema, uploadSchema } from '../schemas/profil.schemas.js';
const auth = { auth: true, roles: ['user', 'admin'] };
export default async function profilRoutes(fastify) {
    fastify.post('/profil/uploads', {
        schema: {
            ...uploadSchema,
            tags: ['profil'],
        },
        config: auth,
    }, upload);
    fastify.delete('/profil/uploads', {
        schema: {
            ...deleteSchema,
            tags: ['profil'],
        },
        config: auth,
    }, deletePic);
}
