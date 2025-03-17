import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { Database } from 'sqlite';

declare module 'fastify' {
    interface FastifyInstance {
        db: Database;
    }
}

const dirname = path.resolve();
const filepath = path.join(dirname, "/db/users.sqlite");

export async function initDb() {
  try {
    const db = await open({ filename: filepath, driver: sqlite3.Database });
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (
          lower(hex(randomblob(4))) || '-' || 
          lower(hex(randomblob(2))) || '-' || 
          lower(hex(randomblob(2))) || '-' || 
          lower(hex(randomblob(2))) || '-' || 
          lower(hex(randomblob(6)))
        ), -- Standard UUID format
        role VARCHAR(5) NOT NULL,
        username VARCHAR(20) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        last_login DATETIME NULL,
        updated_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP)
    `);
    return db;
    } catch (err: any) {
      throw new Error(`Database initialization failed: ${err.message}`)
    }
  }