import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { config } from '../config.js';
import { SCHEMA } from './schema.js';
import { logger } from '../logger.js';

let db: import('sql.js').Database;
let dbPath: string;
let dirty = false;
let saveTimer: ReturnType<typeof setInterval> | null = null;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

const SAVE_INTERVAL_MS = 5000;
const CLEANUP_INTERVAL_MS = 300_000;
const MAX_CHAT_MESSAGES_PER_STREAM = 1000;

export async function initDb(): Promise<void> {
  const SQL = await initSqlJs();
  dbPath = config.dbPath;
  mkdirSync(dirname(dbPath), { recursive: true });

  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath);
    db = new SQL.Database(buffer);
    logger.info(`BD cargada desde ${dbPath}`);
  } else {
    db = new SQL.Database();
    logger.info(`BD nueva creada en ${dbPath}`);
  }

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  for (const stmt of SCHEMA.split(';').map(s => s.trim()).filter(Boolean)) {
    db.run(stmt);
  }

  saveDb();
  startAutoSave();
  startCleanup();
}

function startAutoSave(): void {
  if (saveTimer) return;
  saveTimer = setInterval(() => {
    if (dirty) {
      try {
        saveDb();
        dirty = false;
        logger.debug('BD guardada (auto-save)');
      } catch (err: any) {
        logger.error('Error en auto-save de BD', { error: err.message });
      }
    }
  }, SAVE_INTERVAL_MS);
  if (saveTimer.unref) saveTimer.unref();
}

function startCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    try {
      db.run(`
        DELETE FROM chat_messages WHERE id NOT IN (
          SELECT id FROM chat_messages
          PARTITION BY stream_id
          ORDER BY created_at DESC
          LIMIT ${MAX_CHAT_MESSAGES_PER_STREAM}
        )
      `);
      if (db.getRowsModified() > 0) {
        dirty = true;
        logger.info('chat_messages limpiada (cleanup periódico)');
      }
    } catch {
      try {
        const streams = db.exec('SELECT id FROM streams');
        if (streams.length > 0) {
          for (const streamId of streams[0].values) {
            db.run(
              `DELETE FROM chat_messages WHERE stream_id = ? AND id NOT IN (
                SELECT id FROM chat_messages WHERE stream_id = ? ORDER BY created_at DESC LIMIT ?
              )`,
              [streamId, streamId, MAX_CHAT_MESSAGES_PER_STREAM]
            );
          }
          if (db.getRowsModified() > 0) dirty = true;
        }
      } catch { /* ignore */ }
    }
  }, CLEANUP_INTERVAL_MS);
  if (cleanupTimer.unref) cleanupTimer.unref();
}

export function getDb(): import('sql.js').Database {
  if (!db) throw new Error('DB no inicializada. Llama initDb() primero.');
  return db;
}

export function markDirty(): void {
  dirty = true;
}

export function saveDb(): void {
  if (!db || !dbPath) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(dbPath, buffer);
  dirty = false;
}

export function closeDb(): void {
  if (saveTimer) {
    clearInterval(saveTimer);
    saveTimer = null;
  }
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
  if (dirty) saveDb();
  if (db) {
    db.close();
    logger.info('BD cerrada');
  }
}
