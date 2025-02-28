import { regSchema, RegSchemaType, loginSchema, LoginSchemaType } from '../schemas/auth.schema.js';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { fpSqlitePlugin } from "fastify-sqlite-typed";
import path from 'path';

async function authRoutes(fastify: FastifyInstance) {
    fastify.register(fpSqlitePlugin, {
        dbFilename: path.join(path.resolve(), "db/auth.db")
      });

    fastify.get('/auth', (request: any, reply: any) => {
        try {
            const isHttps = request.protocol === 'https';
            return reply.code(200).send({
                hello: "world",
                method: request.method,
                isHttps: isHttps,
                message: {message: "user get"}
            });
        } catch (e: any) {
            return reply.code(500).send({ error: e.message });
        }
    })

    fastify.post('/auth', (request: any, reply: any) => {
        try {
            const isHttps = request.protocol === 'https';
            const { username, password, email } = regSchema.parse(request.query);
            fastify.db.run(
                'INSERT INTO auth (username, password, email) VALUES (?, ?, ?);',
                username,
                password,
                email
              );
            return reply.code(200).send({
                hello: "world",
                method: request.method,
                isHttps: isHttps,
                message: {message: "user added successfully"}
            });
        } catch (e: any) {
            return reply.code(500).send({ error: e.message });
        }
    })

    fastify.delete('/auth',(request: any, reply: any) => {
        try {
            const isHttps = request.protocol === 'https';
            return reply.code(200).send({
                hello: "world",
                method: request.method,
                isHttps: isHttps,
                message: [{message: "/test1 route"}, {schema: 'null'}]
            });
        } catch (e: any) {
            return reply.code(500).send({ error: e.message });
        }
    })
}

export default authRoutes;