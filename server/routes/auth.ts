import { Router } from 'express';
import admin from 'firebase-admin';
import { dbRun, dbGet } from '../db.js';
import { generateInitialProfile } from './profile.js';

// Initialize Firebase Admin (once)
let firebaseAdminReady = false;

if (!admin.apps.length) {
    try {
        const { default: fs } = await import('node:fs');
        const { default: path } = await import('node:path');
        const { fileURLToPath } = await import('node:url');
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const keyPath = path.join(__dirname, '..', 'serviceAccountKey.json');

        if (fs.existsSync(keyPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log('✅ Firebase Admin initialized (service account)');
            firebaseAdminReady = true;
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
            });
            console.log('✅ Firebase Admin initialized (env credentials)');
            firebaseAdminReady = true;
        } else {
            console.error('❌ Firebase Admin NOT initialized — Google auth disabled');
            console.error('   Place serviceAccountKey.json in server/ or set GOOGLE_APPLICATION_CREDENTIALS');
        }
    } catch (err) {
        console.error('❌ Firebase Admin init error:', err);
    }
}

const ALLOWED_EMAIL = 'aduca375@gmail.com';

export const authRouter = Router();

// ─── GOOGLE AUTH ─────────────────────────────
// POST /api/auth/google
authRouter.post('/google', async (req, res) => {
    try {
        if (!firebaseAdminReady) {
            res.status(500).json({ error: 'Firebase Admin not configured' });
            return;
        }

        const { idToken } = req.body;
        if (!idToken || typeof idToken !== 'string') {
            res.status(400).json({ error: 'Missing idToken' });
            return;
        }

        // Verify the Firebase ID token
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(idToken);
        } catch (err) {
            console.error('Token verification failed:', err);
            res.status(401).json({ error: 'Invalid or expired token' });
            return;
        }

        const email = decodedToken.email;
        if (!email || email.toLowerCase() !== ALLOWED_EMAIL) {
            res.status(403).json({ error: 'Unauthorized email. Only aduca375@gmail.com is allowed.' });
            return;
        }

        // 1. Check for existing profile already linked to this Google email
        const existing = dbGet(
            'SELECT code, data FROM profiles WHERE google_email = ?',
            [email.toLowerCase()]
        );

        if (existing) {
            const data = JSON.parse(existing.data as string);
            console.log(`✅ Google login: already linked profile for ${email}`);
            res.json({
                code: existing.code,
                profileName: data.profileName || 'Hero',
            });
            return;
        }

        // 2. Create a brand new profile using the exact same logic as normal creation
        const { code, profileName, initialData } = generateInitialProfile(decodedToken.name);

        dbRun(
            'INSERT INTO profiles (id, code, data, version, google_email) VALUES (lower(hex(randomblob(16))), ?, ?, 1, ?)',
            [code, JSON.stringify(initialData), email.toLowerCase()]
        );

        console.log(`✅ Google login: new profile created for ${email}`);
        res.status(201).json({ code, profileName });
    } catch (err) {
        console.error('Google auth error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
