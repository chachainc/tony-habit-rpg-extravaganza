import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { initDatabase } from './db.js';
import { profileRouter } from './routes/profile.js';
import { rewardsRouter } from './routes/rewards.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// ─── Security Headers ────────────────────────
app.use(helmet({
    contentSecurityPolicy: false, // Let Vite handle CSP in dev
}));

// ─── CORS (allow Vite dev server) ────────────
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:4173'],
    credentials: true,
}));

// ─── Body parsing with size limit ────────────
app.use(express.json({ limit: '256kb' }));

// ─── API Routes ──────────────────────────────
app.use('/api/profile', profileRouter);
app.use('/api/reward', rewardsRouter);

// ─── Health check ────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Serve static frontend in production ─────
if (process.env.NODE_ENV === 'production') {
    const { default: path } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const distPath = path.join(__dirname, '..', 'dist');

    app.use(express.static(distPath));

    // SPA fallback
    app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

// ─── Start ───────────────────────────────────
async function start() {
    await initDatabase();
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}

start().catch(console.error);
