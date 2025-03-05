import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ICreateUser, ILogin, IGetIdUser } from '../types/auth.types.js';

export async function addUser(request: FastifyRequest<{ Body: ICreateUser }>, reply: FastifyReply) {
    try {
        const { username, password, email } = request.body;
        await request.server.db.run(
            'INSERT INTO users (username, password, email, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP);',
            [username, password, email]
          );
        return reply.code(201).send({
            code: 201,
            status: 'success',
            message: 'User created successfully'
        });
    }  catch (err: any) {
        if (err.code === 'SQLITE_CONSTRAINT') {
            if (err.message.includes('users.email')) {
                return reply.code(409).send({
                    code: 409,
                    status: 'failed',
                    message: 'Email already exists',
                    error: err.message
                });
            }
            else if (err.message.includes('users.username')) {
                return reply.code(409).send({
                    code: 409,
                    status: 'failed',
                    message: 'Username already exists',
                    error: err.message
                });
            }
            return reply.code(409).send({
                code: 409,
                status: 'failed',
                message: 'Unique constraint violation',
                error: err.message
            });
        }
        return reply.code(500).send({
            code: 500,
            status: 'failed',
            message: 'Internal server error',
            error: err.message
        });
    }
}

export async function getUsers(request: FastifyRequest, reply: FastifyReply) {
    try {
        const users = await request.server.db.all('SELECT * FROM users');
        return reply.code(200).send({
            code: 200,
            status: 'success',
            data: users
        });
    } catch (err: any) {
        return reply.code(500).send({
            code: 500,
            status: 'failed',
            message: 'Internal server error',
            error: err.message
        });
    }
}

export async function getUser(request: FastifyRequest<{Params: IGetIdUser}>, reply: FastifyReply) {
    try {
        const { id } = request.params;
        const user = await request.server.db.get('SELECT * FROM users WHERE id = ?', [id]);
        if (!user) {
            return reply.code(404).send({
                code: 404,
                status: 'failed',
                message: 'User not found'
            });
        }
        return reply.code(200).send({
            code: 200,
            status: 'success',
            data: user
        });
    } catch (err: any) {
        if (err.message.includes('SQLITE_MISMATCH')) {
            return reply.code(400).send({
                code: 400,
                status: 'failed',
                message: 'Invalid ID format',
                error: err.message
            });
        }
        return reply.code(500).send({
            code: 500,
            status: 'failed',
            message: 'Internal server error',
            error: err.message
        });
    }
}

export async function deleteUser(request: FastifyRequest<{Params: IGetIdUser}>, reply: FastifyReply) {
    try {
        const { id } = request.params;
        const user = await request.server.db.get('SELECT * FROM users WHERE id = ?', [id]);
        if (!user) {
            return reply.code(404).send({
                code: 404,
                status: 'failed',
                message: 'User not found'
            });
        }
        await request.server.db.run('DELETE FROM users WHERE id = ?', [id]);
        return reply.code(200).send({
            code: 200,
            status: 'success',
            message: 'User deleted successfully'
        });
    } catch (err: any) {
        if (err.message.includes('SQLITE_MISMATCH')) {
            return reply.code(400).send({
                code: 400,
                status: 'failed',
                message: 'Invalid ID format',
                error: err.message
            });
        }
        return reply.code(500).send({
            code: 500,
            status: 'failed',
            message: 'Internal server error',
            error: err.message
        });
    }
}
