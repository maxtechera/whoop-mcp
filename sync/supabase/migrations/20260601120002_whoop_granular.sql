-- whoop-sync · Tier 2 (meaningful granular). Derived from Tier-1 raw via the
-- whoop-mcp projections + targeted data_scrubber_details time-series extraction.
-- Columns mirror the projection output schemas (src/schemas/*). Nested objects
-- are flattened (hrv{ms,baseline_ms} -> hrv_ms, hrv_baseline_ms). UI chrome is
-- intentionally NOT modelled — it lives in whoop.raw_responses (Tier 1).
-- All tables rebuildable from raw; ON CONFLICT updates only on content_hash change.

-- ── recovery (per-day) ───────────────────────────────────────────────────────
create table if not exists whoop.recovery (
  local_date            date primary key,
  score                 numeric,
  state                 text,
  hrv_ms                numeric,
  hrv_baseline_ms       numeric,
  hrv_delta_pct         numeric,
  rhr_bpm               numeric,
  rhr_baseline_bpm      numeric,
  rhr_delta_pct         numeric,
  respiratory_rate      numeric,
  skin_temp_c           numeric,
  sleep_performance_pct numeric,
  calibration_state     text,
  content_hash          text not null,
  updated_at            timestamptz not null default now()
);
create table if not exists whoop.recovery_contributors (
  local_date  date not null references whoop.recovery(local_date) on delete cascade,
  idx         int  not null,
  name        text,
  direction   text,
  detail      text,
  primary key (local_date, idx)
);

-- ── sleep (per-day) + hypnogram ──────────────────────────────────────────────
create table if not exists whoop.sleep_day (
  local_date       date primary key,
  started_at       timestamptz,
  ended_at         timestamptz,
  total_sleep_ms   bigint,
  time_in_bed_ms   bigint,
  efficiency_pct   numeric,
  performance_pct  numeric,
  consistency_pct  numeric,
  debt_ms          bigint,
  latency_ms       bigint,
  rem_ms           bigint,  rem_pct   numeric,
  light_ms         bigint,  light_pct numeric,
  sws_ms           bigint,  sws_pct   numeric,
  wake_ms          bigint,  wake_pct  numeric,
  disturbances     int,
  sleep_hr_avg_bpm numeric,
  sleep_hr_min_bpm numeric,
  sleep_hrv_ms     numeric,
  respiratory_rate numeric,
  content_hash     text not null,
  updated_at       timestamptz not null default now()
);
create table if not exists whoop.sleep_stages (
  local_date  date not null references whoop.sleep_day(local_date) on delete cascade,
  idx         int  not null,
  started_at  timestamptz,
  ended_at    timestamptz,
  stage       text,
  primary key (local_date, idx)
);

-- ── strain (per-day) ─────────────────────────────────────────────────────────
create table if not exists whoop.strain_day (
  local_date               date primary key,
  score                    numeric,
  target_value             numeric,
  target_optimal_lower     numeric,
  target_optimal_upper     numeric,
  calories                 numeric,
  avg_hr_bpm               numeric,
  max_hr_bpm               numeric,
  zone_durations           jsonb,   -- full 6 zones {zone_0..zone_5 ms}; raw-faithful
  workouts_count           int,
  steps                    int,
  strength_activity_time_ms bigint,
  content_hash             text not null,
  updated_at               timestamptz not null default now()
);

-- ── stress (per-day) + intraday timeline ─────────────────────────────────────
create table if not exists whoop.stress_day (
  local_date        date primary key,
  current_level     numeric,
  baseline_level    numeric,
  peak_level        numeric,
  min_level         numeric,
  calibration_state text,
  content_hash      text not null,
  updated_at        timestamptz not null default now()
);
create table if not exists whoop.stress_timeline (
  local_date  date not null references whoop.stress_day(local_date) on delete cascade,
  idx         int  not null,
  started_at  timestamptz,
  ended_at    timestamptz,
  level       numeric,
  primary key (local_date, idx)
);

-- ── workouts + per-workout HR curve ──────────────────────────────────────────
create table if not exists whoop.workouts (
  id                 text primary key,
  cycle_id           bigint,
  sport_id           int,
  sport_name         text,
  start_at           timestamptz,
  end_at             timestamptz,
  duration_ms        bigint,
  strain             numeric,
  avg_hr_bpm         numeric,
  max_hr_bpm         numeric,
  calories           numeric,
  distance_m         numeric,
  zone_durations     jsonb,
  msk_total_volume_kg numeric,
  msk_intensity_pct   numeric,
  msk_strain_score    numeric,
  msk_is_strength     boolean,
  content_hash       text not null,
  updated_at         timestamptz not null default now()
);
create table if not exists whoop.workout_hr_samples (
  workout_id  text not null references whoop.workouts(id) on delete cascade,
  idx         int  not null,
  at          timestamptz,
  bpm         int,
  primary key (workout_id, idx)
);

-- ── strength: sets/exercises (from workout_detail) + PRs ─────────────────────
create table if not exists whoop.lift_sets (
  workout_id   text not null,
  exercise_id  text not null,
  set_idx      int  not null,
  exercise_name text,
  reps         int,
  weight       numeric,
  weight_units text,
  volume       numeric,
  avg_hr_bpm   numeric,
  medal        text,
  primary key (workout_id, exercise_id, set_idx)
);
create table if not exists whoop.lift_prs (
  exercise_id  text not null,
  metric       text not null,      -- e.g. tonnage / max_weight / 1rm
  pr_value     numeric,
  pr_units     text,
  achieved_on  date,
  raw          jsonb,
  primary key (exercise_id, metric)
);

-- ── journal (per-day) + behaviors ────────────────────────────────────────────
create table if not exists whoop.journal_day (
  local_date       date primary key,
  cycle_id         bigint,
  journal_entry_id text,
  notes            text,
  behaviors_count  int,
  content_hash     text not null,
  updated_at       timestamptz not null default now()
);
create table if not exists whoop.journal_behaviors (
  local_date          date not null references whoop.journal_day(local_date) on delete cascade,
  behavior_tracker_id bigint not null,
  title               text,
  category            text,
  internal_name       text,
  answered_yes        boolean,
  magnitude_value     numeric,
  magnitude_label     text,
  recorded_at         timestamptz,
  primary key (local_date, behavior_tracker_id)
);

-- ── trends (per metric) + segments + points ──────────────────────────────────
create table if not exists whoop.trend_segments (
  metric        text not null,
  window_label  text not null,    -- week | month | six_month | year
  start_date    date,
  end_date      date,
  avg           numeric,
  min           numeric,
  max           numeric,
  delta_pct     numeric,
  unit          text,
  content_hash  text not null,
  updated_at    timestamptz not null default now(),
  primary key (metric, window_label)
);
create table if not exists whoop.trend_points (
  metric        text not null,
  window_label  text not null,
  point_date    date not null,
  value         numeric,
  value_display text,
  primary key (metric, window_label, point_date)
);

-- ── config / profile (slowly-changing snapshots) ─────────────────────────────
create table if not exists whoop.hr_zone_defs (
  effective_at timestamptz not null default now(),
  zone_id      text not null,
  min_bpm      int,
  max_bpm      int,
  content_hash text not null,
  primary key (effective_at, zone_id)
);
create table if not exists whoop.sleep_need (
  captured_on              date primary key,
  recommended_minutes      int,
  baseline_minutes         int,
  debt_minutes             int,
  strain_minutes           int,
  nap_credit_minutes       int,
  next_schedule_day        text,
  smart_alarm_eligible     boolean,
  schedule_state           text,
  content_hash             text not null,
  updated_at               timestamptz not null default now()
);
create table if not exists whoop.profile_snapshots (
  snapshot_id  bigint generated always as identity primary key,
  captured_on  date not null,
  raw          jsonb not null,
  content_hash text not null,
  fetched_at   timestamptz not null default now(),
  unique (captured_on, content_hash)
);
create table if not exists whoop.hidden_metrics (
  metric       text not null,   -- BODY_COMP | HEALTHSPAN
  captured_on  date not null,
  raw          jsonb not null,
  content_hash text not null,
  fetched_at   timestamptz not null default now(),
  primary key (metric, captured_on, content_hash)
);
