import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import metaRoutes from './routes/meta';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────
app.use(cors({
  origin: '*', // Allow all origins for production flexibility
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// ── Health Check ───────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ─────────────────────────────────────────
app.use('/api/meta', metaRoutes);

// ── Static Asset Serving (Production Single-Server Mode) ──
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  console.log(`[Static] Serving React app from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // ── 404 Handler for API mode ──
  app.use((_req, res) => {
    res.status(404).json({ code: 'NOT_FOUND', message: 'Endpoint not found.' });
  });
}

// ── Start Server ───────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Meta Social Manager API Server`);
  console.log(`   Running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
