import { Router } from 'express';
import { dbRun, dbGet } from '../db.js';
import { ipRateLimit } from '../middleware/rateLimit.js';
import { validateAndSanitize } from '../middleware/validate.js';

export const rewardsRouter = Router();

rewardsRouter.use(ipRateLimit);
rewardsRouter.use(validateAndSanitize);

// ─── Helpers ─────────────────────────────────

function loadProfile(code: string) {
    if (!code || code.length !== 64 || !/^[a-f0-9]+$/.test(code)) return null;
    const row = dbGet('SELECT data, version FROM profiles WHERE code = ?', [code]);
    if (!row) return null;
    return { data: JSON.parse(row.data as string), version: row.version as number };
}

function saveProfile(code: string, profileData: unknown, version: number): boolean {
    try {
        dbRun(
            `UPDATE profiles SET data = ?, updated_at = datetime('now'), version = ? WHERE code = ?`,
            [JSON.stringify(profileData), version + 1, code]
        );
        return true;
    } catch {
        return false;
    }
}

/**
 * Get today's date string in Eastern Time for daily gating.
 */
function getTodayET(): string {
    return new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' });
}

// ─── DAILY LOGIN ─────────────────────────────
rewardsRouter.post('/daily-login', async (req, res) => {
    try {
        const { code } = req.body;
        const profile = loadProfile(code);
        if (!profile) { res.status(404).json({ error: 'Profile not found' }); return; }

        const data = (profile.data || {}) as Record<string, unknown>;
        const stores = (data.stores || {}) as Record<string, unknown>;
        const today = getTodayET();

        const lastLogin = (stores.lastDailyLogin as string) || '';
        if (lastLogin === today) {
            res.status(400).json({ error: 'Daily login already claimed today' });
            return;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayET = yesterday.toLocaleDateString('en-US', { timeZone: 'America/New_York' });

        let streak = ((stores.loginStreak as number) || 0);
        streak = lastLogin === yesterdayET ? streak + 1 : 1;

        let goldReward = 50;
        if (streak >= 30) goldReward += 100;
        if (streak >= 7) goldReward += 25;

        const currentGold = typeof stores.gold === 'number' ? (stores.gold as number) : 0;
        stores.gold = currentGold + goldReward;
        stores.lastDailyLogin = today;
        stores.loginStreak = streak;
        data.stores = stores;

        const saved = saveProfile(code, data, profile.version);
        if (!saved) { res.status(500).json({ error: 'Failed to save' }); return; }

        res.json({ success: true, goldReward, streak, newGold: stores.gold });
    } catch (err) {
        console.error('Daily login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── CHESS RESULT ────────────────────────────
rewardsRouter.post('/chess', async (req, res) => {
    try {
        const { code, result, difficulty } = req.body;
        if (!['win', 'draw', 'loss'].includes(result)) {
            res.status(400).json({ error: 'Invalid result' });
            return;
        }

        const profile = loadProfile(code);
        if (!profile) { res.status(404).json({ error: 'Profile not found' }); return; }

        const data = (profile.data || {}) as Record<string, unknown>;
        const stores = (data.stores || {}) as Record<string, unknown>;
        const today = getTodayET();

        const lastChess = stores.lastChessDate as string || '';
        const chessPlaysToday = (stores.chessPlaysToday as number) || 0;
        if (lastChess === today && chessPlaysToday >= 1) {
            res.status(400).json({ error: 'Daily chess already completed' });
            return;
        }

        const xpMap: Record<string, number> = { win: 50, draw: 25, loss: 10 };
        const diffMult = typeof difficulty === 'number' ? Math.min(3, Math.max(1, difficulty)) : 1;
        const strategyXp = xpMap[result] * diffMult;

        const currentStratXp = typeof stores.strategyXp === 'number' ? (stores.strategyXp as number) : 0;
        stores.strategyXp = currentStratXp + strategyXp;
        stores.lastChessDate = today;
        stores.chessPlaysToday = lastChess === today ? chessPlaysToday + 1 : 1;
        data.stores = stores;

        const saved = saveProfile(code, data, profile.version);
        if (!saved) { res.status(500).json({ error: 'Failed to save' }); return; }

        res.json({ success: true, strategyXp, totalStrategyXp: stores.strategyXp });
    } catch (err) {
        console.error('Chess reward error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── CONQUEST NODE REWARD ────────────────────
rewardsRouter.post('/conquest-node', async (req, res) => {
    try {
        const { code, nodeId, won } = req.body;
        if (typeof nodeId !== 'string' || typeof won !== 'boolean') {
            res.status(400).json({ error: 'Invalid parameters' });
            return;
        }

        const profile = loadProfile(code);
        if (!profile) { res.status(404).json({ error: 'Profile not found' }); return; }

        const data = (profile.data || {}) as Record<string, unknown>;
        const stores = (data.stores || {}) as Record<string, unknown>;

        const conqueredNodes = (stores.conqueredNodes as string[]) || [];
        if (conqueredNodes.includes(nodeId)) {
            res.status(400).json({ error: 'Node already conquered' });
            return;
        }

        let sigilReward = 0;
        if (won) {
            sigilReward = 15 + Math.floor(Math.random() * 20);
            conqueredNodes.push(nodeId);
        }

        const currentSigils = typeof stores.sigils === 'number' ? (stores.sigils as number) : 0;
        stores.sigils = currentSigils + sigilReward;
        stores.conqueredNodes = conqueredNodes;
        data.stores = stores;

        const saved = saveProfile(code, data, profile.version);
        if (!saved) { res.status(500).json({ error: 'Failed to save' }); return; }

        res.json({ success: true, won, sigilReward, newSigils: stores.sigils });
    } catch (err) {
        console.error('Conquest reward error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── PURCHASE ────────────────────────────────
rewardsRouter.post('/purchase', async (req, res) => {
    try {
        const { code, currency, amount, itemId } = req.body;

        if (!['gold', 'sigils', 'diamonds'].includes(currency) ||
            typeof amount !== 'number' || amount <= 0 ||
            typeof itemId !== 'string') {
            res.status(400).json({ error: 'Invalid purchase parameters' });
            return;
        }

        if (amount > 100_000) {
            res.status(400).json({ error: 'Purchase amount exceeds limit' });
            return;
        }

        const profile = loadProfile(code);
        if (!profile) { res.status(404).json({ error: 'Profile not found' }); return; }

        const data = (profile.data || {}) as Record<string, unknown>;
        const stores = (data.stores || {}) as Record<string, unknown>;

        const currentBalance = typeof stores[currency] === 'number' ? (stores[currency] as number) : 0;

        if (currentBalance < amount) {
            res.status(400).json({ error: 'Insufficient funds' });
            return;
        }

        stores[currency] = currentBalance - amount;
        data.stores = stores;

        const saved = saveProfile(code, data, profile.version);
        if (!saved) { res.status(500).json({ error: 'Failed to save' }); return; }

        res.json({ success: true, currency, spent: amount, newBalance: stores[currency], itemId });
    } catch (err) {
        console.error('Purchase error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
