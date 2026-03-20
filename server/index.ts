import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { initDatabase } from './db.js';
import { profileRouter } from './routes/profile.js';
import { rewardsRouter } from './routes/rewards.js';
import { authRouter } from './routes/auth.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

const NON_HTML_PATH_PREFIXES = ['/assets/', '/icons/', '/workbox-'];
const NON_HTML_EXACT_PATHS = new Set([
    '/manifest.json',
    '/sw.js',
    '/vite.svg',
]);
const NON_HTML_EXTENSIONS = new Set([
    '.js',
    '.mjs',
    '.css',
    '.map',
    '.json',
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.gif',
    '.svg',
    '.ico',
    '.woff',
    '.woff2',
    '.ttf',
    '.otf',
    '.txt',
    '.xml',
]);

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
app.use('/api/auth', authRouter);

// ─── Health check ────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

function isNonHtmlAssetPath(pathname: string): boolean {
    if (NON_HTML_EXACT_PATHS.has(pathname)) {
        return true;
    }

    if (NON_HTML_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
        return true;
    }

    const lastDot = pathname.lastIndexOf('.');
    if (lastDot === -1) {
        return false;
    }

    const extension = pathname.slice(lastDot).toLowerCase();
    return NON_HTML_EXTENSIONS.has(extension);
}

// ─── Serve static frontend in production ─────
if (process.env.NODE_ENV === 'production') {
    const { default: path } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const distPath = path.join(__dirname, '..', 'dist');

    app.use(express.static(distPath, { index: false }));

    // SPA fallback only for real HTML document navigations
    app.get(/.*/, (req, res, next) => {
        if (req.path.startsWith('/api/') || isNonHtmlAssetPath(req.path)) {
            return next();
        }

        return res.sendFile(path.join(distPath, 'index.html'));
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
