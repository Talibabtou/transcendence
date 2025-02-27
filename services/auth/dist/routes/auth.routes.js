import { regSchema, loginSchema } from '../schemas/auth.schema.js';
import { fpSqlitePlugin } from "fastify-sqlite-typed";
import path from 'path';
async function authRoutes(fastify) {
    fastify.register(fpSqlitePlugin, {
        dbFilename: path.join(path.resolve(), "db/auth.db")
    });
    fastify.get('/auth', (request, reply) => {
        try {
            const isHttps = request.protocol === 'https';
            return reply.code(200).send({
                hello: "world",
                method: request.method,
                isHttps: isHttps,
                message: [{ message: "/test1 route" }, { schema: loginSchema.parse(request.query) }]
            });
        }
        catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });
    fastify.post('/auth', (request, reply) => {
        try {
            const isHttps = request.protocol === 'https';
            const { username, password, email } = regSchema.parse(request.query);
            fastify.db.all('INSERT INTO auth (username, password, email) VALUES (?, ?, ?);', username, password, email);
            return reply.code(200).send({
                hello: "world",
                method: request.method,
                isHttps: isHttps,
                message: { message: "user added" }
            });
        }
        catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });
    fastify.delete('/auth', (request, reply) => {
        try {
            const isHttps = request.protocol === 'https';
            return reply.code(200).send({
                hello: "world",
                method: request.method,
                isHttps: isHttps,
                message: [{ message: "/test1 route" }, { schema: 'null' }]
            });
        }
        catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });
}
export default authRoutes;
