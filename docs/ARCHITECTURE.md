# Architecture — own your WHOOP data

This fork adds a **data-ownership layer** on top of the WHOOP MCP. The idea, in one line:

> **sync → Supabase → read.** An autonomous job syncs the WHOOP API into a Postgres schema you own (raw response stored verbatim), and a CLI reads it back with the **same shape the WHOOP MCP returns** — offline, over your full history.

The live MCP stays available for real-time values; everything historical/analytical comes from your database.

```
  ┌── 1. SYNC ─────────────┐   ┌── 2. SUPABASE ────────────┐   ┌── 3. READ ──────────────┐
  │ autonomous job pulls   │   │ owned store: raw verbatim │   │ whoop-db CLI mirrors    │
  │ the WHOOP API on a     │──▶│ (lossless) + thin derived │──▶│ the MCP's read tools,   │
  │ schedule (backfill +   │   │ tables + UI-shape views   │   │ served from the DB      │
  │ hourly incremental)    │   │                           │   │                         │
  └────────────────────────┘   └───────────────────────────┘   └─────────────────────────┘
```

## Storage — three tiers (raw is the source of truth)

WHOOP's deep-dive endpoints return **BFF view-models** (the iOS app's render tree), and the available "clean" projections drop some fields. So we store **raw first** and derive everything else from it.

- **Tier 1 — `whoop.raw_responses`**: every WHOOP response stored **verbatim** as `jsonb`. Lossless source of truth; idempotent (upsert only when the content hash changes). Also holds `whoop.auth_tokens` (durable, self-refreshing WHOOP auth) and `whoop.sync_state` (per-domain cursors + status).
- **Tier 2 — clean tables**: `recovery`, `sleep_day` (+`sleep_stages`), `strain_day`, `stress_day`, `workouts`, `journal_day`, `sleep_need`, `hr_zone_defs`, `profile_snapshots`, `hidden_metrics`. Populated by running the **MCP's own projections** over the raw (no custom parsing). Rebuildable from raw, so a bug is never data loss. Series the projections don't decode (intraday stress timeline, workout HR curves) stay in raw.
- **Tier 3 — views**: `v_daily`, `v_workouts` (convenience joins) and **raw-passthrough views** — `whoop.stress`, `whoop.trends`, and `whoop.{recovery,sleep,strain,journal,home,workout}_raw` — that surface WHOOP's exact response shape, so you can **re-create the WHOOP UI** from your own DB.

## The two CLIs (`sync/`, run with `tsx`)

- **`whoop-sync`** — the pipeline: `discover` (profile endpoints → shape report), `backfill` (full history, cursor-resumable), `sync` (incremental), `migrate` (apply `supabase/migrations/*.sql` via `pg`, idempotent), `audit` / `verify` (coverage, date-gaps, freshness), `serve` (MCP server + in-process hourly sync). `--dry-run` skips writes.
- **`whoop-db`** — the WHOOP MCP's read tools, served from Supabase: each command loads the stored raw → runs the same projection → identical output. `today`, `recovery|sleep|strain|stress|journal|cycle [--date]`, `trend <METRIC>`, `workouts`, `workout <id>`, `profile`, `sleep_need`, `hr_zones`, `raw <endpoint> [key]` (verbatim UI shape), `list`, `sql "<query>"`.

## Runtime

The sync runs **autonomously**: a one-time full backfill, then an in-process timer (hourly by default, `WHOOP_SYNC_INTERVAL_MIN`) co-located with the MCP server via `whoop-sync serve`. WHOOP auth is durable — tokens live in `whoop.auth_tokens` and the service refreshes + persists them itself (surviving the ~30-day refresh-token rotation). See [SETUP.md](./SETUP.md) and [DEPLOY.md](./DEPLOY.md).

## Implementation notes
- Writes use a **direct Postgres connection** (`pg`), not the Supabase REST API — PostgREST doesn't expose non-`public` schemas. Supabase's direct connection presents a self-signed CA, so the client strips `sslmode` and sets `ssl: { rejectUnauthorized: false }`.
- Idempotency: per-day grain keys on `local_date`; entities on their WHOOP id; child rows on parent + index. `ON CONFLICT` updates only when the content hash differs.
- Schema changes: add a file under `sync/supabase/migrations/` and run `whoop-sync migrate` (idempotent DDL via `pg`).
