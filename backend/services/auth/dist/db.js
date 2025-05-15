import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
const dirname = path.resolve();
const filepath = path.join(dirname, process.env.DB_AUTH || '/db/users.sqlite');
export async function initDb() {
    try {
        const db = await open({
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
            await db.run('INSERT INTO users (id, role, username, password, email, created_at) VALUES ("b36c8474-a8a6-b889-af67-08ccca5a7593" ,"admin", "computer", "computer", "computer@computer.com", CURRENT_TIMESTAMP);');
            let gameState = false;
            console.log("Waiting for service GAME...");
            while (!gameState) {
                try {
                    const eloUrl = `http://${process.env.GAME_ADDR || 'localhost'}:8083/elo/b36c8474-a8a6-b889-af67-08ccca5a7593`;
                    const response = await fetch(eloUrl, { method: 'POST' });
                    if (response.status !== 201) {
                        throw new Error('Create elo failed');
                    }
                    gameState = true;
                }
                catch (err) {
                    gameState = false;
                }
            }
        }
        else {
            throw new Error('Create user failed');
        }
        console.log("Db successfully created");
        return db;
    }
    catch (err) {
        throw new Error(`Database initialization failed: ${err}`);
    }
}
