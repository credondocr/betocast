import { getDb, saveDb } from './index.js';

export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | undefined {
  const results = queryAll<T>(sql, params);
  return results[0];
}

export function run(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number } {
  const db = getDb();
  db.run(sql, params);
  const changes = db.getRowsModified();
  const idRow = queryOne<{ last_insert_rowid: number }>('SELECT last_insert_rowid() as last_insert_rowid');
  saveDb();
  return { changes, lastInsertRowid: idRow?.last_insert_rowid ?? 0 };
}
