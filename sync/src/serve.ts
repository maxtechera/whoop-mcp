// Production entrypoint for the whoop-mcp Railway service: starts the MCP web
// server EXACTLY as the default CMD would (spawn `node dist/server.js`, stdio
// inherited) and runs the WHOOP→Supabase sync on a daily in-process timer
// alongside it. Sync failures are isolated and never affect the server.
//
// Automatic scheduling with no dashboard config (Railway CLI has no cron). Gated
// by WHOOP_SYNC_ENABLED=1 + a Postgres connection, so the server runs untouched
// if the sync isn't configured. Heavy backfill is NOT run here — that's a one-off
// `whoop-sync backfill` via `railway ssh`.
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sync } from "./extract.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
// Sync cadence: default hourly. Override with WHOOP_SYNC_INTERVAL_MIN.
const INTERVAL_MS = Math.max(5, Number(process.env.WHOOP_SYNC_INTERVAL_MIN ?? 60)) * 60_000;

const hasDb = (): boolean =>
  Boolean(process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || process.env.POSTGRES_URL);

// The MCP child uses WHOOP_TOKEN_STORE=memory seeded from WHOOP_* env vars,
// which Railway froze at deploy time. After the ~30-day refresh-token rotation
// any restart would boot the server with a dead token ("Refresh Token has
// expired") while the sync — which persists rotations in whoop.auth_tokens —
// kept working. Seed the child from the same row instead, so restarts pick up
// the live pair. Env vars stay as the fallback when the row is absent.
async function tokenEnvFromDb(): Promise<Record<string, string>> {
  if (!hasDb()) return {};
  try {
    const { query } = await import("./db.js");
    const rows = await query<{ email: string; access_token: string; refresh_token: string }>(
      `select email, access_token, refresh_token from whoop.auth_tokens where provider = 'whoop'`,
    );
    const r = rows[0];
    if (!r) return {};
    console.log("[serve] seeding MCP server tokens from whoop.auth_tokens");
    return { WHOOP_EMAIL: r.email, WHOOP_IOS_BEARER_TOKEN: r.access_token, WHOOP_COGNITO_REFRESH_TOKEN: r.refresh_token };
  } catch (e) {
    console.error("[serve] could not read whoop.auth_tokens, falling back to env:", e instanceof Error ? e.message : e);
    return {};
  }
}

export async function serve(): Promise<void> {
  // 1) MCP server — identical invocation to the original CMD, tokens from the DB when present.
  const server = spawn("node", ["dist/server.js"], { cwd: REPO_ROOT, stdio: "inherit", env: { ...process.env, ...(await tokenEnvFromDb()) } });
  server.on("exit", (code) => {
    console.error(`[serve] MCP server exited (code ${code}) — exiting so Railway restarts.`);
    process.exit(code ?? 1);
  });
  const shutdown = (sig: NodeJS.Signals) => {
    server.kill(sig);
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // 2) Daily sync (best-effort; isolated).
  if (process.env.WHOOP_SYNC_ENABLED !== "1" || !hasDb()) {
    console.log("[serve] sync disabled (need WHOOP_SYNC_ENABLED=1 + a Postgres URL); serving MCP only.");
    return;
  }
  const { buildRemoteClient } = await import("./supabaseTokenStore.js");
  const runSync = async (): Promise<void> => {
    try {
      console.log("[serve] daily sync starting…");
      const { client, store } = await buildRemoteClient();
      await sync(client);
      await store.flush();
      console.log("[serve] daily sync done.");
    } catch (e) {
      console.error("[serve] sync error (server unaffected):", e instanceof Error ? e.message : e);
    }
  };
  setTimeout(() => void runSync(), 90_000); // shortly after boot
  setInterval(() => void runSync(), INTERVAL_MS); // then on the interval
  console.log(`[serve] in-process sync scheduled every ${Math.round(INTERVAL_MS / 60000)} min.`);
}
