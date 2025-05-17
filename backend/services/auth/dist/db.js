import * as fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function initEloComputer() {
    let gameState = false;
    console.log('Waiting for service GAME...');
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
// Initialize database connection
export async function dbConnector(fastify) {
    // Select database based on environment
    const dbPath = path.join(path.resolve(), 'db/auth.sqlite');
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
    await initEloComputer();
    // Make database connection available through fastify instance
    fastify.decorate('db', db);
    // Close database connection when Fastify server closes
    fastify.addHook('onClose', async (instance) => {
        await instance.db.close();
    });
    console.log(`Database ${dbPath} successfully created`);
}
