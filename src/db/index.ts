import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { config } from '../config.js';
import { SCHEMA } from './schema.js';

let db: import('sql.js').Database;
let dbPath: string;

export async function initDb(): Promise<void> {
  const SQL = await initSqlJs();
  dbPath = config.dbPath;
  mkdirSync(dirname(dbPath), { recursive: true });

  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  for (const stmt of SCHEMA.split(';').map(s => s.trim()).filter(Boolean)) {
    db.run(stmt);
  }

  saveDb();
}

export function getDb(): import('sql.js').Database {
  if (!db) throw new Error('DB no inicializada. Llama initDb() primero.');
  return db;
}

export function saveDb(): void {
  if (!db || !dbPath) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(dbPath, buffer);
}
