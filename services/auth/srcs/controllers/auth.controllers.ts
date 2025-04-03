import { FastifyRequest, FastifyReply } from 'fastify';
import { IAddUser, ILogin, IModifyUser, IReplyLogin } from '../types/auth.types.js'

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string;
      username: string;
      role: string;
    };
  }
}

export async function addUser(request: FastifyRequest<{ Body: IAddUser }>, reply: FastifyReply): Promise<void> {
    try {
      const { username, password, email } = request.body;
      await request.server.db.run('INSERT INTO users (role, username, password, email, created_at) VALUES ("user", ?, ?, ?, CURRENT_TIMESTAMP);', [username, password, email]);
      return reply.code(201).send();
    } catch (err: any) {
      if (err.message.includes('SQLITE_MISMATCH'))
        return reply.code(400).send();
      else if (err.message.includes('SQLITE_CONSTRAINT'))
        return reply.code(409).send();
      return reply.code(500).send();
    }
}

export async function getUsers(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const users: any  = await request.server.db.all('SELECT username, email FROM users');
      if (!users)
        return reply.code(404).send();
      return reply.code(200).send({ users: users });
    } catch (err: any) {
      return reply.code(500).send();
    }
}

export async function getUser(request: FastifyRequest<{ Params: { id: string }}>, reply: FastifyReply): Promise<void> {
    try {
      const id: string = request.params.id;
      const user: any = await request.server.db.get('SELECT username, email FROM users WHERE id = ?', [id]);
      if (!user)
        return reply.code(404).send();
      return reply.code(200).send({ user: user });
    } catch (err: any) {
      if (err.message.includes('SQLITE_MISMATCH'))
        return reply.code(400).send();
      return reply.code(500).send();
    }
}

export async function deleteUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const result: any = await request.server.db.get('SELECT * FROM users WHERE id = ?', [request.user.id]);
      if (!result)
        return reply.code(404).send();
      await request.server.db.run('DELETE FROM users WHERE id = ?', [request.user.id]);
      return reply.code(204).send();
    } catch (err: any) {
      if (err.message.includes('SQLITE_MISMATCH'))
        return reply.code(400).send();
      return reply.code(500).send();
    }
}

export async function modifyUser(request: FastifyRequest<{ Body: IModifyUser }>, reply: FastifyReply): Promise<void> {
    try {
        const { username, password, email } = request.body;
        let result: any = await request.server.db.get('SELECT id, username FROM users WHERE id = ?', [request.user.id]);
        if (!result)
          return reply.code(404).send();
        if (username)
          await request.server.db.run('UPDATE users SET username = ?, updated_at = (CURRENT_TIMESTAMP) WHERE id = ?', [username, request.user.id]);
        else if (password)
          await request.server.db.run('UPDATE users SET password = ?, updated_at = (CURRENT_TIMESTAMP) WHERE id = ?', [password, request.user.id]);
        else
          await request.server.db.run('UPDATE users SET email = ?, updated_at = (CURRENT_TIMESTAMP) WHERE id = ?', [email, request.user.id]);
        return reply.code(200).send();
    } catch (err: any) {
        if (err.message.includes('SQLITE_CONSTRAINT'))
          return reply.code(409).send();
        else if (err.message.includes('SQLITE_MISMATCH'))
          return reply.code(400).send();
        return reply.code(500).send();
    }
}

export async function login(request: FastifyRequest<{ Body: ILogin }>, reply: FastifyReply): Promise<void> {
  try {
    const { email, password } = request.body;
    const data = await request.server.db.get('SELECT id, role, username FROM users WHERE email = ? AND password = ?;', [email, password]);
    if (data == undefined)
      return reply.code(401).send();
    await request.server.db.run('UPDATE users SET last_login = (CURRENT_TIMESTAMP) WHERE email = ? AND password = ?', [email, password]);
    const token: string = request.server.jwt.sign( { id: data.id, role: data.role} );
    console.log({ token: token });
    const user: IReplyLogin = {
      id: data.id,
      role: data.role,
      username: data.username,
      token: token
    };
    return reply.code(200).send({ user });
  } catch (err: any) {
    return reply.code(500).send();
  }
}
