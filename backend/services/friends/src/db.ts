import { FastifyInstance } from 'fastify';
import * as fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define database interface for TypeScript
declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
  }
}

// Initialize database connection
export async function dbConnector(fastify: FastifyInstance) {
  // Select database based on environment
  const dbPath: string = path.join(path.resolve(), 'db/friends.sqlite');

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
  const friendsSql = fs.readFileSync(path.join(__dirname, '../src/config/friends.sql'), 'utf-8');
  // Initialize tables if they don't exist
  await db.exec(friendsSql);
  // Make database connection available through fastify instance
  fastify.decorate('db', db);
  // Close database connection when Fastify server closes
  fastify.addHook('onClose', async (instance) => {
    await instance.db.close();
  });
  fastify.log.info(`Database ${dbPath} successfully created`);
}
