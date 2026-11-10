// Database access. SQLite through libSQL:
//  - on a laptop it is the file `themess.db` (nothing to install),
//  - online it is Turso, a hosted SQLite (set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN).
// Tables and sample data are created automatically on the first request.
import { createClient } from '@libsql/client';
import { TABLES } from './schema.js';
import { plantSampleData } from './sampleData.js';
import { STARTING_RULES } from './catalog.js';

const store = globalThis;

function connect() {
  const url = process.env.TURSO_DATABASE_URL || (process.env.VERCEL ? 'file:/tmp/themess.db' : 'file:themess.db');
  return createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
}

const client = store.__theMessDb ?? connect();
if (process.env.NODE_ENV !== 'production') store.__theMessDb = client;

async function prepare() {
  await client.executeMultiple(TABLES);
  const { rows } = await client.execute('SELECT COUNT(*) AS n FROM accounts');
  if (Number(rows[0].n) === 0) await plantSampleData(client);
}

/** The database client, once tables and sample data exist. */
export async function database() {
  store.__theMessReady ??= prepare().catch((err) => {
    store.__theMessReady = null;
    throw err;
  });
  await store.__theMessReady;
  return client;
}

export async function rows(sql, args = []) {
  const db = await database();
  const res = await db.execute({ sql, args });
  return res.rows.map((r) => ({ ...r }));
}
export const row = async (sql, args = []) => (await rows(sql, args))[0] ?? null;
export async function exec(sql, args = []) {
  const db = await database();
  return db.execute({ sql, args });
}

/** Run several writes as one transaction: all of them happen, or none do. */
export async function atomically(work) {
  const db = await database();
  const tx = await db.transaction('write');
  try {
    const result = await work((sql, args = []) => tx.execute({ sql, args }));
    await tx.commit();
    return result;
  } catch (err) {
    await tx.rollback();
    throw err;
  } finally {
    tx.close();
  }
}

/** Admin-editable settings, with defaults for anything not saved yet. */
export async function settings() {
  const saved = Object.fromEntries((await rows('SELECT name, json FROM config')).map((r) => [r.name, JSON.parse(r.json)]));
  return {
    prices: saved.prices ?? STARTING_RULES.prices,
    minDays: saved.min_days ?? STARTING_RULES.minDays,
    escalateAfterHours: saved.escalate_after_hours ?? STARTING_RULES.escalateAfterHours,
    clockShiftMs: saved.clock_shift_ms ?? 0,
    anyHourEntry: saved.any_hour_entry ?? true,
    demoScan: saved.demo_scan ?? true,
  };
}
export const saveSetting = (name, value) =>
  exec('INSERT INTO config (name, json) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET json = excluded.json', [name, JSON.stringify(value)]);

/** "Now" for every business rule. Includes the admin's demo clock shift. */
export async function appNow() {
  return Date.now() + (await settings()).clockShiftMs;
}
