import path from 'node:path';
import sqlite3 from 'sqlite3';
import * as fs from 'node:fs';
import { open, Database } from 'sqlite';
import { fileURLToPath } from 'node:url';
import { FastifyInstance } from 'fastify';
import { IId } from '../src/shared/types/auth.types.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initializes the ELO for the computer/AI user ("ia") by sending a POST request to the GAME service.
 * Retries until the ELO is successfully created.
 *
 * @param fastify - The FastifyInstance for logging.
 * @param db - The SQLite database instance.
 * @returns Promise<void>
 */
async function initEloComputer(fastify: FastifyInstance, db: Database<sqlite3.Database, sqlite3.Statement>) {
  let gameState = false;
  const id = await db.get<{ id: IId }>('SELECT id FROM users WHERE username = ?', 'ai');
  fastify.log.info('Waiting for service GAME...');
  while (!gameState) {
    try {
      const eloUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083/elo/${id?.id}`;
      const response = await fetch(eloUrl, { method: 'POST' });
      if (response.status !== 201) throw new Error('Create elo failed');
      gameState = true;
    } catch (err) {
      fastify.log.error(err);
      gameState = false;
    }
  }
}

/**
 * Connects to the SQLite database, applies configuration, initializes schema, and decorates Fastify with the db instance.
 * Also initializes the ELO for the computer/AI user and sets up a shutdown hook.
 *
 * @param fastify - The FastifyInstance to decorate with the database.
 * @returns Promise<void>
 */
export async function dbConnector(fastify: FastifyInstance) {
  const dbPath: string = path.join(path.resolve(), 'db/auth.sqlite');
  fastify.log.info(`Connecting to database: ${dbPath}`);
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });
  await db.exec('PRAGMA busy_timeout = 30000');
  await db.exec('PRAGMA journal_mode = WAL');
  await db.exec('PRAGMA synchronous = NORMAL');
  const authSql = fs.readFileSync(path.join(__dirname, '../src/config/auth.config.sql'), 'utf-8');
  await db.exec(authSql);
  await initEloComputer(fastify, db);
  fastify.decorate('db', db);
  fastify.addHook('onClose', async (instance) => {
    await instance.db.close();
  });
  fastify.log.info(`Database ${dbPath} successfully created`);
}
