import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  dbPath: process.env.DB_PATH || './data/betocast.db',
  youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
};
