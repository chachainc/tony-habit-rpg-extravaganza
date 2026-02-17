import type { Request, Response, NextFunction } from 'express';

const MAX_STRING_LENGTH = 1000;

/**
 * Strip dangerous content from strings recursively.
 */
function sanitizeValue(value: unknown): unknown {
    if (typeof value === 'string') {
        // Strip script tags and event handlers
        let clean = value.replace(/<script[\s\S]*?<\/script>/gi, '');
        clean = clean.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
        clean = clean.replace(/<[^>]*>/g, ''); // Strip all HTML tags
        // Truncate to max length
        return clean.slice(0, MAX_STRING_LENGTH);
    }
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    if (value !== null && typeof value === 'object') {
        const sanitized: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value)) {
            sanitized[sanitizeValue(k) as string] = sanitizeValue(v);
        }
        return sanitized;
    }
    return value;
}

/**
 * Validate that the request body is a valid JSON object and sanitize strings.
 */
export function validateAndSanitize(req: Request, res: Response, next: NextFunction): void {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeValue(req.body);
    }
    next();
}

/**
 * Validate profile data structure — reject impossible states.
 */
export function validateProfileData(data: unknown): { valid: boolean; error?: string } {
    if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Profile data must be an object' };
    }

    const d = data as Record<string, unknown>;

    // Check currency ranges
    const currencyKeys = ['gold', 'diamonds', 'tickets', 'sigils'];
    for (const key of currencyKeys) {
        if (key in d && typeof d[key] === 'number') {
            const val = d[key] as number;
            if (val < 0) return { valid: false, error: `${key} cannot be negative` };
            if (val > 10_000_000) return { valid: false, error: `${key} exceeds maximum` };
        }
    }

    // Check level ranges
    if ('level' in d && typeof d.level === 'number') {
        if (d.level < 1 || d.level > 999) {
            return { valid: false, error: 'Level out of valid range' };
        }
    }

    // Check XP ranges
    if ('totalXp' in d && typeof d.totalXp === 'number') {
        if (d.totalXp < 0 || d.totalXp > 1_000_000_000) {
            return { valid: false, error: 'XP out of valid range' };
        }
    }

    return { valid: true };
}

/**
 * Sanity check: detect impossible jumps between old and new profile data.
 */
export function validateStateTransition(
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>
): { valid: boolean; error?: string } {
    // Max currency change per save: 100,000 (very generous threshold)
    const MAX_CURRENCY_JUMP = 100_000;
    const currencyPaths = ['gold', 'diamonds', 'tickets', 'sigils'];

    for (const key of currencyPaths) {
        const oldVal = typeof oldData[key] === 'number' ? (oldData[key] as number) : 0;
        const newVal = typeof newData[key] === 'number' ? (newData[key] as number) : 0;
        const jump = newVal - oldVal;

        if (jump > MAX_CURRENCY_JUMP) {
            return { valid: false, error: `Suspicious ${key} increase: +${jump}` };
        }
    }

    // Max XP change per save: 500,000 (very generous)
    const MAX_XP_JUMP = 500_000;
    const oldXp = typeof oldData.totalXp === 'number' ? (oldData.totalXp as number) : 0;
    const newXp = typeof newData.totalXp === 'number' ? (newData.totalXp as number) : 0;
    if (newXp - oldXp > MAX_XP_JUMP) {
        return { valid: false, error: `Suspicious XP increase: +${newXp - oldXp}` };
    }

    return { valid: true };
}
