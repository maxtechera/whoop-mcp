// Extraction orchestration. Two-pass: per-day endpoints + per-entity fan-out
// (workouts → cardio-details). Tier-1 raw is written for everything (lossless);
// Tier-2 is best-effort via decompose. Cursors tracked in whoop.sync_state.
import { upsertRaw, upsertRows, replaceChildren, query, contentHash } from "./db.js";
import { withRetry, pMap, CircuitBreaker } from "./resilience.js";
import type { WhoopClientT } from "./client.js";
import {
  DAILY_QUERY_ENDPOINTS, DAILY_PATH_ENDPOINTS, CONFIG_ENDPOINTS,
  WORKOUTS_ENDPOINT, WORKOUT_DETAIL_ENDPOINT, TREND_ENDPOINT, TREND_METRICS, LIFT_PRS_ENDPOINT,
} from "./endpoints.js";
import {
  decomposeRecovery, decomposeSleep, decomposeStrain, decomposeStress, decomposeJournal,
  decomposeTrend, decomposeSleepNeed, decomposeWorkoutDetail, upsertWorkoutBasic,
} from "./decompose.js";

const num = (v: unknown) => (v === undefined || v === null ? null : Number(v));
function isoDay(d: Date): string { return d.toISOString().slice(0, 10); }
function addDays(iso: string, n: number): string { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return isoDay(d); }
function daysBetween(from: string, to: string): string[] { const out: string[] = []; for (let d = from; d <= to; d = addDays(d, 1)) out.push(d); return out; }
export function todayIso(): string { return isoDay(new Date()); }

const DECOMPOSERS: Record<string, (date: string, raw: unknown) => Promise<void>> = {
  recovery: decomposeRecovery, sleep: decomposeSleep, strain: decomposeStrain,
  stress: decomposeStress, journal: decomposeJournal,
};

const breaker = new CircuitBreaker(10);
async function getRaw(client: WhoopClientT, path: string, query?: Record<string, string | number>): Promise<unknown> {
  try { const r = await withRetry(() => client.get(path, query)); breaker.ok(); return r; }
  catch (e) { breaker.fail(); throw e; }
}

async function setSyncState(domain: string, patch: { cursor?: string; status: string; rows?: number; error?: string | null }): Promise<void> {
  await query(
    `insert into whoop.sync_state (domain, last_cursor, last_run_at, last_status, rows_upserted, error_detail)
     values ($1,$2,now(),$3,$4,$5)
     on conflict (domain) do update set
       last_cursor = coalesce(excluded.last_cursor, whoop.sync_state.last_cursor),
       last_run_at = now(), last_status = excluded.last_status,
       rows_upserted = excluded.rows_upserted, error_detail = excluded.error_detail`,
    [domain, patch.cursor ?? null, patch.status, patch.rows ?? null, patch.error ?? null],
  );
}

/** One day: all per-day endpoints → Tier-1 raw + Tier-2 decompose. */
export async function extractDay(client: WhoopClientT, date: string): Promise<void> {
  for (const ep of DAILY_QUERY_ENDPOINTS) {
    try {
      const raw = await getRaw(client, ep.path, { date });
      await upsertRaw(ep.name, date, date, raw);
      if (DECOMPOSERS[ep.name]) await DECOMPOSERS[ep.name](date, raw);
    } catch (e) {
      // cycle 400s for non-womens-health accounts — expected N/A, don't spam
      if (!(e instanceof Error && /contraception|menstrual/i.test(e.message))) {
        console.error(`  ${ep.name} ${date}: ${e instanceof Error ? e.message : e}`);
      }
    }
  }
  for (const ep of DAILY_PATH_ENDPOINTS) {
    try {
      const raw = await getRaw(client, ep.path(date));
      await upsertRaw(ep.name, date, date, raw);
      if (DECOMPOSERS[ep.name]) await DECOMPOSERS[ep.name](date, raw);
    } catch (e) { console.error(`  ${ep.name} ${date}: ${e instanceof Error ? e.message : e}`); }
  }
}

/** Workouts over [startISO,endISO] + per-workout detail fan-out. */
export async function extractWorkouts(client: WhoopClientT, startISO: string, endISO: string): Promise<number> {
  const raw = (await getRaw(client, WORKOUTS_ENDPOINT.path, { start: startISO, end: endISO, limit: 25 })) as { records?: any[] };
  await upsertRaw("workouts", `${startISO}_${endISO}`, isoDay(new Date(endISO)), raw);
  const records = raw?.records ?? [];
  for (const rec of records) {
    try { await upsertWorkoutBasic(rec); }
    catch (e) { console.error(`  workout basic ${rec?.id}: ${e instanceof Error ? e.message : e}`); }
  }
  const ids = records.map((r) => r.id).filter(Boolean).map(String);
  await pMap(ids, 3, async (id) => {
    try {
      const detail = await getRaw(client, WORKOUT_DETAIL_ENDPOINT.path, { activityId: id });
      await upsertRaw("workout_detail", id, null, detail);
      await decomposeWorkoutDetail(id, detail);
    } catch (e) { console.error(`  workout_detail ${id}: ${e instanceof Error ? e.message : e}`); }
  });
  return records.length;
}

