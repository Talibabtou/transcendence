import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
const dirname = path.resolve();
const filepath = path.join(dirname, process.env.DB_FRIENDS || '/db/friends.sqlite');
export async function initDb() {
    try {
        const db = await open({
            filename: filepath,
            driver: sqlite3.Database,
        });
        await db.exec(`
        CREATE TABLE IF NOT EXISTS friends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_1 VARCHAR(32) NOT NULL,
        id_2 VARCHAR(32) NOT NULL,
        accepted BOOLEAN NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP)
    `);
        return db;
    }
    catch (err) {
        throw new Error(`Database initialization failed: ${err}`);
    }
}
