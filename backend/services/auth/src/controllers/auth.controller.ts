import fs from 'fs';
import path from 'path';
import qrcode from 'qrcode';
import { v4 as uuid } from 'uuid';
import speakeasy from 'speakeasy';
import { FastifyRequest, FastifyReply } from 'fastify';
import { createErrorResponse, ErrorCodes } from '../shared/constants/error.const.js';
import {
  IAddUser,
  ILogin,
  IModifyUser,
  IReplyUser,
  IReplyLogin,
  IId,
  IJwtId,
  I2faCode,
  IReplyQrCode,
  IUsername,
} from '../shared/types/auth.types.js';

export async function getId(
  request: FastifyRequest<{ Params: IUsername }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const username = request.params.username;
    const id: IId | undefined = await request.server.db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (!id) {
      const errorMessage = createErrorResponse(404, ErrorCodes.PLAYER_NOT_FOUND);
      return reply.code(404).send(errorMessage);
    }
    return reply.code(200).send(id);
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

export async function getUsers(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const users: IReplyUser[] = await request.server.db.all('SELECT username, email, id FROM users');
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
    const user: IReplyUser | undefined = await request.server.db.get(
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
    const user: IReplyUser | undefined = await request.server.db.get(
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
    const user: IReplyUser | undefined = await request.server.db.get(
      'SELECT username, email, id FROM users WHERE username = ?',
      [username]
    );
    if (user !== undefined) {
      const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083/elo/${user.id}`;
      const response = await fetch(serviceUrl, { method: 'POST' });
      if (response.status !== 201) {
        throw new Error('Create elo failed');
      }
    } else {
      throw new Error('Create user failed');
    }
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
    const result = await request.server.db.run('SELECT id FROM users WHERE id = ?', [id]);
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

export async function logout(
  request: FastifyRequest<{
    Body: IJwtId;
    Params: IId;
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const jwtId = request.body;
    const id = request.params.id;
    await request.server.db.run('UPDATE users SET verified = false WHERE id = ?', [id]);
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
      'SELECT id, role, username, two_factor_enabled, verified FROM users WHERE email = ? AND password = ?;',
      [email, password]
    );
    if (!data) {
      const errorMessage = createErrorResponse(401, ErrorCodes.UNAUTHORIZED);
      return reply.code(401).send(errorMessage);
    }
    if (data.two_factor_enabled && !data.verified) {
      const token: string = request.server.jwt.sign(
        {
          id: data.id,
          role: '2fa',
        },
        { expiresIn: '1m' }
      );
      const user: IReplyLogin = {
        token: token,
        id: data.id,
        role: '2fa',
        username: data.username,
        status: 'NEED_2FA',
      };
      return reply.code(200).send(user);
    }
    await request.server.db.run(
      'UPDATE users SET last_login = (CURRENT_TIMESTAMP), last_ip = ? WHERE email = ? AND password = ?',
      [ip, email, password]
    );
    const jti = uuid();
    const token = request.server.jwt.sign({
      id: data.id,
      role: data.role,
      jwtId: jti,
      twofa: data.two_factor_enabled,
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
    const id = request.params.id;
    const { two_factor_enabled } = await request.server.db.get(
      'SELECT two_factor_enabled FROM users WHERE id = ?;',
      [id]
    );
    if (two_factor_enabled) {
      return reply.code(204).send();
    }
    const secretCode = speakeasy.generateSecret({
      name: 'Transcendance',
    });
    await request.server.db.run('UPDATE users SET two_factor_secret = ? WHERE id = ?', [
      secretCode.base32,
      id,
    ]);
    const qrCodeImage = await qrcode.toDataURL(secretCode.otpauth_url as string);
    const qrCodeReponse: IReplyQrCode = {
      qrcode: qrCodeImage,
      otpauth: secretCode.otpauth_url,
    };
    return reply.code(200).send(qrCodeReponse);
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

export async function twofaValidate(
  request: FastifyRequest<{
    Body: I2faCode;
    Params: IId;
  }>,
  reply: FastifyReply
) {
  try {
    const id = request.params.id;
    const { twofaCode } = request.body;
    const data = await request.server.db.get(
      'SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = ?;',
      [id]
    );
    const verify = speakeasy.totp.verify({
      secret: data.two_factor_secret,
      encoding: 'base32',
      token: twofaCode,
    });
    if (verify) {
      await request.server.db.run(
        'UPDATE users SET verified = true, two_factor_enabled = true WHERE id = ?',
        [id]
      );
      return reply.code(200).send();
    }
    const errorMessage = createErrorResponse(401, ErrorCodes.UNAUTHORIZED);
    return reply.code(401).send(errorMessage);
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}

export async function twofaDisable(
  request: FastifyRequest<{ Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const id = request.params.id;

    const two_factor_enabled = await request.server.db.get(
      'SELECT two_factor_enabled FROM users WHERE id = ?;',
      [id]
    );
    if (!two_factor_enabled) {
      return reply.code(204).send();
    }
    await request.server.db.run(
      'UPDATE users SET two_factor_enabled = false, two_factor_secret = null WHERE id = ?',
      [id]
    );
    return reply.code(200).send();
  } catch (err) {
    request.server.log.error(err);
    const errorMessage = createErrorResponse(500, ErrorCodes.INTERNAL_ERROR);
    return reply.code(500).send(errorMessage);
  }
}
