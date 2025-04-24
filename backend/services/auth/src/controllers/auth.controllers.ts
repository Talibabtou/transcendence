import { FastifyRequest, FastifyReply } from 'fastify';
import { IId } from '../shared/types/api.types.js';
import {
    createErrorResponse,
    ErrorCodes,
} from '../shared/constants/error.const.js';
import {
    IAddUser,
    ILogin,
    IModifyUser,
    IReplyGetUser,
    IReplyGetUsers,
    IReplyLogin,
} from '../shared/types/auth.types.js';

export async function getUsers(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    try {
        const users: IReplyGetUsers[] = await request.server.db.all(
            'SELECT username, email, id FROM users'
        );
        if (!users) {
            const errorMessage = createErrorResponse(
                404,
                ErrorCodes.PLAYER_NOT_FOUND
            );
            return reply.code(404).send(errorMessage);
        }
        return reply.code(200).send(users);
    } catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(
            500,
            ErrorCodes.INTERNAL_ERROR
        );
        return reply.code(500).send(errorMessage);
    }
}

export async function getUser(
    request: FastifyRequest<{ Params: IId }>,
    reply: FastifyReply
): Promise<void> {
    try {
        const id = request.params.id;
        const user: IReplyGetUser | undefined = await request.server.db.get(
            'SELECT username, email, id FROM users WHERE id = ?',
            [id]
        );
        if (!user) {
            const errorMessage = createErrorResponse(
                404,
                ErrorCodes.PLAYER_NOT_FOUND
            );
            return reply.code(404).send(errorMessage);
        }
        return reply.code(200).send(user);
    } catch (err) {
        if (err instanceof Error && err.message.includes('SQLITE_MISMATCH')) {
            const errorMessage = createErrorResponse(
                400,
                ErrorCodes.SQLITE_MISMATCH
            );
            return reply.code(400).send(errorMessage);
        }
        request.server.log.error(err);
        const errorMessage = createErrorResponse(
            500,
            ErrorCodes.INTERNAL_ERROR
        );
        return reply.code(500).send(errorMessage);
    }
}

export async function getUserMe(
    request: FastifyRequest<{ Params: IId }>,
    reply: FastifyReply
): Promise<void> {
    try {
        const id = request.params.id;
        const user: IReplyGetUser | undefined = await request.server.db.get(
            'SELECT username, email, id FROM users WHERE id = ?',
            [id]
        );
        if (!user) {
            const errorMessage = createErrorResponse(
                404,
                ErrorCodes.PLAYER_NOT_FOUND
            );
            return reply.code(404).send(errorMessage);
        }
        return reply.code(200).send(user);
    } catch (err) {
        if (err instanceof Error && err.message.includes('SQLITE_MISMATCH')) {
            const errorMessage = createErrorResponse(
                400,
                ErrorCodes.SQLITE_MISMATCH
            );
            return reply.code(400).send(errorMessage);
        }
        request.server.log.error(err);
        const errorMessage = createErrorResponse(
            500,
            ErrorCodes.INTERNAL_ERROR
        );
        return reply.code(500).send(errorMessage);
    }
}

export async function addUser(
    request: FastifyRequest<{ Body: IAddUser }>,
    reply: FastifyReply
): Promise<void> {
    try {
        const { username, password, email } = request.body;
        const ip = request.headers['from'];
        await request.server.db.run(
            'INSERT INTO users (role, username, password, email, last_ip, created_at) VALUES ("user", ?, ?, ?, ?,CURRENT_TIMESTAMP);',
            [username, password, email, ip]
        );
        const user = await request.server.db.get(
            'SELECT username, email, id FROM users WHERE username = ?',
            [username]
        );
        console.log({ user: user });
        return reply.code(201).send(user);
    } catch (err) {
        if (err instanceof Error) {
            if (err.message.includes('SQLITE_MISMATCH')) {
                const errorMessage = createErrorResponse(
                    400,
                    ErrorCodes.SQLITE_MISMATCH
                );
                return reply.code(400).send(errorMessage);
            } else if (err.message.includes('SQLITE_CONSTRAINT')) {
                const errorMessage = createErrorResponse(
                    409,
                    ErrorCodes.SQLITE_CONSTRAINT
                );
                return reply.code(409).send(errorMessage);
            }
        }
        request.server.log.error(err);
        const errorMessage = createErrorResponse(
            500,
            ErrorCodes.INTERNAL_ERROR
        );
        return reply.code(500).send(errorMessage);
    }
}

