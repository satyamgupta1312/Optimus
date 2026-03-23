import express from 'express';
import cors from 'cors';
import { prisma } from './prisma/client.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

import widgetsRouter from './routes/widgets.js';
import requestsRouter from './routes/requests.js';
import usersRouter from './routes/users.js';
import catalogRouter from './routes/catalog.js';
import activityRouter from './routes/activity.js';
import commentsRouter from './routes/comments.js';
import headerWidgetsRouter from './routes/headerWidgets.js';
import mediaRouter from './routes/media.js';
import locationsRouter from './routes/locations.js';
import kineticRouter from './routes/kinetic.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Public routes (no auth — served by <img> tags which can't send headers) ──
app.use('/api/local/media', mediaRouter);

app.use('/api/local', authMiddleware);

// ── Routes ──
app.get('/api/local/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/local/widgets', widgetsRouter);
app.use('/api/local/requests', requestsRouter);
app.use('/api/local/users', usersRouter);
app.use('/api/local/catalog', catalogRouter);
app.use('/api/local/activity', activityRouter);
app.use('/api/local/comments', commentsRouter);
app.use('/api/local/header-widgets', headerWidgetsRouter);
app.use('/api/local/locations', locationsRouter);
app.use('/api/local/kinetic', kineticRouter);

// ── Error Handler ──
app.use(errorHandler);

// ── Start ──
app.listen(PORT, () => {
  console.log(`[optimus-api] Running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
