import { createErrorResponse, ErrorCodes } from '../shared/constants/error.const.js';
export async function getFriends(request, reply) {
    try {
        const friends = await request.server.db.all(`
        SELECT 
          CASE 
            WHEN id_1 = ? THEN id_2 
            ELSE id_1 
          END AS id, 
          accepted, 
          created_at 
        FROM friends`, [request.user.id]);
        console.log({ friends });
        if (!friends) {
            const errorMessage = createErrorResponse(404, ErrorCodes.PLAYER_NOT_FOUND);
            return reply.code(404).send(errorMessage);
        }
        return reply.code(200).send({ friends });
    }
    catch (err) {
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
export async function postFriend(request, reply) {
    try {
        const id = request.body;
        // const result = 'SELECT \
        // CASE WHEN EXISTS (SELECT 1 FROM amis WHERE (id_1 = 1 AND id_2 = 2) OR (id_1 = 2 AND id_2 = 1)) \
        //   THEN true \
        //   ELSE false \
        // END';
        // console.log({ exist: result });
        await request.server.db.run('INSERT INTO friends (id_1, id_2, accepted, created_at) VALUES (?, ?, false, CURRENT_TIMESTAMP);', [request.user.id, id]);
        return reply.code(201).send();
    }
    catch (err) {
        if (err instanceof Error) {
            if (err.message.includes('SQLITE_MISMATCH')) {
                const errorMessage = createErrorResponse(400, ErrorCodes.SQLITE_MISMATCH);
                return reply.code(400).send(errorMessage);
            }
            else if (err.message.includes('SQLITE_CONSTRAINT')) {
                const errorMessage = createErrorResponse(409, ErrorCodes.SQLITE_CONSTRAINT);
                return reply.code(409).send(errorMessage);
            }
        }
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
export async function patchFriend(request, reply) {
    try {
        const friends = await request.server.db.all('SELECT * FROM friends');
        if (!friends) {
            const errorMessage = createErrorResponse(404, ErrorCodes.PLAYER_NOT_FOUND);
            return reply.code(404).send(errorMessage);
        }
        return reply.code(200).send({ friends });
    }
    catch (err) {
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
export async function deleteFriend(request, reply) {
    try {
        const friends = await request.server.db.all('SELECT * FROM friends');
        if (!friends) {
            const errorMessage = createErrorResponse(404, ErrorCodes.PLAYER_NOT_FOUND);
            return reply.code(404).send(errorMessage);
        }
        return reply.code(200).send({ friends });
    }
    catch (err) {
        const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
        return reply.code(500).send(errorMessage);
    }
}
