import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config.js';
import { initDb } from './db/index.js';
import { initSocket } from './websocket/index.js';
import { streamsRouter } from './routes/streams.js';
import { syncRouter } from './routes/sync.js';
import { overlayRouter } from './routes/overlay.js';
import { categoriesRouter } from './routes/categories.js';

async function main() {
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
    console.log(`\n  🏁 BetoCast server running on http://localhost:${config.port}\n`);
    console.log(`  API:     http://localhost:${config.port}/api/streams`);
    console.log(`  Health:  http://localhost:${config.port}/api/health\n`);
  });
}

main().catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});
