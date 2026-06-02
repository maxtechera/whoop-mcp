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

export async function serve(): Promise<void> {
  // 1) MCP server — identical invocation to the original CMD.
  const server = spawn("node", ["dist/server.js"], { cwd: REPO_ROOT, stdio: "inherit" });
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
  const hasDb = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (process.env.WHOOP_SYNC_ENABLED !== "1" || !hasDb) {
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
