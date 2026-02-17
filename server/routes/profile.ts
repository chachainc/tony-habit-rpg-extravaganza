import { Router, type Request } from 'express';
import { dbRun, dbGet } from '../db.js';
import { generateShareCode } from '../utils/crypto.js';
import { ipRateLimit, codeRateLimit, checkLockout, recordFailedLookup, clearLockout } from '../middleware/rateLimit.js';
import { validateAndSanitize, validateProfileData, validateStateTransition } from '../middleware/validate.js';

function getIp(req: Request): string {
    const raw = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    return typeof raw === 'string' ? raw : (raw[0] ?? 'unknown');
}

export const profileRouter = Router();

// Apply rate limiting to all profile routes
profileRouter.use(ipRateLimit);

// ─── CREATE PROFILE ──────────────────────────
// POST /api/profile
profileRouter.post('/', validateAndSanitize, async (req, res) => {
    try {
        const code = generateShareCode();
        const profileName = (typeof req.body.name === 'string' ? req.body.name.slice(0, 50) : 'Hero') || 'Hero';

        const initialData = {
            profileName,
            createdAt: new Date().toISOString(),
            stores: {},
        };

        dbRun(
            'INSERT INTO profiles (id, code, data, version) VALUES (lower(hex(randomblob(16))), ?, ?, 1)',
            [code, JSON.stringify(initialData)]
        );

        console.log(`✅ Profile created: ${code.slice(0, 8)}...`);
        res.status(201).json({ code, profileName });
    } catch (err) {
        console.error('Profile creation error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── LOAD PROFILE ────────────────────────────
// GET /api/profile/:code
profileRouter.get('/:code', checkLockout, codeRateLimit, async (req, res) => {
    try {
        const { code } = req.params;

        // Basic code format validation
        if (!code || code.length !== 64 || !/^[a-f0-9]+$/.test(code)) {
            recordFailedLookup(getIp(req));
            res.status(404).json({ error: 'Profile not found' });
            return;
        }

        const row = dbGet('SELECT data, version, updated_at FROM profiles WHERE code = ?', [code]);

        if (!row) {
            recordFailedLookup(getIp(req));
            res.status(404).json({ error: 'Profile not found' });
            return;
        }

        clearLockout(getIp(req));

        res.json({
            data: JSON.parse(row.data as string),
            version: row.version,
            lastSaved: row.updated_at,
        });
    } catch (err) {
        console.error('Profile load error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── SAVE PROFILE ────────────────────────────
// PUT /api/profile/:code
profileRouter.put('/:code', checkLockout, codeRateLimit, validateAndSanitize, async (req, res) => {
    try {
        const { code } = req.params;

        // Basic code format validation
        if (!code || code.length !== 64 || !/^[a-f0-9]+$/.test(code)) {
            recordFailedLookup(getIp(req));
            res.status(404).json({ error: 'Profile not found' });
            return;
        }

        const profileData = req.body.data;
        if (!profileData) {
            res.status(400).json({ error: 'Missing data field' });
            return;
        }

        // Validate the new state
        const validation = validateProfileData(profileData);
        if (!validation.valid) {
            res.status(400).json({ error: validation.error });
            return;
        }

        // Load current profile for transition validation
        const current = dbGet('SELECT data, version FROM profiles WHERE code = ?', [code]);

        if (!current) {
            recordFailedLookup(getIp(req));
            res.status(404).json({ error: 'Profile not found' });
            return;
        }

        const currentData = JSON.parse(current.data as string) as Record<string, unknown>;

        // Sanity check the state transition
        const transitionCheck = validateStateTransition(
            currentData,
            profileData as Record<string, unknown>
        );
        if (!transitionCheck.valid) {
            console.warn(`⚠️ Rejected save for code ${code.slice(0, 8)}...: ${transitionCheck.error}`);
            res.status(400).json({ error: 'Save rejected: suspicious state change' });
            return;
        }

        // Save with version bump
        const newVersion = ((current.version as number) || 1) + 1;
        dbRun(
            `UPDATE profiles SET data = ?, updated_at = datetime('now'), version = ? WHERE code = ?`,
            [JSON.stringify(profileData), newVersion, code]
        );

        clearLockout(getIp(req));

        res.json({
            success: true,
            version: newVersion,
        });
    } catch (err) {
        console.error('Profile save error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
