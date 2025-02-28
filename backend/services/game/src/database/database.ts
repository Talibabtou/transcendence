import fastifyPlugin from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import * as fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url' //curly braces {} for named exports
import sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Define database interface for TypeScript
declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
  }
}

// Initialize database connection
async function dbConnector(fastify: FastifyInstance) {
  // Open SQLite database connection
  const db = await open({
    filename: './game.sqlite',
    driver: sqlite3.Database
  });
  
  // Read SQL commands from files
  const matchSql = fs.readFileSync(path.join(__dirname, '../config/match.sql'), 'utf-8')
  const goalSql = fs.readFileSync(path.join(__dirname, '../config/goal.sql'), 'utf-8')

  // Initialize tables if they don't exist
  await db.exec(matchSql)
  await db.exec(goalSql)
  
  // Make database connection available through fastify instance
  fastify.decorate('db', db)
  
  // Close database connection when Fastify server closes
  fastify.addHook('onClose', async (instance) => {
    await instance.db.close();
  });
}

export default fastifyPlugin(dbConnector)