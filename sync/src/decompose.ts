// Tier-2 (meaningful granular) population — deliberately thin. We do NOT parse
// the BFF view-models ourselves; we call the whoop-mcp projections (the
// postprocessing already lives + is maintained upstream) and map their clean
// output to columns/child rows. Tier-1 raw stays the lossless source of truth,
// so anything a projection drops or can't parse is never lost — just not
// surfaced as a column. Each domain is best-effort: a projection failure logs
// and skips (raw is already stored).
import { upsertRows, replaceChildren, contentHash } from "./db.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-ignore compiled JS, no types
import { projectRecovery } from "../../dist/projections/recovery.js";
// @ts-ignore
import { projectSleep } from "../../dist/projections/sleep.js";
// @ts-ignore
import { projectStrain } from "../../dist/projections/strain.js";
// @ts-ignore
import { projectStress } from "../../dist/projections/stress.js";
// @ts-ignore
import { projectJournal } from "../../dist/projections/journal.js";
// @ts-ignore
import { projectTrend } from "../../dist/projections/trend.js";
// @ts-ignore
import { projectSleepNeed } from "../../dist/projections/sleep_need.js";
// @ts-ignore
import { projectWorkout } from "../../dist/projections/workout.js";

type Raw = any;
const num = (v: unknown) => (v === undefined || v === null ? null : Number(v));

async function safe(domain: string, date: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    console.error(`  decompose ${domain} ${date}: ${e instanceof Error ? e.message : e} (raw kept; Tier-2 skipped)`);
  }
}

export async function decomposeRecovery(date: string, raw: Raw): Promise<void> {
  await safe("recovery", date, async () => {
    const p: any = projectRecovery(raw, date);
    const row = {
      local_date: date, score: num(p.score), state: p.state ?? null,
      hrv_ms: num(p.hrv?.ms), hrv_baseline_ms: num(p.hrv?.baseline_ms), hrv_delta_pct: num(p.hrv?.delta_pct),
      rhr_bpm: num(p.rhr?.bpm), rhr_baseline_bpm: num(p.rhr?.baseline_bpm), rhr_delta_pct: num(p.rhr?.delta_pct),
      respiratory_rate: num(p.respiratory_rate), skin_temp_c: num(p.skin_temp_c),
      sleep_performance_pct: num(p.sleep_performance_pct), calibration_state: p.calibration_state ?? null,
      content_hash: contentHash(p), updated_at: new Date().toISOString(),
    };
    await upsertRows("whoop.recovery", Object.keys(row), ["local_date"], [row], { updateOnChangeOf: "content_hash" });
    const contribs = (p.contributors ?? []).map((c: any, idx: number) => ({
      local_date: date, idx, name: c.name ?? null, direction: c.direction ?? null, detail: c.detail ?? null,
    }));
    await replaceChildren("whoop.recovery_contributors", "local_date", date, ["local_date", "idx", "name", "direction", "detail"], contribs);
  });
}

export async function decomposeSleep(date: string, raw: Raw): Promise<void> {
  await safe("sleep", date, async () => {
    const p: any = projectSleep(raw, date);
    const s = p.stages ?? {};
    const row = {
      local_date: date, started_at: p.started_at ?? null, ended_at: p.ended_at ?? null,
      total_sleep_ms: num(p.total_sleep_ms), time_in_bed_ms: num(p.time_in_bed_ms),
      efficiency_pct: num(p.efficiency_pct), performance_pct: num(p.performance_pct), consistency_pct: num(p.consistency_pct),
      debt_ms: num(p.debt_ms), latency_ms: num(p.latency_ms),
      rem_ms: num(s.rem_ms), rem_pct: num(s.rem_pct), light_ms: num(s.light_ms), light_pct: num(s.light_pct),
      sws_ms: num(s.sws_ms), sws_pct: num(s.sws_pct), wake_ms: num(s.wake_ms), wake_pct: num(s.wake_pct),
      disturbances: num(p.disturbances), sleep_hr_avg_bpm: num(p.sleep_hr?.avg_bpm), sleep_hr_min_bpm: num(p.sleep_hr?.min_bpm),
      sleep_hrv_ms: num(p.sleep_hrv_ms), respiratory_rate: num(p.respiratory_rate),
      content_hash: contentHash(p), updated_at: new Date().toISOString(),
    };
    await upsertRows("whoop.sleep_day", Object.keys(row), ["local_date"], [row], { updateOnChangeOf: "content_hash" });
    const stages = (p.hypnogram ?? []).map((h: any, idx: number) => ({
      local_date: date, idx, started_at: h.started_at ?? null, ended_at: h.ended_at ?? null, stage: h.stage ?? null,
    }));
    await replaceChildren("whoop.sleep_stages", "local_date", date, ["local_date", "idx", "started_at", "ended_at", "stage"], stages);
  });
}