export async function extractTrends(client: WhoopClientT, endDate: string): Promise<void> {
  await pMap(TREND_METRICS, 3, async (metric) => {
    try {
      const raw = await getRaw(client, TREND_ENDPOINT.path(metric), { endDate });
      await upsertRaw("trend", metric, endDate, raw);
      await decomposeTrend(metric, endDate, raw);
    } catch (e) { console.error(`  trend ${metric}: ${e instanceof Error ? e.message : e}`); }
  });
}

export async function extractConfig(client: WhoopClientT, date: string): Promise<void> {
  for (const ep of CONFIG_ENDPOINTS) {
    try {
      const raw = await getRaw(client, ep.path);
      await upsertRaw(ep.name, "once", date, raw);
      if (ep.name === "bootstrap") {
        await upsertRows("whoop.profile_snapshots", ["captured_on", "raw", "content_hash"], ["captured_on", "content_hash"],
          [{ captured_on: date, raw, content_hash: contentHash(raw) }]);
      } else if (ep.name === "hidden_body_comp" || ep.name === "hidden_healthspan") {
        const metric = ep.name === "hidden_body_comp" ? "BODY_COMP" : "HEALTHSPAN";
        await upsertRows("whoop.hidden_metrics", ["metric", "captured_on", "raw", "content_hash"], ["metric", "captured_on", "content_hash"],
          [{ metric, captured_on: date, raw, content_hash: contentHash(raw) }]);
      } else if (ep.name === "hr_zones") {
        const zones = ((raw as any)?.zones ?? []).map((z: any) => ({
          effective_at: new Date().toISOString().slice(0, 10) + "T00:00:00Z", zone_id: String(z.id),
          min_bpm: num(z.min), max_bpm: num(z.max), content_hash: contentHash(z),
        }));
        if (zones.length) await upsertRows("whoop.hr_zone_defs", ["effective_at", "zone_id", "min_bpm", "max_bpm", "content_hash"], ["effective_at", "zone_id"], zones, { updateOnChangeOf: "content_hash" });
      } else if (ep.name === "sleep_need") {
        await decomposeSleepNeed(date, raw);
      }
    } catch (e) { console.error(`  config ${ep.name}: ${e instanceof Error ? e.message : e}`); }
  }
  // PRs (lifetime window)
  try {
    const raw = await getRaw(client, LIFT_PRS_ENDPOINT.path, { startDate: "2015-01-01", endDate: date, offset: 0 });
    await upsertRaw("lift_prs", "all", date, raw);
  } catch (e) { console.error(`  lift_prs: ${e instanceof Error ? e.message : e}`); }
}

/** Full-history backfill. */
export async function backfill(client: WhoopClientT, from: string, to: string): Promise<void> {
  console.log(`backfill ${from} → ${to}`);
  const days = daysBetween(from, to);
  await setSyncState("backfill", { status: "running", cursor: from });
  // per-day (concurrency 3); persist cursor as we advance
  let done = 0;
  await pMap(days, 3, async (date) => {
    await extractDay(client, date);
    done++;
    if (done % 30 === 0) { console.log(`  ...${done}/${days.length} days`); await setSyncState("daily", { status: "running", cursor: date }); }
  });
  await setSyncState("daily", { status: "ok", cursor: to, rows: days.length });
  // workouts in 14-day windows (limit 25/call)
  let win = from, wcount = 0;
  while (win <= to) {
    const winEnd = addDays(win, 13) > to ? to : addDays(win, 13);
    wcount += await extractWorkouts(client, win + "T00:00:00Z", winEnd + "T23:59:59Z");
    win = addDays(winEnd, 1);
  }
  await setSyncState("workouts", { status: "ok", cursor: to, rows: wcount });
  await extractTrends(client, to); await setSyncState("trend", { status: "ok", cursor: to });
  await extractConfig(client, to); await setSyncState("config", { status: "ok", cursor: to });
  await setSyncState("backfill", { status: "ok", cursor: to });
  console.log(`backfill complete: ${days.length} days, ${wcount} workouts.`);
}

/** Daily incremental: recent days + recent workouts + trends + config. */
export async function sync(client: WhoopClientT, lookbackDays = 5): Promise<void> {
  const today = todayIso();
  const from = addDays(today, -lookbackDays);
  console.log(`sync ${from} → ${today}`);
  try {
    for (const date of daysBetween(from, today)) await extractDay(client, date);
    await setSyncState("daily", { status: "ok", cursor: today, rows: lookbackDays + 1 });
    const w = await extractWorkouts(client, addDays(today, -14) + "T00:00:00Z", today + "T23:59:59Z");
    await setSyncState("workouts", { status: "ok", cursor: today, rows: w });
    await extractTrends(client, today); await setSyncState("trend", { status: "ok", cursor: today });
    await extractConfig(client, today); await setSyncState("config", { status: "ok", cursor: today });
  } catch (e) {
    await setSyncState("daily", { status: "error", error: e instanceof Error ? e.message : String(e) });
    throw e;
  }
  console.log("sync complete.");
}
