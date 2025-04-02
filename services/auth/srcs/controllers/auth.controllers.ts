import { FastifyRequest, FastifyReply } from 'fastify';
import { IAddUser, ILogin, IModifyUser, IReply } from '../types/auth.types.js'

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
      return reply.code(201).send({ 
        success: true,
        message: 'User created successfully'
      });
    } catch (err: any) {
      let message: string = '';
      if (err.code === 'SQLITE_CONSTRAINT') {
        if (err.message.includes('users.email'))
          message = 'Email already exists';
        if (err.message.includes('users.username'))
            if (message == 'Email already exists')
              message = message.concat(', ');
            message = message.concat('Username already exists');
        if (message == '')
          message = 'Unique constraint violation';
        return reply.code(409).send({
          success: false,
          message: message
        });
      }
      return reply.code(500).send({
        success: false,
        message: "Internal server error"
      });
    }
}

export async function getUsers(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const users: any = await request.server.db.all('SELECT username, email FROM users');
      return reply.code(200).send({
        success: true,
        message: "Users successfully obtained",
        data: {
          data: users 
        }
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        message: err.message
      });
    }
}

export async function getUser(request: FastifyRequest<{ Params: { id: string }}>, reply: FastifyReply): Promise<void> {
    try {
      const id: string = request.params.id;
        const user: any = await request.server.db.get('SELECT username, email FROM users WHERE id = ?', [id]);
        if (!user) {
          return reply.code(404).send({
            success: false,
            message: "User not found"
          });
        }
        return reply.code(200).send({
          success: true,
          message: "User successfully obtained",
          data: {
            user: user 
          }
        });
    } catch (err: any) {
        if (err.message.includes('SQLITE_MISMATCH')) {
          return reply.code(400).send({
            success: false,
            message: err.message
          });
        }
        return reply.code(500).send({
          success: false,
          message: err.message
        });
    }
}

export async function deleteUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const result: any = await request.server.db.get('SELECT * FROM users WHERE id = ?', [request.user.id]);
      if (!result){
        return reply.code(404).send({
          success: false,
          message: "User not found"
        });
      }
      await request.server.db.run('DELETE FROM users WHERE id = ?', [request.user.id]);
      return reply.code(204).send();
    } catch (err: any) {
      if (err.message.includes('SQLITE_MISMATCH')) {
        return reply.code(400).send({
          success: false,
          message: err.message
        });
      }
      return reply.code(500).send({
        success: false,
        message: err.message
      });
    }
}

export async function modifyUser(request: FastifyRequest<{ Body: IModifyUser }>, reply: FastifyReply): Promise<void> {
    try {
        let dataName: string = '';
        const { username, password, email } = request.body;
        let result: any = await request.server.db.get('SELECT id, username FROM users WHERE id = ?', [request.user.id]);
        if (!result){
          return reply.code(404).send({
            success: false,
            message: "User not found"
          });
        }
        if (username) {
          dataName = 'username';
          await request.server.db.run('UPDATE users SET username = ?, updated_at = (CURRENT_TIMESTAMP) WHERE id = ?', [username, request.user.id]);
        } else if (password) {
          dataName = 'password';
          await request.server.db.run('UPDATE users SET password = ?, updated_at = (CURRENT_TIMESTAMP) WHERE id = ?', [password, request.user.id]);
        } else {
          dataName = 'email';
          await request.server.db.run('UPDATE users SET email = ?, updated_at = (CURRENT_TIMESTAMP) WHERE id = ?', [email, request.user.id]);
        }
        return reply.code(200).send({
          success: true,
          message: `${dataName} has been modified successfully`
        });
    } catch (err: any) {
        let message: string = '';
        if (err.code === 'SQLITE_CONSTRAINT') {
          if (err.message.includes('users.email'))
            message = 'Email already exists';
          else if (err.message.includes('users.username'))
            message = 'Username already exists';
          else if (!message)
            message = 'Unique constraint violation';
          request.server.log.error(message, err);
          return reply.code(409).send({
            success: false,
            message: err.message
          });
        } else if (err.message.includes('SQLITE_MISMATCH')) {
          request.server.log.error("Invalid ID format", err);
          return reply.code(400).send({
            success: false,
            message: err.message
          });
        }
        request.server.log.error("Internal server error", err);
        return reply.code(500).send({
          success: false,
          message: err.message
        });
    }
}

export async function login(request: FastifyRequest<{ Body: ILogin }>, reply: FastifyReply): Promise<void> {
  try {
    const { email, password } = request.body;
    const user: any = await request.server.db.get('SELECT id, role, username FROM users WHERE email = ? AND password = ?;', [email, password]);
    if (user == undefined){
      request.server.log.error("Login failed: invalid email or password");
      return reply.code(401).send({
        success: false,
        message: 'Login failed: invalid email or password'
      });
    }
    await request.server.db.run('UPDATE users SET last_login = (CURRENT_TIMESTAMP) WHERE email = ? AND password = ?', [email, password]);
    const token: string = request.server.jwt.sign( { id: user.id, role: user.role} );
    console.log({ token: token });
    return reply.code(200).send({
      success: true,
      message: "Authentication Success",
      data: {
        token: token,
        user: user
      }
    });
  } catch (err: any) {
    request.server.log.error("Internal server error", err);
    return reply.code(500).send({
      success: false,
      message: err.message
    });
  }
}
