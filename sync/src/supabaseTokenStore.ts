// Durable WHOOP auth for the autonomous remote cron: tokens live in
// whoop.auth_tokens, so the service reads → refreshes → writes them back itself,
// surviving restarts and the ~30-day refresh-token rotation with no harness in
// the loop. Seeded once from env (WHOOP_* vars) on first run.
import { query, DRY } from "./db.js";

// @ts-ignore - compiled JS from the parent package
import { TokenManager } from "../../dist/whoop/token_manager.js";
// @ts-ignore
import { WhoopClient } from "../../dist/whoop/client.js";
import type { WhoopClientT } from "./client.js";

interface TokenRow {
  email: string;
  access_token: string;
  refresh_token: string;
}

/** TokenStore impl persisting rotations to whoop.auth_tokens (fire-and-forget; flush() awaits). */
export class SupabaseTokenStore {
  private pending: Promise<unknown> = Promise.resolve();
  constructor(private email: string) {}

  save(updates: { accessToken: string; refreshToken: string }): void {
    if (DRY) return;
    this.pending = query(
      `insert into whoop.auth_tokens (provider, email, access_token, refresh_token, updated_at)
       values ('whoop', $1, $2, $3, now())
       on conflict (provider) do update
         set access_token = excluded.access_token,
             refresh_token = excluded.refresh_token,
             email = excluded.email,
             updated_at = now()`,
      [this.email, updates.accessToken, updates.refreshToken],
    ).catch((e) => console.error("token persist failed:", e instanceof Error ? e.message : e));
  }

  async flush(): Promise<void> {
    await this.pending;
  }
}

async function loadTokens(): Promise<TokenRow | null> {
  const rows = await query<TokenRow>(
    `select email, access_token, refresh_token from whoop.auth_tokens where provider = 'whoop'`,
  );
  return rows[0] ?? null;
}

/**
 * Remote client: tokens from whoop.auth_tokens, seeded from env on first run.
 * Returns the client + its token store (call store.flush() before exit).
 */
export async function buildRemoteClient(): Promise<{ client: WhoopClientT; store: SupabaseTokenStore }> {
  let row = await loadTokens();
  const email = row?.email || process.env.WHOOP_EMAIL;
  if (!email) throw new Error("No WHOOP email (whoop.auth_tokens empty and WHOOP_EMAIL unset)");
  const store = new SupabaseTokenStore(email);

  let accessToken = row?.access_token || process.env.WHOOP_IOS_BEARER_TOKEN;
  let refreshToken = row?.refresh_token || process.env.WHOOP_COGNITO_REFRESH_TOKEN;
  if (!accessToken || !refreshToken) throw new Error("No WHOOP tokens in whoop.auth_tokens or env");

  // Seed the table if it was empty (first run on the remote).
  if (!row && !DRY) store.save({ accessToken, refreshToken });

  const tm = new TokenManager({ email, accessToken, refreshToken, store });
  return { client: new WhoopClient({ getToken: () => tm.getToken() }) as WhoopClientT, store };
}
