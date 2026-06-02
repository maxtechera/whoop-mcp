#!/usr/bin/env -S npx tsx
// whoop-db — the WHOOP MCP's read tools, served from your OWNED Supabase data
// instead of the live WHOOP API. Each command loads the stored raw response from
// whoop.raw_responses and runs the SAME whoop-mcp projection the MCP server uses,
// so the output is identical — but offline, owned, and historical.
//
// Needs POSTGRES_URL_NON_POOLING (sync/.env locally, or the service env on the
// remote). Live-only tools (live_hr/live_state/live_stress) are intentionally
// absent — they have no historical equivalent.
import { query, closeDb } from "./db.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const P: Record<string, any> = {};
// dynamic import via a variable specifier → tsc treats as `any` (the compiled
// projections ship no .d.ts), which is exactly what we want here.
const imp = (m: string): Promise<any> => import(m);
async function loadProjections() {
  P.recovery = (await imp("../../dist/projections/recovery.js")).projectRecovery;
  P.sleep = (await imp("../../dist/projections/sleep.js")).projectSleep;
  P.strain = (await imp("../../dist/projections/strain.js")).projectStrain;
  P.stress = (await imp("../../dist/projections/stress.js")).projectStress;
  P.journal = (await imp("../../dist/projections/journal.js")).projectJournal;
  P.cycle = (await imp("../../dist/projections/cycle.js")).projectCycle;
  P.trend = (await imp("../../dist/projections/trend.js")).projectTrend;
  P.workout = (await imp("../../dist/projections/workout.js")).projectWorkout;
  P.today = (await imp("../../dist/projections/today.js")).projectToday;
  P.profile = (await imp("../../dist/projections/profile.js")).projectProfile;
  P.sleepNeed = (await imp("../../dist/projections/sleep_need.js")).projectSleepNeed;
  P.hrZones = (await imp("../../dist/projections/hr_zones.js")).projectHrZones;
}

async function loadRaw(endpoint: string, key: string): Promise<any | null> {
  const r = await query<{ raw: any }>(
    "select raw from whoop.raw_responses where endpoint=$1 and entity_key=$2", [endpoint, key]);
  return r[0]?.raw ?? null;
}
async function latestKey(endpoint: string): Promise<string | null> {
  const r = await query<{ k: string }>(
    "select entity_key k from whoop.raw_responses where endpoint=$1 order by captured_for desc nulls last, entity_key desc limit 1", [endpoint]);
  return r[0]?.k ?? null;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function out(v: unknown): void {
  process.stdout.write(JSON.stringify(v, null, 2) + "\n");
}
async function dateFor(endpoint: string): Promise<string> {
  return arg("--date") || (await latestKey(endpoint)) || new Date().toISOString().slice(0, 10);
}
async function projectDaily(endpoint: string, proj: (raw: any, d: string) => any): Promise<void> {
  const d = await dateFor(endpoint);
  const raw = await loadRaw(endpoint, d);
  if (!raw) { console.error(`no stored ${endpoint} for ${d} (try: whoop-db list ${endpoint})`); process.exit(2); }
  out(proj(raw, d));
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  await loadProjections();
  switch (cmd) {
    case "recovery": await projectDaily("recovery", P.recovery); break;
    case "sleep": await projectDaily("sleep", P.sleep); break;
    case "strain": await projectDaily("strain", P.strain); break;
    case "stress": await projectDaily("stress", P.stress); break;
    case "journal": await projectDaily("journal", P.journal); break;
    case "cycle": await projectDaily("cycle", P.cycle); break;

    case "today":
    case "day": {
      const d = await dateFor("home");
      const [home, sleep] = await Promise.all([loadRaw("home", d), loadRaw("sleep", d)]);
      if (!home) { console.error(`no stored home for ${d}`); process.exit(2); }
      out(P.today({ home, sleep, state: null, date: d }));
      break;
    }
    case "trend": {
      const metric = process.argv[3];
      if (!metric) { console.error("usage: whoop-db trend <METRIC>  (e.g. HRV, RECOVERY, DAY_STRAIN)"); process.exit(1); }
      const raw = await loadRaw("trend", metric);
      if (!raw) { console.error(`no stored trend for ${metric} (try: whoop-db list trend)`); process.exit(2); }
      out(P.trend(raw, metric, new Date().toISOString().slice(0, 10)));
      break;
    }
    case "workout": {
      const id = process.argv[3];
      if (!id) { console.error("usage: whoop-db workout <activity_id>  (ids: whoop-db workouts)"); process.exit(1); }
      const raw = await loadRaw("workout_detail", id);
      if (!raw) { console.error(`no stored workout_detail for ${id}`); process.exit(2); }
      out(P.workout(raw, id));
      break;
    }
    case "workouts": {
      const limit = Number(arg("--limit") ?? 30);
      const rows = await query(
        `select id, sport_name, start_at, end_at, duration_ms, strain, avg_hr_bpm, max_hr_bpm, calories, distance_m, msk_is_strength
         from whoop.workouts order by start_at desc nulls last limit $1`, [limit]);
      out(rows);
      break;
    }
    case "profile": {
      const [bootstrap, hb, hh, st] = await Promise.all([
        loadRaw("bootstrap", "once"), loadRaw("hidden_body_comp", "once"),
        loadRaw("hidden_healthspan", "once"), loadRaw("stealth_mode", "once")]);
      out(P.profile({ bootstrap, hidden_body_comp: hb, hidden_healthspan: hh, stealth: st }));
      break;
    }
    case "sleep_need": out(P.sleepNeed(await loadRaw("sleep_need", "once"))); break;
    case "hr_zones": out(P.hrZones(await loadRaw("hr_zones", "once"))); break;

    case "raw": {
      const endpoint = process.argv[3];
      if (!endpoint) { console.error("usage: whoop-db raw <endpoint> [key]  (verbatim WHOOP shape)"); process.exit(1); }
      const key = process.argv[4] || (await latestKey(endpoint));
      if (!key) { console.error(`no data for endpoint ${endpoint}`); process.exit(2); }
      out(await loadRaw(endpoint, key));
      break;
    }
    case "list": {
      const endpoint = process.argv[3];
      const rows = endpoint
        ? await query("select entity_key, captured_for::text, updated_at from whoop.raw_responses where endpoint=$1 order by captured_for desc nulls last", [endpoint])
        : await query("select endpoint, count(*)::int n, max(captured_for)::text latest from whoop.raw_responses group by endpoint order by endpoint");
      out(rows);
      break;
    }
    case "sql": {
      const q = process.argv[3];
      if (!q) { console.error('usage: whoop-db sql "select … from whoop.…"'); process.exit(1); }
      out(await query(q));
      break;
    }
    default:
      console.error([
        "whoop-db — WHOOP MCP read tools, served from your Supabase data.",
        "",
        "  today|day [--date D]      composite snapshot (recovery+sleep+strain)",
        "  recovery|sleep|strain|stress|journal|cycle [--date D]",
        "  trend <METRIC>            HRV | RECOVERY | DAY_STRAIN | … ",
        "  workouts [--limit N]      recent workouts list",
        "  workout <activity_id>     full workout detail",
        "  profile                   user profile",
        "  sleep_need | hr_zones",
        "  raw <endpoint> [key]      verbatim WHOOP view-model JSON (for UI reconstruction)",
        "  list [endpoint]           what's available",
        '  sql "<query>"             ad-hoc read against whoop.*',
      ].join("\n"));
      process.exit(cmd ? 1 : 0);
  }
  await closeDb();
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
