import fs from 'fs';
import qrcode from 'qrcode';
import { v4 as uuid } from 'uuid';
import speakeasy from 'speakeasy';
import { IId } from '../shared/types/api.types.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { createErrorResponse, ErrorCodes } from '../shared/constants/error.const.js';
import {
  IAddUser,
  ILogin,
  IModifyUser,
  IReplyGetUser,
  IReplyGetUsers,
  IReplyLogin,
} from '../shared/types/auth.types.js';
import path from 'path';

export async function getUsers(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const users: IReplyGetUsers[] = await request.server.db.all('SELECT username, email, id FROM users');
    if (!users) {
      const errorMessage = createErrorResponse(404, ErrorCodes.PLAYER_NOT_FOUND);
      return reply.code(404).send(errorMessage);
    }
    return reply.code(200).send(users);
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

export async function getUser(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply): Promise<void> {
  try {
    const id = request.params.id;
    const user: IReplyGetUser | undefined = await request.server.db.get(
      'SELECT username, email, id FROM users WHERE id = ?',
      [id]
    );
    if (!user) {
      const errorMessage = createErrorResponse(404, ErrorCodes.PLAYER_NOT_FOUND);
      return reply.code(404).send(errorMessage);
    }
    return reply.code(200).send(user);
  } catch (err) {
    if (err instanceof Error && err.message.includes('SQLITE_MISMATCH')) {
      const errorMessage = createErrorResponse(400, ErrorCodes.SQLITE_MISMATCH);
      return reply.code(400).send(errorMessage);
    }
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
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
      const errorMessage = createErrorResponse(404, ErrorCodes.PLAYER_NOT_FOUND);
      return reply.code(404).send(errorMessage);
    }
    return reply.code(200).send(user);
  } catch (err) {
    if (err instanceof Error && err.message.includes('SQLITE_MISMATCH')) {
      const errorMessage = createErrorResponse(400, ErrorCodes.SQLITE_MISMATCH);
      return reply.code(400).send(errorMessage);
    }
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
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
    const user = await request.server.db.get('SELECT username, email, id FROM users WHERE username = ?', [
      username,
    ]);
    return reply.code(201).send(user);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('SQLITE_MISMATCH')) {
        const errorMessage = createErrorResponse(400, ErrorCodes.SQLITE_MISMATCH);
        return reply.code(400).send(errorMessage);
      } else if (err.message.includes('SQLITE_CONSTRAINT')) {
        const errorMessage = createErrorResponse(409, ErrorCodes.SQLITE_CONSTRAINT);
        return reply.code(409).send(errorMessage);
      }
    }
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
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
    const result = await request.server.db.get('SELECT id, username FROM users WHERE id = ?', [id]);
    if (!result) {
      const errorMessage = createErrorResponse(404, ErrorCodes.PLAYER_NOT_FOUND);
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
        const errorMessage = createErrorResponse(409, ErrorCodes.SQLITE_CONSTRAINT);
        return reply.code(409).send(errorMessage);
      } else if (err.message.includes('SQLITE_MISMATCH')) {
        const errorMessage = createErrorResponse(400, ErrorCodes.SQLITE_MISMATCH);
        return reply.code(400).send(errorMessage);
      }
    }
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

