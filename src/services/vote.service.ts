import { queryAll, queryOne, run } from '../db/helpers.js';
import { v4 as uuidv4 } from 'uuid';

export interface Stream {
  id: string;
  youtube_url: string | null;
  video_id: string | null;
  title: string | null;
  status: 'active' | 'paused' | 'closed';
  max_pilots_display: number;
  last_message_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pilot {
  id: number;
  stream_id: string;
  car_number: string;
  driver_name: string | null;
  color: string;
}

export interface Vote {
  id: number;
  stream_id: string;
  user_id: string;
  user_name: string | null;
  car_number: string;
  created_at: string;
}

export interface VoteResult {
  car_number: string;
  driver_name: string | null;
  color: string;
  count: number;
}

export function createStream(youtubeUrl: string, title?: string): Stream {
  const id = uuidv4().slice(0, 8);
  const videoId = extractVideoId(youtubeUrl);

  run(
    'INSERT INTO streams (id, youtube_url, video_id, title) VALUES (?, ?, ?, ?)',
    [id, youtubeUrl, videoId, title || null]
  );

  return getStream(id)!;
}

export function getStream(id: string): Stream | undefined {
  return queryOne<Stream>('SELECT * FROM streams WHERE id = ?', [id]);
}

export function listStreams(): Stream[] {
  return queryAll<Stream>('SELECT * FROM streams ORDER BY created_at DESC');
}

export function updateStream(id: string, updates: Partial<Pick<Stream, 'title' | 'status' | 'max_pilots_display' | 'last_message_id'>>): Stream | undefined {
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return getStream(id);

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  run(`UPDATE streams SET ${fields.join(', ')} WHERE id = ?`, values);
  return getStream(id);
}

export function deleteStream(id: string): boolean {
  const result = run('DELETE FROM streams WHERE id = ?', [id]);
  return result.changes > 0;
}

export function addPilot(streamId: string, carNumber: string, driverName?: string, color?: string): Pilot {
  run(
    'INSERT INTO pilots (stream_id, car_number, driver_name, color) VALUES (?, ?, ?, ?)',
    [streamId, carNumber, driverName || null, color || '#3b82f6']
  );

  return queryOne<Pilot>(
    'SELECT * FROM pilots WHERE stream_id = ? AND car_number = ?',
    [streamId, carNumber]
  )!;
}

export function removePilot(streamId: string, carNumber: string): boolean {
  const result = run('DELETE FROM pilots WHERE stream_id = ? AND car_number = ?', [streamId, carNumber]);
  return result.changes > 0;
}

export function listPilots(streamId: string): Pilot[] {
  return queryAll<Pilot>('SELECT * FROM pilots WHERE stream_id = ? ORDER BY car_number', [streamId]);
}

export function registerVote(streamId: string, userId: string, userName: string, carNumber: string): { success: boolean; vote?: Vote; reason?: string } {
  const existing = queryOne('SELECT id FROM votes WHERE stream_id = ? AND user_id = ?', [streamId, userId]);
  if (existing) {
    return { success: false, reason: 'Ya votó' };
  }

  const result = run(
    'INSERT INTO votes (stream_id, user_id, user_name, car_number) VALUES (?, ?, ?, ?)',
    [streamId, userId, userName, carNumber]
  );

  const vote = queryOne<Vote>('SELECT * FROM votes WHERE id = ?', [result.lastInsertRowid]);
  return { success: true, vote };
}

export function getVoteResults(streamId: string): VoteResult[] {
  return queryAll<VoteResult>(
    `SELECT
       v.car_number,
       p.driver_name,
       p.color,
       COUNT(*) as count
     FROM votes v
     LEFT JOIN pilots p ON p.stream_id = v.stream_id AND p.car_number = v.car_number
     WHERE v.stream_id = ?
     GROUP BY v.car_number
     ORDER BY count DESC`,
    [streamId]
  );
}

export function getVoteStats(streamId: string): { totalVotes: number; totalVoters: number } {
  const row = queryOne<{ totalVotes: number; totalVoters: number }>(
    'SELECT COUNT(*) as totalVotes, COUNT(DISTINCT user_id) as totalVoters FROM votes WHERE stream_id = ?',
    [streamId]
  );
  return row || { totalVotes: 0, totalVoters: 0 };
}

export function logChatMessage(
  streamId: string,
  youtubeMessageId: string,
  userId: string,
  userName: string,
  message: string,
  isVote: boolean,
  carNumber: string | null
): void {
  run(
    `INSERT OR IGNORE INTO chat_messages
     (stream_id, youtube_message_id, user_id, user_name, message, is_vote, car_number)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [streamId, youtubeMessageId, userId, userName, message, isVote ? 1 : 0, carNumber]
  );
}

function extractVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  const liveMatch = url.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/);
  if (liveMatch) return liveMatch[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return null;
}
