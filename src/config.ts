import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  dbPath: process.env.DB_PATH || './data/betocast.db',
  youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
  logDir: process.env.LOG_DIR || '',
  logLevel: process.env.LOG_LEVEL || 'info',
  logToFile: process.env.LOG_TO_FILE !== 'false',
  auth: {
    enabled: process.env.AUTH_ENABLED === 'true',
    authentikUrl: process.env.AUTHENTIK_URL || '',
    clientId: process.env.AUTHENTIK_CLIENT_ID || '',
    clientSecret: process.env.AUTHENTIK_CLIENT_SECRET || '',
    callbackUrl: process.env.AUTHENTIK_CALLBACK_URL || 'http://localhost:3000/auth/callback',
    sessionSecret: process.env.SESSION_SECRET || 'change-this-secret-in-production',
  },
};
