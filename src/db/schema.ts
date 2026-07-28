export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS streams (
    id TEXT PRIMARY KEY,
    youtube_url TEXT,
    video_id TEXT,
    title TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'closed')),
    max_pilots_display INTEGER DEFAULT 10,
    last_message_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS pilots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stream_id TEXT NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
    car_number TEXT NOT NULL,
    driver_name TEXT,
    color TEXT DEFAULT '#3b82f6',
    UNIQUE(stream_id, car_number)
  );

  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stream_id TEXT NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT,
    car_number TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stream_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stream_id TEXT NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
    youtube_message_id TEXT UNIQUE,
    user_id TEXT,
    user_name TEXT,
    message TEXT,
    is_vote INTEGER DEFAULT 0,
    car_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stream_id TEXT NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT,
    car_number TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stream_id, user_id)
  );
`;
