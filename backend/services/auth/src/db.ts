import path from 'node:path';
import sqlite3 from 'sqlite3';
import * as fs from 'node:fs';
import { open, Database } from 'sqlite';
import { fileURLToPath } from 'node:url';
import { FastifyInstance } from 'fastify';
import { IId } from '../src/shared/types/auth.types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define database interface for TypeScript
declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
  }
}

async function initEloComputer(db: Database<sqlite3.Database, sqlite3.Statement>) {
  let gameState = false;
  const id = await db.get<{ id: IId }>('SELECT id FROM users WHERE username = ?', 'ia');
  console.log('Waiting for service GAME...');
  while (!gameState) {
    try {
      const eloUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083/elo/${id?.id}`;
      const response = await fetch(eloUrl, { method: 'POST' });
      if (response.status !== 201) {
        throw new Error('Create elo failed');
      }
      gameState = true;
    } catch (err) {
      gameState = false;
    }
  }
}

// Initialize database connection
export async function dbConnector(fastify: FastifyInstance) {
  // Select database based on environment
  const dbPath: string = path.join(path.resolve(), 'db/auth.sqlite');

  fastify.log.info(`Connecting to database: ${dbPath}`);

  // Open SQLite database connection
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });
  // Increase busy timeout to 30 seconds
  await db.exec('PRAGMA busy_timeout = 30000');
  // Enable Write-Ahead Logging (WAL) mode
  await db.exec('PRAGMA journal_mode = WAL');
  // Set synchronous mode to NORMAL for better performance
  await db.exec('PRAGMA synchronous = NORMAL');
  // Set locking mode to EXCLUSIVE
  // await db.exec('PRAGMA locking_mode = EXCLUSIVE');
  await db.exec('PRAGMA foreign_keys = ON');

  // Read SQL commands from files
  const authSql = fs.readFileSync(path.join(__dirname, '../src/config/auth.sql'), 'utf-8');
  // Initialize tables if they don't exist
  await db.exec(authSql);
  await initEloComputer(db);
  // Make database connection available through fastify instance
  fastify.decorate('db', db);
  // Close database connection when Fastify server closes
  fastify.addHook('onClose', async (instance) => {
    await instance.db.close();
  });
  fastify.log.info(`Database ${dbPath} successfully created`);
}
