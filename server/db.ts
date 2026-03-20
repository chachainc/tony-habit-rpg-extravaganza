import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'gamifiedlife.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let db: SqlJsDatabase;

/**
 * Initialize SQLite database via sql.js (pure JS, no native deps).
 */
export async function initDatabase(): Promise<void> {
    const SQL = await initSqlJs();

    // Load existing DB file or create new
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }

    // Enable WAL-like behavior (not real WAL in sql.js but sets pragma)
    db.run('PRAGMA journal_mode = MEMORY;');

    db.run(`
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            code TEXT UNIQUE NOT NULL,
            data TEXT DEFAULT '{}',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            version INTEGER DEFAULT 1
        );
    `);

    // Create index if not exists
    db.run('CREATE INDEX IF NOT EXISTS idx_profiles_code ON profiles (code);');

    // Migration: add google_email column (safe to re-run)
    try {
        db.run('ALTER TABLE profiles ADD COLUMN google_email TEXT;');
        console.log('✅ Migration: google_email column added.');
    } catch {
        // Column already exists — expected on subsequent runs
    }

    try {
        db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_google_email ON profiles (google_email);');
    } catch {
        // Index already exists
    }

    const result = db.exec('SELECT COUNT(*) as cnt FROM profiles');
    const count = result[0]?.values[0]?.[0] ?? 0;
    console.log(`✅ Database connected — profiles table ready (${count} profiles).`);
}

/**
 * Persist the in-memory DB to disk.
 * Call after any write operation.
 */
function persistDb(): void {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
}

// ─── Query helpers (synchronous, matching better-sqlite3 API feel) ───

export function dbRun(sql: string, params: unknown[] = []): void {
    db.run(sql, params as (string | number | null | Uint8Array)[]);
    persistDb();
}

export function dbGet(sql: string, params: unknown[] = []): Record<string, unknown> | undefined {
    const stmt = db.prepare(sql);
    stmt.bind(params as (string | number | null | Uint8Array)[]);

    if (stmt.step()) {
        const columns = stmt.getColumnNames();
        const values = stmt.get();
        const row: Record<string, unknown> = {};
        columns.forEach((col: string, i: number) => {
            row[col] = values[i];
        });
        stmt.free();
        return row;
    }

    stmt.free();
    return undefined;
}

export { db };
