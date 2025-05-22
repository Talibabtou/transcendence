import path from 'node:path';
import sqlite3 from 'sqlite3';
import * as fs from 'node:fs';
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
 * Connects to the SQLite database, applies configuration, initializes schema, and decorates Fastify with the db instance.
 * Loads and executes SQL schema files for matches, goals, ELO, and players.
 * Enables foreign key constraints and sets up a shutdown hook to close the database on server close.
 *
 * @param fastify - The FastifyInstance to decorate with the database.
 * @returns Promise<void>
 */
export async function dbConnector(fastify: FastifyInstance) {
  const dbPath: string = path.join(path.resolve(), 'db/game.dev.sqlite');
  fastify.log.info(`Connecting to database: ${dbPath}`);
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });
  await db.exec('PRAGMA busy_timeout = 30000');
  await db.exec('PRAGMA journal_mode = WAL');
  await db.exec('PRAGMA synchronous = NORMAL');
  await db.exec('PRAGMA foreign_keys = ON');
  const matchSql = fs.readFileSync(path.join(__dirname, '../src/config/match.config.sql'), 'utf-8');
  const goalSql = fs.readFileSync(path.join(__dirname, '../src/config/goal.config.sql'), 'utf-8');
  const eloSql = fs.readFileSync(path.join(__dirname, '../src/config/elo.config.sql'), 'utf-8');
  const playerSql = fs.readFileSync(path.join(__dirname, '../src/config/player.config.sql'), 'utf-8');
  await db.exec(matchSql);
  await db.exec(goalSql);
  await db.exec(eloSql);
  await db.exec(playerSql);
  fastify.decorate('db', db);
  fastify.addHook('onClose', async (instance) => {
    await instance.db.close();
  });
  fastify.log.info(`Database ${dbPath} successfully created`);
}