export async function decomposeStrain(date: string, raw: Raw): Promise<void> {
  await safe("strain", date, async () => {
    const p: any = projectStrain(raw, date);
    const row = {
      local_date: date, score: num(p.score),
      target_value: num(p.target?.value), target_optimal_lower: num(p.target?.optimal_lower), target_optimal_upper: num(p.target?.optimal_upper),
      calories: num(p.calories), avg_hr_bpm: num(p.avg_hr_bpm), max_hr_bpm: num(p.max_hr_bpm),
      zone_durations: p.zone_durations ?? null, workouts_count: num(p.workouts_count), steps: num(p.steps),
      strength_activity_time_ms: num(p.strength_activity_time_ms),
      content_hash: contentHash(p), updated_at: new Date().toISOString(),
    };
    await upsertRows("whoop.strain_day", Object.keys(row), ["local_date"], [row], { updateOnChangeOf: "content_hash" });
  });
}

export async function decomposeStress(date: string, raw: Raw): Promise<void> {
  await safe("stress", date, async () => {
    const p: any = projectStress(raw, date);
    const row = {
      local_date: date, current_level: num(p.current_level), baseline_level: num(p.baseline_level),
      peak_level: num(p.peak_level), min_level: num(p.min_level), calibration_state: p.calibration_state ?? null,
      content_hash: contentHash(p), updated_at: new Date().toISOString(),
    };
    await upsertRows("whoop.stress_day", Object.keys(row), ["local_date"], [row], { updateOnChangeOf: "content_hash" });
    const tl = (p.timeline ?? []).map((t: any, idx: number) => ({
      local_date: date, idx, started_at: t.started_at ?? null, ended_at: t.ended_at ?? null, level: num(t.level),
    }));
    await replaceChildren("whoop.stress_timeline", "local_date", date, ["local_date", "idx", "started_at", "ended_at", "level"], tl);
  });
}

export async function decomposeJournal(date: string, raw: Raw): Promise<void> {
  await safe("journal", date, async () => {
    const p: any = projectJournal(raw, date);
    const behaviors = p.behaviors ?? [];
    const row = {
      local_date: date, cycle_id: num(p.cycle_id), journal_entry_id: p.journal_entry_id ?? null,
      notes: p.notes ?? null, behaviors_count: behaviors.length,
      content_hash: contentHash(p), updated_at: new Date().toISOString(),
    };
    await upsertRows("whoop.journal_day", Object.keys(row), ["local_date"], [row], { updateOnChangeOf: "content_hash" });
    const seen = new Set<number>();
    const rows = behaviors
      .filter((b: any) => b.behavior_tracker_id != null && !seen.has(b.behavior_tracker_id) && seen.add(b.behavior_tracker_id))
      .map((b: any) => ({
        local_date: date, behavior_tracker_id: b.behavior_tracker_id, title: b.title ?? null,
        category: b.category ?? null, internal_name: b.internal_name ?? null, answered_yes: b.answered_yes ?? null,
        magnitude_value: num(b.magnitude_value), magnitude_label: b.magnitude_label ?? null, recorded_at: b.recorded_at ?? null,
      }));
    await replaceChildren("whoop.journal_behaviors", "local_date", date,
      ["local_date", "behavior_tracker_id", "title", "category", "internal_name", "answered_yes", "magnitude_value", "magnitude_label", "recorded_at"], rows);
  });
}