export async function modifyUser(
    request: FastifyRequest<{ Body: IModifyUser; Params: IId }>,
    reply: FastifyReply
): Promise<void> {
    try {
        const id = request.params.id;
        const { username, password, email } = request.body;
        const result = await request.server.db.get(
            'SELECT id, username FROM users WHERE id = ?',
            [id]
        );
        if (!result) {
            const errorMessage = createErrorResponse(
                404,
                ErrorCodes.PLAYER_NOT_FOUND
            );
            return reply.code(404).send(errorMessage);
        }
        if (username)
            await request.server.db.run(
                'UPDATE users SET username = ?, updated_at = (CURRENT_TIMESTAMP) WHERE id = ?',
                [username, id]
            );
        else if (password)
            await request.server.db.run(
                'UPDATE users SET password = ?, updated_at = (CURRENT_TIMESTAMP) WHERE id = ?',
                [password, id]
            );
        else
            await request.server.db.run(
                'UPDATE users SET email = ?, updated_at = (CURRENT_TIMESTAMP) WHERE id = ?',
                [email, id]
            );
        return reply.code(200).send();
    } catch (err) {
        if (err instanceof Error) {
            if (err.message.includes('SQLITE_CONSTRAINT')) {
                const errorMessage = createErrorResponse(
                    409,
                    ErrorCodes.SQLITE_CONSTRAINT
                );
                return reply.code(409).send(errorMessage);
            } else if (err.message.includes('SQLITE_MISMATCH')) {
                const errorMessage = createErrorResponse(
                    400,
                    ErrorCodes.SQLITE_MISMATCH
                );
                return reply.code(400).send(errorMessage);
            }
        }
        request.server.log.error(err);
        const errorMessage = createErrorResponse(
            500,
            ErrorCodes.INTERNAL_ERROR
        );
        return reply.code(500).send(errorMessage);
    }
}

export async function deleteUser(
    request: FastifyRequest<{ Params: IId }>,
    reply: FastifyReply
): Promise<void> {
    try {
        const id = request.params.id;
        const result = await request.server.db.get(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );
        if (!result) {
            const errorMessage = createErrorResponse(
                404,
                ErrorCodes.PLAYER_NOT_FOUND
            );
            return reply.code(404).send(errorMessage);
        }
        await request.server.db.run('DELETE FROM users WHERE id = ?', [id]);
        return reply.code(204).send();
    } catch (err) {
        if (err instanceof Error && err.message.includes('SQLITE_MISMATCH')) {
            const errorMessage = createErrorResponse(
                400,
                ErrorCodes.SQLITE_MISMATCH
            );
            return reply.code(400).send(errorMessage);
        }
        request.server.log.error(err);
        const errorMessage = createErrorResponse(
            500,
            ErrorCodes.INTERNAL_ERROR
        );
        return reply.code(500).send(errorMessage);
    }
}

export async function login(
    request: FastifyRequest<{ Body: ILogin }>,
    reply: FastifyReply
): Promise<void> {
    try {
        const { email, password } = request.body;
        const ip = request.headers['from'];
        const data = await request.server.db.get(
            'SELECT id, role, username FROM users WHERE email = ? AND password = ?;',
            [email, password]
        );
        if (!data) {
            const errorMessage = createErrorResponse(
                401,
                ErrorCodes.UNAUTHORIZED
            );
            return reply.code(401).send(errorMessage);
        }
        await request.server.db.run(
            'UPDATE users SET last_login = (CURRENT_TIMESTAMP), last_ip = ? WHERE email = ? AND password = ?',
            [ip, email, password]
        );
        const token: string = request.server.jwt.sign({ id: data.id });
        const user: IReplyLogin = {
            token: token,
            id: data.id,
            role: data.role,
            username: data.username,
        };
        return reply.code(200).send(user);
    } catch (err) {
        request.server.log.error(err);
        const errorMessage = createErrorResponse(
            500,
            ErrorCodes.INTERNAL_ERROR
        );
        return reply.code(500).send(errorMessage);
    }
}
