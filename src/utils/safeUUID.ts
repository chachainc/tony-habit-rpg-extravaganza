/**
 * Safe UUID generator with fallback for Safari < 15.4 and non-secure contexts.
 * 
 * Priority:
 * 1. crypto.randomUUID() — fast, native, requires HTTPS + Safari 15.4+
 * 2. crypto.getRandomValues() — works in all modern browsers including Safari 11+
 * 3. Math.random() — last resort, not cryptographically secure
 */
export function safeUUID(): string {
    // Try native randomUUID first
    try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
    } catch {
        // randomUUID can throw in non-secure contexts — fall through
    }

    // Fallback: crypto.getRandomValues (Safari 11+)
    try {
        if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
            const bytes = new Uint8Array(16);
            crypto.getRandomValues(bytes);
            // Set version (4) and variant (RFC 4122)
            bytes[6] = (bytes[6] & 0x0f) | 0x40;
            bytes[8] = (bytes[8] & 0x3f) | 0x80;
            const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
            return (
                hex.slice(0, 8) + '-' +
                hex.slice(8, 12) + '-' +
                hex.slice(12, 16) + '-' +
                hex.slice(16, 20) + '-' +
                hex.slice(20, 32)
            );
        }
    } catch {
        // crypto.getRandomValues unavailable — fall through
    }

    // Last resort: Math.random-based UUID (not secure, but won't crash)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
