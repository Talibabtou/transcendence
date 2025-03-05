import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export async function initDb() {
  try {
    const db = await open({
      filename: './db/users.db',
      driver: sqlite3.Database
    });
  
    await db.exec(`
          CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
          username VARCHAR(21) NOT NULL UNIQUE,
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