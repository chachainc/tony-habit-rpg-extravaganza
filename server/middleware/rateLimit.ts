import type { Request, Response, NextFunction } from 'express';

// ─── In-memory rate tracking ─────────────────
interface RateEntry {
    count: number;
    resetAt: number;
}

interface LockoutEntry {
    failures: number;
    lockedUntil: number;
}

const ipLimits = new Map<string, RateEntry>();
const codeLimits = new Map<string, RateEntry>();
const failedLookups = new Map<string, LockoutEntry>();

const IP_LIMIT = 60;        // requests per window
const CODE_LIMIT = 30;      // requests per window per code
const WINDOW_MS = 60_000;   // 1 minute
const LOCKOUT_FAILURES = 5;
const LOCKOUT_DURATION_MS = 15 * 60_000; // 15 minutes

function getEntry(map: Map<string, RateEntry>, key: string): RateEntry {
    const now = Date.now();
    let entry = map.get(key);
    if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + WINDOW_MS };
        map.set(key, entry);
    }
    return entry;
}

/**
 * IP-based rate limiter: 60 requests/minute per IP.
 */
export function ipRateLimit(req: Request, res: Response, next: NextFunction): void {
    const rawIp = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const ip = typeof rawIp === 'string' ? rawIp : (rawIp[0] ?? 'unknown');
    const entry = getEntry(ipLimits, ip);
    entry.count++;

    res.setHeader('X-RateLimit-Limit', IP_LIMIT.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, IP_LIMIT - entry.count).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000).toString());

    if (entry.count > IP_LIMIT) {
        const retryAfter = Math.ceil((entry.resetAt - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());
        res.status(429).json({ error: 'Too many requests. Please wait.' });
        return;
    }

    next();
}

/**
 * Per-profile-code rate limiter: 30 requests/minute per code.
 */
export function codeRateLimit(req: Request, res: Response, next: NextFunction): void {
    const code = req.params.code;
    if (!code) { next(); return; }

    const entry = getEntry(codeLimits, code);
    entry.count++;

    if (entry.count > CODE_LIMIT) {
        const retryAfter = Math.ceil((entry.resetAt - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());
        res.status(429).json({ error: 'Too many requests for this profile.' });
        return;
    }

    next();
}

/**
 * Failed-lookup lockout: 5 invalid attempts → 15 min block.
 */
export function checkLockout(req: Request, res: Response, next: NextFunction): void {
    const rawIp = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const ip = typeof rawIp === 'string' ? rawIp : (rawIp[0] ?? 'unknown');
    const entry = failedLookups.get(ip);

    if (entry && entry.lockedUntil > Date.now()) {
        const retryAfter = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());
        res.status(429).json({ error: 'Temporarily blocked. Try again later.' });
        return;
    }

    next();
}

/**
 * Record a failed lookup attempt for an IP.
 */
export function recordFailedLookup(ip: string): void {
    const entry = failedLookups.get(ip) || { failures: 0, lockedUntil: 0 };
    entry.failures++;

    if (entry.failures >= LOCKOUT_FAILURES) {
        entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
        entry.failures = 0; // Reset counter after applying lockout
    }

    failedLookups.set(ip, entry);
}

/**
 * Clear lockout state for an IP (on successful lookup).
 */
export function clearLockout(ip: string): void {
    failedLookups.delete(ip);
}

// ─── Periodic cleanup (every 5 minutes) ─────
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of ipLimits) {
        if (now > val.resetAt) ipLimits.delete(key);
    }
    for (const [key, val] of codeLimits) {
        if (now > val.resetAt) codeLimits.delete(key);
    }
    for (const [key, val] of failedLookups) {
        if (val.lockedUntil > 0 && now > val.lockedUntil) failedLookups.delete(key);
    }
}, 5 * 60_000);
