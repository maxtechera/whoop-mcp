// Phase 0 — schema discovery & data-shape profiling.
// Calls the live WHOOP endpoint superset over representative dates, saves raw
// fixtures, infers each endpoint's data shape, and emits:
//   sync/fixtures/<endpoint>__<key>.json   raw samples
//   sync/schema/<endpoint>.shape.json      inferred shape
//   sync/schema/coverage.json              every leaf path (drives the no-loss audit + DDL)
//   sync/SHAPES.md                         human-readable shape report + granularity notes
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildEnvClient, REPO_ROOT, type WhoopClientT } from "./client.js";
import {
  DAILY_QUERY_ENDPOINTS,
  DAILY_PATH_ENDPOINTS,
  CONFIG_ENDPOINTS,
  WORKOUTS_ENDPOINT,
  WORKOUT_DETAIL_ENDPOINT,
  TREND_ENDPOINT,
  TREND_METRICS,
  LIFT_PRS_ENDPOINT,
} from "./endpoints.js";
import { inferShape, leafPaths, arrayNodes, type Shape } from "./shape.js";

const SYNC_DIR = join(REPO_ROOT, "sync");
const FIX_DIR = join(SYNC_DIR, "fixtures");
const SCHEMA_DIR = join(SYNC_DIR, "schema");

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return isoDay(d);
}

interface Collected {
  samples: unknown[];
  ok: number;
  errors: string[];
}
const collected = new Map<string, Collected>();

