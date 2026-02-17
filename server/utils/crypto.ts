import crypto from 'node:crypto';

/**
 * Generate a cryptographically secure share code.
 * 32 random bytes → 64-character hexadecimal string.
 * Not guessable, not sequential, not timestamp-derived.
 */
export function generateShareCode(): string {
    return crypto.randomBytes(32).toString('hex');
}
