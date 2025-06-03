import fs from 'fs';
import path from 'path';
import qrcode from 'qrcode';
import { v4 as uuid } from 'uuid';
import speakeasy from 'speakeasy';
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
  IReplyTwofaStatus,
} from '../shared/types/auth.types.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { sendError, isValidId } from '../helper/auth.helper.js';
import { ErrorCodes } from '../shared/constants/error.const.js';
import { recordMediumDatabaseMetrics, userCreationCounter, twofaEnabledCounter, JWTRevocationCounter, JWTGenerationCounter } from '../telemetry/metrics.js';

/**
 * Retrieves the user ID for a given username.
 *
 * @param request - FastifyRequest object containing the username in params.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns { id }
 *   404 - Player not found (ErrorCodes.PLAYER_NOT_FOUND)
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function getId(
  request: FastifyRequest<{ Params: IUsername }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const username = request.params.username;
		const startTime = performance.now();
    const id: IId | undefined = await request.server.db.get('SELECT id FROM users WHERE username = ?', [
      username,
    ]);
		recordMediumDatabaseMetrics('SELECT', 'users', performance.now() - startTime);
    if (!id) return sendError(reply, 404, ErrorCodes.PLAYER_NOT_FOUND);
    return reply.code(200).send(id);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Retrieves the username for a given user ID.
 *
 * @param request - FastifyRequest object containing the user ID in params.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns { username }
 *   400 - Bad request (ErrorCodes.BAD_REQUEST)
 *   404 - Player not found (ErrorCodes.PLAYER_NOT_FOUND)
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function getUsername(
  request: FastifyRequest<{ Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const id = request.params.id;
		const startTime = performance.now();
    if (!isValidId(id)) return sendError(reply, 400, ErrorCodes.BAD_REQUEST);
    const username: IUsername | undefined = await request.server.db.get(
      'SELECT username FROM users WHERE id = ?',
      [id]
    );
		recordMediumDatabaseMetrics('SELECT', 'users', performance.now() - startTime);
    if (!username) return sendError(reply, 404, ErrorCodes.PLAYER_NOT_FOUND);
    return reply.code(200).send(username);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Retrieves user information for a given user ID.
 *
 * @param request - FastifyRequest object containing the user ID in params.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns user info
 *   400 - SQLite mismatch (ErrorCodes.SQLITE_MISMATCH)
 *   404 - Player not found (ErrorCodes.PLAYER_NOT_FOUND)
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function getUser(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply): Promise<void> {
  try {
    const id = request.params.id;
		const startTime = performance.now();
    const user: IReplyUser | undefined = await request.server.db.get(
      'SELECT username, email, id FROM users WHERE id = ?',
      [id]
    );
		recordMediumDatabaseMetrics('SELECT', 'users', performance.now() - startTime);
    if (!user) return sendError(reply, 404, ErrorCodes.PLAYER_NOT_FOUND);
    return reply.code(200).send(user);
  } catch (err) {
    if (err instanceof Error && err.message.includes('SQLITE_MISMATCH')) {
      request.server.log.error(err);
      return sendError(reply, 400, ErrorCodes.SQLITE_MISMATCH);
    }
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Adds a new user to the database.
 *
 * @param request - FastifyRequest object containing user data in body.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   201 - User created, returns user info
 *   400 - SQLite mismatch (ErrorCodes.SQLITE_MISMATCH)
 *   409 - SQLite constraint (ErrorCodes.SQLITE_CONSTRAINT)
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function addUser(
  request: FastifyRequest<{ Body: IAddUser }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { username, password, email } = request.body;
    if (!username || !password || !email) return sendError(reply, 400, ErrorCodes.BAD_REQUEST);
    const ip = request.headers['from'];
    const userLower = username.toLowerCase();
    const emailLower = email.toLowerCase();
		let startTime = performance.now();
    await request.server.db.run(
      'INSERT INTO users (role, username, password, email, last_ip, created_at) VALUES ("user", ?, ?, ?, ?,CURRENT_TIMESTAMP);',
      [userLower, password, emailLower, ip]
    );
		recordMediumDatabaseMetrics('INSERT', 'users', performance.now() - startTime);
    startTime = performance.now();
		const user: IReplyUser | undefined = await request.server.db.get(
      'SELECT username, email, id FROM users WHERE username = ?',
      [userLower]
    );
		recordMediumDatabaseMetrics('SELECT', 'users', performance.now() - startTime);
    if (user !== undefined) {
      const serviceUrl = `http://${process.env.GAME_ADDR || 'localhost'}:${process.env.GAME_PORT || 8083}/elo/${user.id}`;
      const response = await fetch(serviceUrl, { method: 'POST' });
      if (response.status !== 201) throw new Error('Create elo failed');
    } else throw new Error('Create user failed');
		userCreationCounter.add(1);
		return reply.code(201).send(user);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('SQLITE_MISMATCH')) {
        request.server.log.error(err);
        return sendError(reply, 400, ErrorCodes.SQLITE_MISMATCH);
      } else if (err.message.includes('SQLITE_CONSTRAINT')) {
        request.server.log.error(err);
        return sendError(reply, 409, ErrorCodes.SQLITE_CONSTRAINT);
      }
    }
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Modifies user information for a given user ID.
 *
 * @param request - FastifyRequest object containing user ID in params and new data in body.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success
 *   400 - SQLite mismatch (ErrorCodes.SQLITE_MISMATCH)
 *   404 - Bad request (ErrorCodes.BAD_REQUEST) or player not found (ErrorCodes.PLAYER_NOT_FOUND)
 *   409 - SQLite constraint (ErrorCodes.SQLITE_CONSTRAINT)
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function modifyUser(
  request: FastifyRequest<{ Body: IModifyUser; Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const id = request.params.id;
    const { username, password, email } = request.body;
    if (!username && !password && !email) return sendError(reply, 400, ErrorCodes.BAD_REQUEST);
		let startTime = performance.now();
    const result = await request.server.db.run('SELECT id FROM users WHERE id = ?', [id]);
		recordMediumDatabaseMetrics('SELECT', 'users', performance.now() - startTime);
    if (!result) return sendError(reply, 404, ErrorCodes.PLAYER_NOT_FOUND);
    if (username) {
			startTime = performance.now();
      await request.server.db.run(
        'UPDATE users SET username = ?, updated_at = (CURRENT_TIMESTAMP) WHERE id = ?',
        [username, id]
      );
		recordMediumDatabaseMetrics('UPDATE', 'users', performance.now() - startTime);
    }
    if (password) {
			startTime = performance.now();
      await request.server.db.run(
        'UPDATE users SET password = ?, updated_at = (CURRENT_TIMESTAMP) WHERE id = ?',
        [password, id]
      );
		recordMediumDatabaseMetrics('UPDATE', 'users', performance.now() - startTime);
    }
    if (email) {
			startTime = performance.now();
      await request.server.db.run(
        'UPDATE users SET email = ?, updated_at = (CURRENT_TIMESTAMP) WHERE id = ?',
        [email, id]
      );
		recordMediumDatabaseMetrics('UPDATE', 'users', performance.now() - startTime);
    }
    return reply.code(200).send();
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('SQLITE_CONSTRAINT')) {
        request.server.log.error(err);
        return sendError(reply, 409, ErrorCodes.SQLITE_CONSTRAINT);
      } else if (err.message.includes('SQLITE_MISMATCH')) {
        request.server.log.error(err);
        return sendError(reply, 400, ErrorCodes.SQLITE_MISMATCH);
      }
    }
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Checks if a JWT ID has been revoked.
 *
 * @param request - FastifyRequest object containing the JWT ID in params.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Not revoked
 *   403 - JWT revoked (ErrorCodes.JWT_REVOKED)
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
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
    if (isRevoked === true) return sendError(reply, 403, ErrorCodes.JWT_REVOKED);
    return reply.code(200).send();
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Logs out a user and revokes their JWT.
 *
 * @param request - FastifyRequest object containing JWT ID in body and user ID in params.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   204 - Success, user logged out
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
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
		const startTime = performance.now();
    await request.server.db.run('UPDATE users SET verified = false WHERE id = ?', [id]);
		recordMediumDatabaseMetrics('UPDATE', 'users', performance.now() - startTime);
    const revokedPath = path.join(path.resolve(), 'db/revoked.json');
    const fd = fs.openSync(revokedPath, 'a+');
    const existingData = fs.readFileSync(fd, 'utf-8');
    const revokedIds = existingData ? JSON.parse(existingData) : [];
    revokedIds.push(jwtId);
    fs.writeFileSync(revokedPath, JSON.stringify(revokedIds, null, 2));
    fs.closeSync(fd);
		JWTRevocationCounter.add(1);
    return reply.code(204).send();
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Authenticates a user with email and password.
 *
 * @param request - FastifyRequest object containing email and password in body.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns user info and JWT token or 2FA status
 *   401 - Login failure (ErrorCodes.LOGIN_FAILURE)
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function login(request: FastifyRequest<{ Body: ILogin }>, reply: FastifyReply): Promise<void> {
  try {
    const { email, password } = request.body;
    if (!password || !email) return sendError(reply, 400, ErrorCodes.BAD_REQUEST);
    const ip = request.headers['from'];
		let startTime = performance.now();
    const data = await request.server.db.get(
      'SELECT id, role, username, two_factor_enabled, verified FROM users WHERE email = ? AND password = ?;',
      [email, password]
    );
		recordMediumDatabaseMetrics('SELECT', 'users', performance.now() - startTime);
    if (!data) return sendError(reply, 401, ErrorCodes.LOGIN_FAILURE);
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
		startTime = performance.now();
    await request.server.db.run(
      'UPDATE users SET last_login = (CURRENT_TIMESTAMP), last_ip = ? WHERE email = ? AND password = ?',
      [ip, email, password]
    );
		recordMediumDatabaseMetrics('UPDATE', 'users', performance.now() - startTime);
    const jti = uuid();
    const token = request.server.jwt.sign({
      id: data.id,
      role: data.role,
      jwtId: jti,
      twofa: data.two_factor_enabled,
    });
    if (data.two_factor_enabled && data.verified) {
      startTime = performance.now();
      await request.server.db.run(
        'UPDATE users SET verified = false WHERE id = ?',
        [data.id]
      );
      recordMediumDatabaseMetrics('UPDATE', 'users', performance.now() - startTime);
    }
    const user: IReplyLogin = {
      token: token,
      id: data.id,
      role: data.role,
      username: data.username,
    };
		JWTGenerationCounter.add(1);
    return reply.code(200).send(user);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Authenticates a guest user with email and password.
 *
 * @param request - FastifyRequest object containing email and password in body.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns user info and JWT token or 2FA status
 *   401 - Login failure (ErrorCodes.LOGIN_FAILURE)
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function loginGuest(
  request: FastifyRequest<{ Body: ILogin }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { email, password } = request.body;
		let startTime = performance.now();
    const data = await request.server.db.get(
      'SELECT id, role, username, two_factor_enabled, verified FROM users WHERE email = ? AND password = ?;',
      [email, password]
    );
		recordMediumDatabaseMetrics('SELECT', 'users', performance.now() - startTime);
    if (!data) return sendError(reply, 401, ErrorCodes.LOGIN_FAILURE);
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
    if (data.two_factor_enabled && data.verified) {
			startTime = performance.now();
      await request.server.db.run(
        'UPDATE users SET verified = false WHERE id = ?',
        [data.id]
      );
		  recordMediumDatabaseMetrics('UPDATE', 'users', performance.now() - startTime);
		}
    const user: IReplyLogin = {
      id: data.id,
      role: data.role,
      username: data.username,
    };
    return reply.code(200).send(user);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Generates a 2FA secret and QR code for a user.
 *
 * @param request - FastifyRequest object containing the user ID in params.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns QR code and otpauth URL
 *   204 - 2FA already enabled
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function twofaGenerate(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply) {
  try {
    const id = request.params.id;
		let startTime = performance.now();
    const { two_factor_enabled } = await request.server.db.get(
      'SELECT two_factor_enabled FROM users WHERE id = ?;',
      [id]
    );
		recordMediumDatabaseMetrics('SELECT', 'users', performance.now() - startTime);
    if (two_factor_enabled) return reply.code(204).send();
    const secretCode = speakeasy.generateSecret({
      name: 'Transcendance',
    });
		startTime = performance.now();
    await request.server.db.run('UPDATE users SET two_factor_secret = ? WHERE id = ?', [
      secretCode.base32,
      id,
    ]);
		recordMediumDatabaseMetrics('UPDATE', 'users', performance.now() - startTime);
    const qrCodeImage = await qrcode.toDataURL(secretCode.otpauth_url as string);
    const qrCodeReponse: IReplyQrCode = {
      qrcode: qrCodeImage,
      otpauth: secretCode.otpauth_url,
    };
    return reply.code(200).send(qrCodeReponse);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Validates a 2FA code for a user.
 *
 * @param request - FastifyRequest object containing 2FA code in body and user ID in params.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, 2FA validated
 *   401 - Unauthorized (ErrorCodes.UNAUTHORIZED)
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
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
		let startTime = performance.now();
    const data = await request.server.db.get(
      'SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = ?;',
      [id]
    );
		recordMediumDatabaseMetrics('SELECT', 'users', performance.now() - startTime);
    const verify = speakeasy.totp.verify({
      secret: data.two_factor_secret,
      encoding: 'base32',
      token: twofaCode,
    });
    if (verify) {
			startTime = performance.now();
      await request.server.db.run(
        'UPDATE users SET two_factor_enabled = true WHERE id = ?',
        [id]
      );
		recordMediumDatabaseMetrics('UPDATE', 'users', performance.now() - startTime);
		twofaEnabledCounter.add(1);
		return reply.code(200).send();
    }
    return sendError(reply, 401, ErrorCodes.UNAUTHORIZED);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Disables 2FA for a user.
 *
 * @param request - FastifyRequest object containing the user ID in params.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, 2FA disabled
 *   204 - 2FA already disabled
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function twofaDisable(
  request: FastifyRequest<{ Params: IId }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const id = request.params.id;
		let startTime = performance.now();
    const two_factor_enabled = await request.server.db.get(
      'SELECT two_factor_enabled FROM users WHERE id = ?;',
      [id]
    );
		recordMediumDatabaseMetrics('SELECT', 'users', performance.now() - startTime);
    if (!two_factor_enabled) return reply.code(204).send();
		startTime = performance.now();
    await request.server.db.run(
      'UPDATE users SET two_factor_enabled = false, two_factor_secret = null WHERE id = ?',
      [id]
    );
		recordMediumDatabaseMetrics('UPDATE', 'users', performance.now() - startTime);
		return reply.code(200).send();
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Retrieves the 2FA (Two-Factor Authentication) status for a user.
 *
 * @param request - FastifyRequest object containing the user ID in params.
 * @param reply - FastifyReply object for sending the response.
 * @returns
 *   200 - Success, returns { two_factor_enabled }
 *   404 - Player not found (ErrorCodes.PLAYER_NOT_FOUND)
 *   500 - Internal server error (ErrorCodes.INTERNAL_ERROR)
 */
export async function twofaStatus(request: FastifyRequest<{ Params: IId }>, reply: FastifyReply) {
  try {
    const id = request.params.id;
		const startTime = performance.now();
    const data = (await request.server.db.get('SELECT two_factor_enabled FROM users WHERE id = ?;', [id])) as IReplyTwofaStatus;
		recordMediumDatabaseMetrics('SELECT', 'users', performance.now() - startTime);
    if (!data) return sendError(reply, 404, ErrorCodes.PLAYER_NOT_FOUND);
    return reply.code(200).send(data);
  } catch (err) {
    request.server.log.error(err);
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR);
  }
}
