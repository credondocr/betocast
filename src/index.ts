import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config.js';
import { initDb, closeDb, saveDb } from './db/index.js';
import { initSocket } from './websocket/index.js';
import { streamsRouter } from './routes/streams.js';
import { syncRouter } from './routes/sync.js';
import { overlayRouter } from './routes/overlay.js';
import { categoriesRouter } from './routes/categories.js';
import { logger } from './logger.js';

async function main() {
  logger.info('Iniciando BetoCast server...');
  await initDb();

  const app = express();
  const httpServer = createServer(app);

  app.use(cors());
  app.use(express.json());

  initSocket(httpServer);

  app.use('/api/streams', streamsRouter);
  app.use('/api/streams', syncRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/overlay', overlayRouter);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  httpServer.listen(config.port, () => {
    logger.info(`BetoCast server running on http://localhost:${config.port}`);
    logger.info(`API: http://localhost:${config.port}/api/streams`);
    logger.info(`Health: http://localhost:${config.port}/api/health`);
  });

  const shutdown = (signal: string) => {
    logger.info(`Shutdown signal received: ${signal}`);
    saveDb();
    closeDb();
    httpServer.close(() => {
      logger.info('Servidor cerrado correctamente');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Shutdown timeout, forzando salida');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason: reason instanceof Error ? reason.message : String(reason) });
  });
}

main().catch((err) => {
  logger.error('Error starting server', { error: err.message, stack: err.stack });
  process.exit(1);
});
