import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

function dataDir(): string {
  return path.resolve(/* turbopackIgnore: true */ process.env.DATA_DIR ?? "./data");
}

declare global {
  var __stezhokDb: DatabaseSync | undefined;
}

function createDb(): DatabaseSync {
  const dir = dataDir();
  mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(path.join(dir, "shop.db"));
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
  initSchema(db);
  return db;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      number INTEGER NOT NULL UNIQUE,
      access_token TEXT NOT NULL UNIQUE,
      idempotency_key TEXT UNIQUE,
      status TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      payment_provider TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      contact_method TEXT NOT NULL,
      delivery_method TEXT NOT NULL,
      comment TEXT,
      promo_code TEXT,
      items_total INTEGER NOT NULL,
      discount INTEGER NOT NULL,
      total INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'RUB',
      consent_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      ref_id TEXT,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      width_cm REAL,
      height_cm REAL,
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL,
      total_price INTEGER NOT NULL,
      options_json TEXT NOT NULL DEFAULT '[]',
      upload_id TEXT
    );

    CREATE TABLE IF NOT EXISTS order_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_payment_id TEXT UNIQUE,
      status TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'RUB',
      confirmation_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS webhook_events (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      event_type TEXT NOT NULL,
      received_at TEXT NOT NULL,
      processed_at TEXT,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      file_path TEXT NOT NULL,
      mime TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      original_name TEXT NOT NULL,
      width_px INTEGER NOT NULL,
      height_px INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_email ON orders (customer_email);
    CREATE INDEX IF NOT EXISTS idx_orders_promo ON orders (promo_code, customer_email);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);
    CREATE INDEX IF NOT EXISTS idx_payments_order ON payments (order_id);
    CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events (order_id);
  `);
}

export function getDb(): DatabaseSync {
  if (!globalThis.__stezhokDb) {
    globalThis.__stezhokDb = createDb();
  }
  return globalThis.__stezhokDb;
}

export function getDataDir(): string {
  return dataDir();
}

export function withTransaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // The transaction may already be rolled back by SQLite.
    }
    throw error;
  }
}
