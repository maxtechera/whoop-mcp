// Postgres I/O for the whoop schema. Uses a direct pg connection (not supabase-js
// REST, which won't expose a non-public schema). On the remote the connection
// string comes from the service's own env; locally from sync/.env. A --dry-run
// flag (DRY) skips all writes so the extract/decompose logic can be validated
// without touching the database.
import { createHash } from "node:crypto";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import pg from "pg";

// Load env so any entrypoint (sync, db-cli) gets creds. On the remote these are
// real env vars and the files are absent (no-op). Local: parent .env (WHOOP) +
// sync/.env (SUPABASE/POSTGRES).
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
loadEnv({ path: join(ROOT, ".env") });
loadEnv({ path: join(ROOT, "sync", ".env") });

export const DRY = process.argv.includes("--dry-run") || process.env.WHOOP_SYNC_DRY === "1";

let pool: pg.Pool | null = null;
function getPool(): pg.Pool {
  if (pool) return pool;
  const raw = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!raw) throw new Error("No Postgres connection string (POSTGRES_URL_NON_POOLING / DATABASE_URL)");
  // Supabase's direct connection presents a self-signed CA. Strip any sslmode
  // from the string (pg treats sslmode=require as verify-full, which rejects it)
  // and rely on the ssl object below to encrypt without CA verification.
  let conn = raw;
  try {
    const u = new URL(raw);
    u.searchParams.delete("sslmode");
    u.searchParams.delete("ssl");
    conn = u.toString();
  } catch { /* not a parseable URL; use as-is */ }
  pool = new pg.Pool({ connectionString: conn, ssl: { rejectUnauthorized: false }, max: 4 });
  return pool;
}

export async function query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (DRY) return [];
  const res = await getPool().query(sql, params);
  return res.rows as T[];
}

export async function closeDb(): Promise<void> {
  if (pool) await pool.end();
  pool = null;
}

// Canonical JSON (stable key order) → sha256, for change-detection.
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonical((value as Record<string, unknown>)[k])).join(",") + "}";
}
export function contentHash(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

/** Tier-1 raw landing. Upsert verbatim; only bumps updated_at when content changed. Returns "inserted"|"updated"|"unchanged". */
export async function upsertRaw(
  endpoint: string,
  entityKey: string,
  capturedFor: string | null,
  raw: unknown,
): Promise<"inserted" | "updated" | "unchanged" | "dry"> {
  const hash = contentHash(raw);
  if (DRY) return "dry";
  const rows = await query<{ action: string }>(
    `insert into whoop.raw_responses (endpoint, entity_key, captured_for, raw, content_hash)
     values ($1,$2,$3,$4,$5)
     on conflict (endpoint, entity_key) do update
       set raw = excluded.raw, content_hash = excluded.content_hash, updated_at = now()
       where whoop.raw_responses.content_hash <> excluded.content_hash
     returning (case when xmax = 0 then 'inserted' else 'updated' end) as action`,
    [endpoint, entityKey, capturedFor, raw, hash],
  );
  return rows.length ? (rows[0].action as "inserted" | "updated") : "unchanged";
}

/** Generic batched upsert. `rows` are objects keyed by column name. */
export async function upsertRows(
  table: string, // e.g. "whoop.recovery"
  columns: string[],
  conflictCols: string[],
  rows: Record<string, unknown>[],
  opts: { updateOnChangeOf?: string; doNothing?: boolean } = {}, // updateOnChangeOf: only DO UPDATE when this col differs; doNothing: ON CONFLICT DO NOTHING
): Promise<number> {
  if (!rows.length || DRY) return rows.length;
  const updateCols = opts.doNothing ? [] : columns.filter((c) => !conflictCols.includes(c));
  const setClause = updateCols.map((c) => `${c} = excluded.${c}`).join(", ");
  const whereClause = opts.updateOnChangeOf ? ` where ${table}.${opts.updateOnChangeOf} <> excluded.${opts.updateOnChangeOf}` : "";
  const CHUNK = 500;
  let total = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const params: unknown[] = [];
    const tuples = slice.map((row) => {
      const ph = columns.map((c) => {
        params.push(row[c] ?? null);
        return `$${params.length}`;
      });
      return `(${ph.join(",")})`;
    });
    const sql =
      `insert into ${table} (${columns.join(",")}) values ${tuples.join(",")}` +
      (updateCols.length
        ? ` on conflict (${conflictCols.join(",")}) do update set ${setClause}${whereClause}`
        : ` on conflict (${conflictCols.join(",")}) do nothing`);
    await query(sql, params);
    total += slice.length;
  }
  return total;
}

/** Replace child rows for a parent key (delete + plain insert) — for array/child tables. */
export async function replaceChildren(
  table: string,
  parentCol: string,
  parentVal: unknown,
  columns: string[],
  rows: Record<string, unknown>[],
): Promise<number> {
  if (DRY) return rows.length;
  await query(`delete from ${table} where ${parentCol} = $1`, [parentVal]);
  if (!rows.length) return 0;
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const params: unknown[] = [];
    const tuples = slice.map((row) => `(${columns.map((c) => { params.push(row[c] ?? null); return `$${params.length}`; }).join(",")})`);
    await query(`insert into ${table} (${columns.join(",")}) values ${tuples.join(",")}`, params);
  }
  return rows.length;
}
