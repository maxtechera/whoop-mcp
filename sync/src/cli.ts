#!/usr/bin/env -S npx tsx
// whoop-sync — autonomous WHOOP → Supabase data-ownership sync.
//   discover            profile live endpoints → SHAPES.md + coverage (Phase 0)
//   backfill [--from D] [--to D]   full-history pull (default from = account creation)
//   sync [--lookback N] daily incremental (default 5-day lookback)
//   audit | verify      no-loss / health checks
// Token source: WHOOP_SYNC_TOKEN_STORE=supabase (remote, durable) | env (local).
// --dry-run skips all DB writes (validate extract/decompose without touching the DB).
import { discover } from "./discover.js";
import { backfill, sync, todayIso } from "./extract.js";
import { audit, verify } from "./audit.js";
import { buildEnvClient, type WhoopClientT } from "./client.js";
import { closeDb } from "./db.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function getClient(): Promise<{ client: WhoopClientT; flush: () => Promise<void> }> {
  if (process.env.WHOOP_SYNC_TOKEN_STORE === "supabase") {
    const { buildRemoteClient } = await import("./supabaseTokenStore.js");
    const { client, store } = await buildRemoteClient();
    return { client, flush: () => store.flush() };
  }
  return { client: buildEnvClient(), flush: async () => {} };
}

/** Best-effort: WHOOP account-creation date from bootstrap (for full backfill). */
async function accountStart(client: WhoopClientT): Promise<string> {
  try {
    const b = (await client.get("/users-service/v2/bootstrap")) as any;
    const created = b?.account?.created_at || b?.user?.created_at;
    if (created) return String(created).slice(0, 10);
  } catch { /* fall through */ }
  return process.env.WHOOP_SYNC_BACKFILL_FLOOR || "2018-01-01";
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  switch (cmd) {
    case "discover":
      await discover();
      break;
    case "backfill": {
      const { client, flush } = await getClient();
      const from = arg("--from") || (await accountStart(client));
      const to = arg("--to") || todayIso();
      await backfill(client, from, to);
      await flush();
      break;
    }
    case "sync": {
      const { client, flush } = await getClient();
      await sync(client, Number(arg("--lookback") ?? 5));
      await flush();
      break;
    }
    case "serve": {
      const { serve } = await import("./serve.js");
      await serve();
      return; // long-running: server child + daily timer keep the process alive
    }
    case "migrate": {
      // Apply sync/supabase/migrations/*.sql directly via pg (idempotent DDL).
      // Handy when `supabase db push` isn't usable — e.g. the Supabase project's
      // migration history is managed by another app/repo sharing the database.
      const { readdirSync, readFileSync } = await import("node:fs");
      const { dirname, resolve, join } = await import("node:path");
      const { fileURLToPath } = await import("node:url");
      const { query } = await import("./db.js");
      const dir = resolve(dirname(fileURLToPath(import.meta.url)), "../supabase/migrations");
      const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
      for (const f of files) {
        await query(readFileSync(join(dir, f), "utf8"));
        console.log(`applied ${f}`);
      }
      console.log(`migrate: applied ${files.length} file(s).`);
      break;
    }
    case "audit":
      await audit();
      break;
    case "verify":
      await verify();
      break;
    default:
      console.error("usage: whoop-sync <discover|backfill|sync|audit|verify> [--from D] [--to D] [--lookback N] [--dry-run]");
      process.exit(1);
  }
  await closeDb();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack ?? e.message : e);
  process.exit(1);
});
