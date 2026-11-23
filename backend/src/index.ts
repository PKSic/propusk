import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { studentsRouter } from './routes/students.js';
import { subjectsRouter } from './routes/subjects.js';
import { lessonsRouter } from './routes/lessons.js';
import { attendanceRouter } from './routes/attendance.js';
import { statisticsRouter } from './routes/statistics.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIST = path.resolve(__dirname, '../../frontend/dist');

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      return callback(null, true);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', group: 'ВЕБ-32К', service: 'Attendance Manager API' });
});

app.use('/api/students', studentsRouter);
app.use('/api/subjects', subjectsRouter);
app.use('/api/lessons', lessonsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/statistics', statisticsRouter);

// Serve frontend static files if built
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

app.use((_req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

app.use(errorHandler);

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Attendance Manager API (ВЕБ-32К) listening on http://localhost:${PORT}`);
});
