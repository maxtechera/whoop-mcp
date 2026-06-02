-- whoop-sync · Tier 1 (raw landing) + meta tables.
-- Tier 1 is the zero-loss source of truth: every API response stored verbatim.
-- Tier 2 (granular) is derived from this and is fully rebuildable.

create schema if not exists whoop;

-- ── Tier 1: raw landing ───────────────────────────────────────────────────────
-- One row per (endpoint, entity_key). entity_key = ISO date for per-day endpoints,
-- WHOOP id for entities, metric name for trends, or 'once' for config/profile.
-- raw is the verbatim JSON. content_hash drives change-detection (WHOOP edits
-- past days); we upsert-on-change only.
create table if not exists whoop.raw_responses (
  endpoint      text        not null,
  entity_key    text        not null,
  captured_for  date,                       -- the date the data is *about* (null for config)
  raw           jsonb       not null,
  content_hash  text        not null,
  fetched_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (endpoint, entity_key)
);
create index if not exists raw_responses_endpoint_date_idx
  on whoop.raw_responses (endpoint, captured_for desc);
create index if not exists raw_responses_raw_gin
  on whoop.raw_responses using gin (raw jsonb_path_ops);

-- ── meta: durable WHOOP auth (so the remote cron self-authenticates) ──────────
-- The Supabase token store reads/refreshes/writes here. Seeded once from .env.
create table if not exists whoop.auth_tokens (
  provider      text        primary key default 'whoop',
  email         text,
  access_token  text        not null,
  refresh_token text        not null,
  expires_at    timestamptz,
  updated_at    timestamptz not null default now()
);

-- ── meta: per-domain sync cursors + run status ───────────────────────────────
create table if not exists whoop.sync_state (
  domain        text        primary key,    -- 'recovery','sleep','strain','stress','workouts','workout_detail','journal','trend','lift_prs','profile','config'
  last_cursor   text,                        -- ISO date (per-day) or window end (lists)
  backfill_from date,                        -- configured history floor for this domain
  last_run_at   timestamptz,
  last_status   text,                        -- 'ok' | 'error' | 'running'
  rows_upserted integer,
  error_detail  text
);
