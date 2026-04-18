const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quiz');
const attemptRoutes = require('./routes/attempt');
const extractRoutes = require('./routes/extract');

const app = express();

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map((o) => o.trim()) : []),
];

app.use(cors({
  origin: (origin, cb) => {
    // allow server-to-server / curl (no origin header)
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api', quizRoutes);
app.use('/api', attemptRoutes);
app.use('/api', extractRoutes);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
