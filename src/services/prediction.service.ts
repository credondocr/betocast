import { queryAll, queryOne, run } from '../db/helpers.js';

export interface Prediction {
  id: number;
  stream_id: string;
  user_id: string;
  user_name: string | null;
  car_number: string;
  created_at: string;
}

export interface PredictionResult {
  car_number: string;
  driver_name: string | null;
  color: string;
  count: number;
  users: { user_id: string; user_name: string | null }[];
}

export interface PredictionWinner {
  user_id: string;
  user_name: string | null;
}

export function registerPrediction(
  streamId: string,
  userId: string,
  userName: string,
  carNumber: string
): { success: boolean; prediction?: Prediction; reason?: string } {
  const existing = queryOne(
    'SELECT id FROM predictions WHERE stream_id = ? AND user_id = ?',
    [streamId, userId]
  );
  if (existing) {
    return { success: false, reason: 'Ya predijo' };
  }

  const result = run(
    'INSERT INTO predictions (stream_id, user_id, user_name, car_number) VALUES (?, ?, ?, ?)',
    [streamId, userId, userName, carNumber]
  );

  const prediction = queryOne<Prediction>(
    'SELECT * FROM predictions WHERE id = ?',
    [result.lastInsertRowid]
  );
  return { success: true, prediction };
}

export function getPredictionResults(streamId: string): PredictionResult[] {
  const results = queryAll<{ car_number: string; driver_name: string | null; color: string; count: number }>(
    `SELECT
       p.car_number,
       pl.driver_name,
       pl.color,
       COUNT(*) as count
     FROM predictions p
     LEFT JOIN pilots pl ON pl.stream_id = p.stream_id AND pl.car_number = p.car_number
     WHERE p.stream_id = ?
     GROUP BY p.car_number
     ORDER BY count DESC`,
    [streamId]
  );

  return results.map(r => {
    const users = queryAll<{ user_id: string; user_name: string | null }>(
      'SELECT user_id, user_name FROM predictions WHERE stream_id = ? AND car_number = ?',
      [streamId, r.car_number]
    );
    return { ...r, users };
  });
}

export function getPredictionStats(streamId: string): { totalPredictions: number; totalPredictors: number } {
  const row = queryOne<{ totalPredictions: number; totalPredictors: number }>(
    'SELECT COUNT(*) as totalPredictions, COUNT(DISTINCT user_id) as totalPredictors FROM predictions WHERE stream_id = ?',
    [streamId]
  );
  return row || { totalPredictions: 0, totalPredictors: 0 };
}

export function resolvePredictions(
  streamId: string,
  winningCarNumber: string
): { success: boolean; winners: PredictionWinner[]; message: string } {
  const winners = queryAll<PredictionWinner>(
    'SELECT user_id, user_name FROM predictions WHERE stream_id = ? AND car_number = ?',
    [streamId, winningCarNumber]
  );

  return {
    success: true,
    winners,
    message: `${winners.length} usuario(s) acertaron la prediccion`,
  };
}
