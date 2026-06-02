// No-loss / health audit. Tier-1 raw is the lossless guarantee, so the audit
// focuses on: (1) raw coverage per endpoint, (2) Tier-2 populated, (3) date-gap
// detection for the per-day domains, (4) sync freshness. Spot parity compares a
// raw array length to its decomposed child-row count.
import { query } from "./db.js";

interface Count { k: string; n: number }

export async function audit(): Promise<void> {
  console.log("== raw coverage (Tier 1) ==");
  const raw = await query<Count>(`select endpoint as k, count(*)::int as n from whoop.raw_responses group by endpoint order by endpoint`);
  for (const r of raw) console.log(`  ${r.k.padEnd(16)} ${r.n}`);

  console.log("== Tier-2 row counts ==");
  const t2 = [
    "recovery", "recovery_contributors", "sleep_day", "sleep_stages", "strain_day",
    "stress_day", "stress_timeline", "workouts", "workout_hr_samples",
    "journal_day", "journal_behaviors", "trend_segments", "trend_points",
    "sleep_need", "hr_zone_defs", "profile_snapshots", "hidden_metrics",
  ];
  for (const t of t2) {
    const r = await query<{ n: number }>(`select count(*)::int as n from whoop.${t}`);
    console.log(`  whoop.${t.padEnd(22)} ${r[0]?.n ?? 0}`);
  }

  console.log("== per-day date gaps ==");
  for (const t of ["recovery", "sleep_day", "strain_day", "stress_day"]) {
    const g = await query<{ missing: number; lo: string; hi: string }>(
      `with b as (select min(local_date) lo, max(local_date) hi from whoop.${t})
       select (select count(*) from generate_series((select lo from b),(select hi from b),'1 day') d
               where d::date not in (select local_date from whoop.${t}))::int as missing,
              (select lo from b) as lo, (select hi from b) as hi`,
    );
    const row = g[0];
    if (row?.lo) console.log(`  ${t.padEnd(12)} ${row.lo}..${row.hi}  missing days: ${row.missing}`);
    else console.log(`  ${t.padEnd(12)} (empty)`);
  }

  console.log("== sync freshness ==");
  const ss = await query<{ domain: string; last_run_at: string; last_status: string; rows_upserted: number }>(
    `select domain, last_run_at, last_status, rows_upserted from whoop.sync_state order by domain`);
  for (const s of ss) console.log(`  ${s.domain.padEnd(12)} ${s.last_status}  ${s.last_run_at ?? ""}  rows:${s.rows_upserted ?? ""}`);
}

/** Spot parity: a raw array length == decomposed child-row count, for the latest date. */
export async function verify(): Promise<void> {
  await audit();
  console.log("== spot parity (raw array length vs child rows) ==");
  const checks = [
    { ep: "stress", arr: `jsonb_array_length(coalesce(raw->'extended24_hour_graph'->'graph'->'plots'->0->'plot'->'segments'->0->'points','[]'::jsonb))`, child: "stress_timeline" },
  ];
  for (const c of checks) {
    const r = await query<{ d: string; rawlen: number; rows: number }>(
      `select rr.captured_for::text as d, ${c.arr} as rawlen,
              (select count(*) from whoop.${c.child} ch where ch.local_date = rr.captured_for)::int as rows
       from whoop.raw_responses rr where rr.endpoint = $1 and rr.captured_for is not null
       order by rr.captured_for desc limit 1`, [c.ep]);
    if (r[0]) console.log(`  ${c.ep} ${r[0].d}: raw points ~${r[0].rawlen}, ${c.child} rows ${r[0].rows} (note: timeline derives from a cleaner sub-object, counts may differ)`);
    else console.log(`  ${c.ep}: no data`);
  }
}
