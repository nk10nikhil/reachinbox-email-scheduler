import express from 'express';
import { parse } from 'url';
import next from 'next';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { initBackendServices } from './lib/backend-init';
import { getEmailQueue } from './lib/queue';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

async function startServer() {
  await nextApp.prepare();
  const app = express();

  // Initialize backend services (Redis, PostgreSQL, BullMQ, Ethereal)
  await initBackendServices();

  // Setup BullMQ official Dashboard (@bull-board)
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [new BullMQAdapter(getEmailQueue())],
    serverAdapter: serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'reachinbox-scheduler', uptime: process.uptime() });
  });

  // Delegate all remaining routes to Next.js App Router
  app.all(/.*/, (req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  app.listen(port, () => {
    console.log(`> ReachInbox Server listening at http://${hostname}:${port}`);
    console.log(`> BullMQ Dashboard accessible at http://${hostname}:${port}/admin/queues`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