export async function deleteUser(
  request: FastifyRequest<{ Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const id = request.params.id;
    const result = await request.server.db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!result) {
      const errorMessage = createErrorResponse(404, ErrorCodes.PLAYER_NOT_FOUND);
      return reply.code(404).send(errorMessage);
    }
    await request.server.db.run('DELETE FROM users WHERE id = ?', [id]);
    return reply.code(204).send();
  } catch (err) {
    if (err instanceof Error && err.message.includes('SQLITE_MISMATCH')) {
      const errorMessage = createErrorResponse(400, ErrorCodes.SQLITE_MISMATCH);
      return reply.code(400).send(errorMessage);
    }
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

export async function checkRevoked(
  request: FastifyRequest<{ Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const jwtId = request.params.id;
    const revokedPath = path.join(path.resolve(), 'db/revoked.json');
    const fd = fs.openSync(revokedPath, 'a+');
    const existingData = fs.readFileSync(fd, 'utf-8');
    const revokedIds = existingData ? JSON.parse(existingData) : [];
    const isRevoked = revokedIds.includes(jwtId);
    fs.closeSync(fd);
    if (isRevoked === true) {
      const errorMessage = createErrorResponse(403, ErrorCodes.JWT_REVOKED);
      return reply.code(403).send(errorMessage);
    }
    return reply.code(200).send();
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

export async function logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const jwtId = request.body;
    const revokedPath = path.join(path.resolve(), 'db/revoked.json');
    const fd = fs.openSync(revokedPath, 'a+');
    const existingData = fs.readFileSync(fd, 'utf-8');
    const revokedIds = existingData ? JSON.parse(existingData) : [];
    revokedIds.push(jwtId);
    fs.writeFileSync(revokedPath, JSON.stringify(revokedIds, null, 2));
    fs.closeSync(fd);
    return reply.code(204).send();
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

export async function login(request: FastifyRequest<{ Body: ILogin }>, reply: FastifyReply): Promise<void> {
  try {
    const { email, password } = request.body;
    const ip = request.headers['from'];
    const data = await request.server.db.get(
      'SELECT id, role, username, two_factor_enabled FROM users WHERE email = ? AND password = ?;',
      [email, password]
    );
    if (!data) {
      const errorMessage = createErrorResponse(401, ErrorCodes.UNAUTHORIZED);
      return reply.code(401).send(errorMessage);
    }
    await request.server.db.run(
      'UPDATE users SET last_login = (CURRENT_TIMESTAMP), last_ip = ? WHERE email = ? AND password = ?',
      [ip, email, password]
    );
    const jti = uuid();
    const token: string = request.server.jwt.sign({
      id: data.id,
      twofa: data.two_factor_enabled,
      jwtId: jti,
      role: data.role,
    });
    const user: IReplyLogin = {
      token: token,
      id: data.id,
      role: data.role,
      username: data.username,
    };
    return reply.code(200).send(user);
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

export async function twofaGenerate(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply) {
  try {
    const secretCode = speakeasy.generateSecret({
      name: 'TEST',
    });
    const qrCodeImage = await qrcode.toDataURL(secretCode.otpauth_url as string);
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Two-Factor Authentication</title>
        </head>
        <body>
          <h1>Scan this QR Code with your 2FA App</h1>
          <img src="${qrCodeImage}" alt="QR Code" />
        </body>
      </html>
    `;
    return reply.code(200).type('text/html').send(htmlContent);
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

// export async function twofaAuth(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply) {
//   try {

//     return reply.code(200).send();
//   } catch (err) {
//     request.server.log.error(err);
//     const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
//     return reply.code(500).send(errorMessage);
//   }
// }

// export async function twofaEnable(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply): Promise<void> {
//   try {
//     const id = request.params.id;
//     // const two_factor_enabled = await request.server.db.get(
//     //   'SELECT two_factor_enabled FROM users WHERE id = ?;',
//     //   [id]
//     // );
//     // if(two_factor_enabled === true)
//     //   return reply.code(304).send();
//     // await request.server.db.run(
//     //   'UPDATE two_factor_enabled = true WHERE id = ?',
//     //   [id]
//     // );
//     // //
//     return reply.code(204).send();
//   } catch (err) {
//     request.server.log.error(err);
//     const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
//     return reply.code(500).send(errorMessage);
//   }
// }

// export async function twofaDisable(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply): Promise<void> {
//   try {
//     const id = request.params.id;
//     // const two_factor_enabled = await request.server.db.get(
//     //   'SELECT two_factor_enabled FROM users WHERE id = ?;',
//     //   [id]
//     // );
//     // if(two_factor_enabled === false)
//     //   return reply.code(304).send();
//     // await request.server.db.run(
//     //   'UPDATE two_factor_enabled = false WHERE id = ?',
//     //   [id]
//     // );
//     // //
//     return reply.code(204).send();
//   } catch (err) {
//     request.server.log.error(err);
//     const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
//     return reply.code(500).send(errorMessage);
//   }
// }