function record(endpoint: string, value: unknown): void {
  let c = collected.get(endpoint);
  if (!c) {
    c = { samples: [], ok: 0, errors: [] };
    collected.set(endpoint, c);
  }
  c.samples.push(value);
  c.ok++;
}
function recordError(endpoint: string, err: unknown): void {
  let c = collected.get(endpoint);
  if (!c) {
    c = { samples: [], ok: 0, errors: [] };
    collected.set(endpoint, c);
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (!c.errors.includes(msg)) c.errors.push(msg);
}

function saveFixture(endpoint: string, key: string, value: unknown): void {
  const safe = `${endpoint}__${key}`.replace(/[^a-zA-Z0-9_.-]/g, "_");
  writeFileSync(join(FIX_DIR, `${safe}.json`), JSON.stringify(value, null, 2));
}

async function call(client: WhoopClientT, endpoint: string, key: string, path: string, query?: Record<string, string | number>): Promise<unknown | null> {
  try {
    const res = await client.get(path, query);
    record(endpoint, res);
    saveFixture(endpoint, key, res);
    process.stdout.write(`  ✓ ${endpoint} (${key})\n`);
    return res;
  } catch (e) {
    recordError(endpoint, e);
    process.stdout.write(`  x ${endpoint} (${key}): ${e instanceof Error ? e.message : e}\n`);
    return null;
  }
}

// shape → JSON-serialisable
function serialize(shape: Shape): unknown {
  const out: Record<string, unknown> = { types: [...shape.types] };
  if (shape.fields) {
    const f: Record<string, unknown> = {};
    for (const [k, v] of shape.fields) f[k] = serialize(v);
    out.fields = f;
    if (shape.optionalKeys?.size) out.optional = [...shape.optionalKeys];
  }
  if (shape.items) {
    out.items = serialize(shape.items);
    out.observedLengths = shape.lengths;
  }
  if (shape.examples?.length) out.examples = shape.examples;
  return out;
}

export async function discover(): Promise<void> {
  mkdirSync(FIX_DIR, { recursive: true });
  mkdirSync(SCHEMA_DIR, { recursive: true });
  const client = buildEnvClient();

  // representative dates: last 3 complete days + heavy-workout days discovered below
  const today = isoDay(new Date());
  const sampleDates = [addDays(today, -1), addDays(today, -2), addDays(today, -3)];

  console.log("== profile / config ==");
  for (const ep of CONFIG_ENDPOINTS) await call(client, ep.name, "once", ep.path);

  console.log("== daily (query date) ==");
  for (const ep of DAILY_QUERY_ENDPOINTS) {
    for (const d of sampleDates) await call(client, ep.name, d, ep.path, { date: d });
  }

  console.log("== daily (path date) ==");
  for (const ep of DAILY_PATH_ENDPOINTS) {
    for (const d of sampleDates) await call(client, ep.name, d, ep.path(d));
  }

  console.log("== workouts list + per-workout detail (fan-out) ==");
  const end = new Date().toISOString();
  const start = new Date(Date.now() - 90 * 86400_000).toISOString();
  const wlist = (await call(client, WORKOUTS_ENDPOINT.name, "90d", WORKOUTS_ENDPOINT.path, { start, end, limit: 25 })) as
    | { records?: { id?: string }[] }
    | null;
  const ids = (wlist?.records ?? []).map((r) => r.id).filter((x): x is string => !!x).slice(0, 4);
  for (const id of ids) {
    await call(client, WORKOUT_DETAIL_ENDPOINT.name, id, WORKOUT_DETAIL_ENDPOINT.path, { activityId: id });
  }

  console.log("== trends (sample metrics; shape is shared across metrics) ==");
  for (const m of TREND_METRICS.slice(0, 4)) {
    await call(client, TREND_ENDPOINT.name, m, TREND_ENDPOINT.path(m), { endDate: today });
  }

  console.log("== lifting PRs ==");
  await call(client, LIFT_PRS_ENDPOINT.name, "all", LIFT_PRS_ENDPOINT.path, {
    startDate: addDays(today, -365),
    endDate: today,
    offset: 0,
  });

  // ---- derive shapes + coverage + report ----
  const coverage: Record<string, unknown> = {};
  const mdLines: string[] = [
    "# WHOOP data shapes (auto-derived by `whoop-sync discover`)",
    "",
    "> Generated from live API responses. Drives the `whoop` schema DDL and the zero-loss path-coverage audit.",
    "> Arrays (marked `[]`) are the time-series/repeated structures decomposed into granular child tables.",
    "",
    "## Granularity ceiling",
    "Finest grain WHOOP exposes: per-workout HR curve (`workout_detail`), 15-min stress buckets (`stress`), per-stage sleep hypnogram (`sleep`). No per-second whole-day HR/SpO2/respiratory series exists — zero-loss = every byte the API returns is persisted in Tier-1 raw.",
    "",
  ];

  for (const [endpoint, c] of [...collected.entries()].sort()) {
    const shape = inferShape(c.samples);
    writeFileSync(join(SCHEMA_DIR, `${endpoint}.shape.json`), JSON.stringify(serialize(shape), null, 2));
    const leaves = c.samples.length ? leafPaths(shape) : [];
    const arrays = c.samples.length ? arrayNodes(shape) : [];
    coverage[endpoint] = {
      samples: c.ok,
      errors: c.errors,
      arrays: arrays.map((a) => ({ ...a, classification: "child-table" })),
      leaves: leaves.map((l) => ({
        path: l.path,
        types: l.types,
        underArray: l.underArray,
        optional: l.optional,
        classification: l.underArray ? "child-table" : "unclassified",
      })),
    };
    mdLines.push(`## \`${endpoint}\`  (${c.ok} sample${c.ok === 1 ? "" : "s"}${c.errors.length ? `, errors: ${c.errors.join("; ")}` : ""})`);
    if (arrays.length) {
      mdLines.push("", "**Arrays → child tables:**");
      for (const a of arrays) mdLines.push(`- \`${a.path}\` (max len ${a.maxLen}) → fields: ${a.elementScalarFields.join(", ") || "(scalar/nested)"}`);
    }
    const scalarLeaves = leaves.filter((l) => !l.underArray);
    if (scalarLeaves.length) {
      mdLines.push("", "**Scalar fields (→ columns):**");
      for (const l of scalarLeaves.slice(0, 60)) mdLines.push(`- \`${l.path}\`: ${l.types.join("|")}${l.optional ? " (optional)" : ""}`);
      if (scalarLeaves.length > 60) mdLines.push(`- … +${scalarLeaves.length - 60} more`);
    }
    mdLines.push("");
  }

  writeFileSync(join(SCHEMA_DIR, "coverage.json"), JSON.stringify(coverage, null, 2));
  writeFileSync(join(SYNC_DIR, "SHAPES.md"), mdLines.join("\n"));

  const epCount = collected.size;
  const okCount = [...collected.values()].filter((c) => c.ok > 0).length;
  console.log(`\nDiscovery complete: ${okCount}/${epCount} endpoints returned data.`);
  console.log(`Wrote sync/SHAPES.md, sync/schema/*.shape.json, sync/schema/coverage.json, sync/fixtures/*`);
}
