// Builds an authenticated WhoopClient by reusing the whoop-mcp library
// (TokenManager + WhoopClient from the compiled dist/). For local dev/discovery
// the WHOOP tokens come from the parent whoop-mcp/.env; on the remote they come
// from Supabase (see supabaseTokenStore.ts).
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

// @ts-ignore - importing the compiled JS from the parent package (no types shipped)
import { TokenManager } from "../../dist/whoop/token_manager.js";
// @ts-ignore
import { WhoopClient } from "../../dist/whoop/client.js";

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const PARENT_ENV = join(REPO_ROOT, ".env");

// Load parent .env (WHOOP_*), then sync/.env (SUPABASE_*) without overriding.
loadEnv({ path: PARENT_ENV });
loadEnv({ path: join(REPO_ROOT, "sync", ".env") });

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

export interface WhoopClientT {
  get<T = unknown>(path: string, query?: Record<string, string | number | boolean | undefined | null>): Promise<T>;
}

/** Local/dev client: tokens from the parent .env, rotations persisted back there. */
export function buildEnvClient(): WhoopClientT {
  const tm = new TokenManager({
    email: requireEnv("WHOOP_EMAIL"),
    accessToken: requireEnv("WHOOP_IOS_BEARER_TOKEN"),
    refreshToken: requireEnv("WHOOP_COGNITO_REFRESH_TOKEN"),
    envPath: PARENT_ENV,
  });
  return new WhoopClient({ getToken: () => tm.getToken() }) as WhoopClientT;
}

export const WHOOP_USER_ID = process.env.WHOOP_USER_ID;
