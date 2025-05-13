import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { Database } from 'sqlite';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
  }
}

const dirname: string = path.resolve();
const filepath: string = path.join(dirname, process.env.DB_AUTH || '/db/users.sqlite');

export async function initDb(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  try {
    const db: Database<sqlite3.Database, sqlite3.Statement> = await open({
      filename: filepath,
      driver: sqlite3.Database,
    });
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
        two_factor_enabled BOOLEAN NOT NULL DEFAULT 0,
        two_factor_secret TEXT,
        verified BOOLEAN NOT NULL DEFAULT 0,
        last_ip VARCHAR(255),
        last_login DATETIME NULL,
        updated_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP)
    `);
    const computer = await db.get('SELECT id FROM users WHERE username = "computer"');
    if (!computer) {
      console.log({ computer: 'created' });
      await db.run(
        'INSERT INTO users (role, username, password, email, created_at) VALUES ("admin", "computer", "computer", "computer@computer.com", CURRENT_TIMESTAMP);'
      );
    }
    return db;
  } catch (err) {
    throw new Error(`Database initialization failed: ${err}`);
  }
}
