# Deploy — autonomous WHOOP → Supabase sync

The Docker image serves two roles from one entrypoint (`whoop-sync serve`): the **WHOOP MCP web server** (`/mcp`) **and** an in-process sync on an hourly timer. Deploy it to any Docker host (Railway, Fly, Render, a VPS). Examples below use Railway.

## Environment variables
| var | value |
|---|---|
| `POSTGRES_URL_NON_POOLING` | your Supabase direct connection string (Settings → Database → URI) |
| `WHOOP_SYNC_TOKEN_STORE` | `supabase` (durable auth in `whoop.auth_tokens`) |
| `WHOOP_SYNC_ENABLED` | `1` (turns the in-process sync on) |
| `WHOOP_SYNC_INTERVAL_MIN` | `60` (optional; sync cadence) |
| `WHOOP_EMAIL`, `WHOOP_IOS_BEARER_TOKEN`, `WHOOP_COGNITO_REFRESH_TOKEN` | first-run seed for `whoop.auth_tokens` (from `whoop-mcp auth`) |
| `MCP_TRANSPORT=http`, `MCP_AUTH_TOKEN` | required by the MCP server (see main README → Remote hosting) |

After the first run, `whoop.auth_tokens` is authoritative and self-refreshes; the seed vars can stay.

## Steps (Railway example)
1. Create a service from your fork (or `railway up` from the repo). The image builds `dist/` + `sync/`.
2. Set the env vars above.
3. The container runs `whoop-sync serve` → MCP server + hourly sync. Confirm in the logs:
   `[serve] in-process sync scheduled every 60 min.` and `[whoop-mcp] listening …`.

## One-time full backfill (on the remote)
The hourly sync only catches recent days. Pull full history once:
```bash
railway ssh "cd /app && sync/node_modules/.bin/tsx sync/src/cli.ts backfill"
```
Heavy (years × daily endpoints + per-workout detail); resumes via `whoop.sync_state` if interrupted. Run off-peak.

## Verify
```bash
railway ssh "cd /app && sync/node_modules/.bin/tsx sync/src/cli.ts audit"   # coverage, date gaps, freshness
```
After the next tick, `whoop.sync_state.last_run_at` advances with `last_status = ok`.

## Notes
- Same image serves both roles; the sync ignores the MCP-only env vars.
- `--dry-run` (or `WHOOP_SYNC_DRY=1`) runs extract + project with **no** DB writes — handy for validating without touching the database.
- No cron primitive on your host? `serve`'s in-process timer needs none. If your host *does* have cron, you can instead schedule `whoop-sync sync` and run the MCP server separately.