// Trends are NOT decomposed: the projection emits human date labels (e.g.
// "MAY 26 - JUN 1, 26"), and trend windows are pre-computed aggregates fully
// derivable from the daily tables. Per the raw-first / minimal-postprocessing
// approach, trend responses live in Tier-1 raw (endpoint 'trend') and are
// queryable from there if ever needed. No-op by design.
export async function decomposeTrend(_metric: string, _endDate: string, _raw: Raw): Promise<void> {
  /* intentionally empty — see note above */
}

export async function decomposeSleepNeed(date: string, raw: Raw): Promise<void> {
  await safe("sleep_need", date, async () => {
    const p: any = projectSleepNeed(raw);
    const nb = p.need_breakdown ?? {};
    const row = {
      captured_on: date, recommended_minutes: num(p.recommended_time_in_bed_minutes),
      baseline_minutes: num(nb.baseline_minutes), debt_minutes: num(nb.debt_minutes),
      strain_minutes: num(nb.strain_minutes), nap_credit_minutes: num(nb.nap_credit_minutes),
      next_schedule_day: p.next_schedule_day ?? null, smart_alarm_eligible: p.smart_alarm_eligible ?? null,
      schedule_state: p.schedule_state ?? null, content_hash: contentHash(p), updated_at: new Date().toISOString(),
    };
    await upsertRows("whoop.sleep_need", Object.keys(row), ["captured_on"], [row], { updateOnChangeOf: "content_hash" });
  });
}

/** workout list row from the RAW record (basic fields); detail fills the rest. */
export async function upsertWorkoutBasic(rec: Raw): Promise<void> {
  if (!rec?.id) return;
  const row = {
    id: String(rec.id), cycle_id: num(rec.cycle_id), sport_id: num(rec.sport_id), sport_name: rec.sport_name ?? null,
    start_at: rec.start ?? null, end_at: rec.end ?? null, duration_ms: null, strain: null, avg_hr_bpm: null,
    max_hr_bpm: null, calories: null, distance_m: null, zone_durations: null, msk_total_volume_kg: null,
    msk_intensity_pct: null, msk_strain_score: null, msk_is_strength: null,
    content_hash: contentHash({ id: rec.id, basic: true }), updated_at: new Date().toISOString(),
  };
  // Seed the row (incl. NOT NULL content_hash); ON CONFLICT DO NOTHING so the
  // per-workout detail upsert (authoritative for metrics) is never clobbered.
  await upsertRows("whoop.workouts",
    ["id", "cycle_id", "sport_id", "sport_name", "start_at", "end_at", "content_hash"], ["id"],
    [{ id: row.id, cycle_id: row.cycle_id, sport_id: row.sport_id, sport_name: row.sport_name, start_at: row.start_at, end_at: row.end_at, content_hash: row.content_hash }],
    { doNothing: true });
}

export async function decomposeWorkoutDetail(activityId: string, raw: Raw): Promise<void> {
  await safe(`workout_detail:${activityId}`, "", async () => {
    const p: any = projectWorkout(raw, activityId);
    const row = {
      id: activityId, sport_name: p.sport_name ?? null, start_at: p.start ?? null, end_at: p.end ?? null,
      duration_ms: num(p.duration_ms), strain: num(p.strain), avg_hr_bpm: num(p.avg_hr_bpm), max_hr_bpm: num(p.max_hr_bpm),
      calories: num(p.calories), distance_m: num(p.distance_m), zone_durations: p.zone_durations ?? null,
      msk_total_volume_kg: num(p.msk?.total_volume_kg), msk_intensity_pct: num(p.msk?.intensity_pct),
      msk_strain_score: num(p.msk?.strain_score), msk_is_strength: p.msk?.is_strength_workout ?? null,
      content_hash: contentHash(p), updated_at: new Date().toISOString(),
    };
    await upsertRows("whoop.workouts", Object.keys(row), ["id"], [row], { updateOnChangeOf: "content_hash" });
    const hr = (p.hr_curve ?? []).map((s: any, idx: number) => ({ workout_id: activityId, idx, at: s.at ?? null, bpm: num(s.bpm) }));
    await replaceChildren("whoop.workout_hr_samples", "workout_id", activityId, ["workout_id", "idx", "at", "bpm"], hr);
  });
}
