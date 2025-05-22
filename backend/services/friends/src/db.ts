import path from 'node:path';
import * as fs from 'node:fs';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { fileURLToPath } from 'node:url';
import { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Connects the Fastify server instance to the SQLite database.
 * - Sets up database pragmas for performance and integrity.
 * - Initializes the database schema from the friends.sql file.
 * - Decorates the Fastify instance with the database connection.
 * - Ensures the database connection is closed gracefully on server shutdown.
 *
 * @param fastify - The FastifyInstance to decorate with the database connection.
 * @returns Promise<void>
 */
export async function dbConnector(fastify: FastifyInstance) {
  const dbPath: string = path.join(path.resolve(), 'db/friends.sqlite');
  fastify.log.info(`Connecting to database: ${dbPath}`);
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });
  await db.exec('PRAGMA busy_timeout = 30000');
  await db.exec('PRAGMA journal_mode = WAL');
  await db.exec('PRAGMA synchronous = NORMAL');
  const friendsSql = fs.readFileSync(path.join(__dirname, '../src/config/friends.config.sql'), 'utf-8');
  await db.exec(friendsSql);
  fastify.decorate('db', db);
  fastify.addHook('onClose', async (instance) => {
    await instance.db.close();
  });
  fastify.log.info(`Database ${dbPath} successfully created`);
}
