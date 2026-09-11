// Health-context reads that were still only reachable through whoop_raw:
// Health Monitor (5 vitals vs your 30-day ranges), Healthspan (WHOOP Age,
// pace of aging), the weekly plan, the month stress calendar, and the strap.
// Payloads are app UI trees; each projection keeps the numbers and drops the
// graph points, buttons and upsells.
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WhoopClient } from "../../whoop/client.js";
import { jsonOut } from "../../whoop/json_out.js";
import { todayIso } from "../../lib/dates.js";

type J = Record<string, any>;
const out = (o: unknown) => ({ content: [{ type: "text" as const, text: jsonOut(o) }] });
const num = (s: unknown): number | null => { const n = parseFloat(String(s ?? "").replace(/[^0-9.+-]/g, "")); return Number.isFinite(n) ? n : null; };

// "Green = 17.9 rpm and below \nOrange = 18.0 rpm to 18.6 rpm \nRed = 18.7 rpm and above"
function thresholds(desc: string): Record<string, string> {
  const t: Record<string, string> = {};
  for (const m of desc.matchAll(/^(Green|Orange|Red)\s*=\s*(.+?)\s*$/gm)) t[String(m[1]).toLowerCase()] = String(m[2]).trim();
  return t;
}
// "Your HRV of 86 ms is above your typical range of 65 ms to 83 ms."
function typicalRange(desc: string): string | null {
  const m = desc.match(/typical range of (.+?)(?:\.(?=\s|$)|,| which| indicating|$)/m);
  return m?.[1] ? m[1].trim() : null;
}

function projectHealthMonitor(raw: J) {
  const items = (raw.items ?? []).filter((i: J) => i.type === "KEY_METRIC_TILE").map((i: J) => {
    const c = i.content ?? {}; const d = c.key_metric_tile_dialog_content ?? {}; const desc: string = d.description ?? "";
    return {
      metric: String(c.id ?? "").toLowerCase(),
      value: num(c.key_metric_tile_stat_value_display), unit: c.key_metric_tile_suffix_display ?? null,
      status: c.key_metric_tile_trend_type ?? null,            // POSITIVE_RANGE | ... (WHOOP's own label)
      vs_typical: c.key_metric_tile_trend_display ?? null,     // "elevated > 83", "low < 50", "within 95% - 100%"
      typical_range_30d: typicalRange(desc), thresholds: thresholds(desc),
      note: desc.split("\n\n")[1]?.trim() ?? null,             // WHOOP's one-paragraph read of today's value
    };
  });
  const a = raw.analytics ?? {};
  return { title: raw.title ?? "HEALTH MONITOR", metrics_in_range: a.metrics_in_range ?? null, metrics_with_values: a.metrics_with_values ?? null, highest_severity: a.highest_severity_status ?? null, metrics: items };
}

function findAll(node: unknown, type: string, acc: J[] = []): J[] {
  if (Array.isArray(node)) node.forEach((n) => findAll(n, type, acc));
  else if (node && typeof node === "object") { const o = node as J; if (o.type === type && o.content) acc.push(o.content); for (const v of Object.values(o)) findAll(v, type, acc); }
  return acc;
}

function projectHealthspan(raw: J) {
  const amoeba = findAll(raw, "WHOOP_AGE_AMOEBA")[0] ?? {};
  const pace = findAll(raw, "PACE_OF_AGING_METER")[0] ?? {};
  const monitor = findAll(raw, "HORIZONTAL_METRIC_TILE").find((c) => c.title === "HEALTH MONITOR");
  const stress = findAll(raw, "GRAPH_DESCRIPTION_CARD").find((c) => c.title === "STRESS MONITOR");
  const sv = amoeba.style_values ?? {};
  return {
    is_calibrating: amoeba.is_calibrating ?? null,
    whoop_age: sv.age ?? num(amoeba.age_value_display),
    years_difference: sv.years_difference ?? null,            // negative = younger than calendar age
    years_difference_label: amoeba.age_subtitle_display ?? null,
    pace_of_aging: sv.pace_of_aging ?? num(amoeba.pace_of_aging_display),
    pace_of_aging_trend: pace.trend?.title_display ?? null,    // "slower vs. last week"
    health_monitor: monitor ? { summary: monitor.footer?.start_title ?? null, status: monitor.footer?.status ?? null, metrics: (monitor.metrics ?? []).map((m: J) => ({ metric: m.text, status: m.status })) } : null,
    stress_today: stress ? { high_stress: `${stress.body?.magnitude ?? "?"} ${stress.body?.magnitude_suffix ?? ""}`.trim(), vs_typical: stress.body?.trend?.title_display ?? null, trend: stress.body?.trend?.trend ?? null } : null,
    healthspan_date: findAll(raw, "CARD_BUTTON").find((c) => c.destination?.screen === "HEALTHSPAN")?.destination?.parameters?.date ?? null,
  };
}

function projectWeeklyPlan(raw: J) {
  const t = raw.tile?.content ?? {};
  return {
    title: t.title ?? null, days_left: t.days_left_display ?? null,
    accomplished_pct: t.progress_bar?.percent_value ?? null,
    goals: (t.items ?? []).map((i: J) => {
      const ind = i.circular_progress_indicator ?? {}; const p = ind.current_progress_steps ?? {}; const pct = ind.current_progress_percentage ?? {};
      return { id: i.id, title: i.title, goal_type: i.goal_type ?? null,
        progress: p.text_display ?? pct.text_display ?? null, current: p.current_step ?? null, total: p.total_steps ?? null,
        percent: pct.percentage ?? pct.value ?? null,
        state: String(p.style ?? pct.style ?? "").replace("WEEKLY_PLAN_", "").toLowerCase() || null };
    }),
  };
}

export function registerHealth(server: McpServer, client: WhoopClient): void {
  server.tool(
    "whoop_health_monitor",
    "Health Monitor: respiratory rate, SpO2, RHR, HRV, skin temp — today's value vs your own 30-day typical range, WHOOP's green/orange/red thresholds, and its one-line read. The 'is anything off today' check.",
    {},
    async () => out(projectHealthMonitor(await client.get("/coaching-service/v1/health/bff/monitor") as J)),
  );

  server.tool(
    "whoop_healthspan",
    "Healthspan: WHOOP Age, years vs calendar age, pace of aging (+ trend vs last week), plus the health-monitor summary and today's high-stress hours from the Health tab.",
    {},
    async () => out(projectHealthspan(await client.get("/health-tab-bff/v1/health-tab") as J)),
  );

  server.tool(
    "whoop_weekly_plan",
    "This week's WHOOP plan: the goals (strength sessions, steps, protein, sleep consistency, …) with progress n/total and % accomplished, days left.",
    { date: z.iso.date().optional().describe("Any date inside the week; default today") },
    async ({ date }) => out(projectWeeklyPlan(await client.get(`/progression-service/v2/weekly-plan/home-tile/${date ?? todayIso()}`) as J)),
  );

  server.tool(
    "whoop_stress_calendar",
    "Stress state per day for a month (LOW_STRESS / HIGH_STRESS / …) — which days were hard, at a glance. Pair with whoop_stress for a day's timeline.",
    { date: z.iso.date().optional().describe("Any date in the month; default today") },
    async ({ date }) => {
      const d = date ?? todayIso();
      const raw = await client.get(`/health-service/v2/stress-bff/${d}/calendar`) as J;
      const ym = d.slice(0, 7);
      return out({ month: raw.calendar_title_display ?? ym, days: (raw.days_of_month ?? []).map((x: J) => ({ date: `${ym}-${String(x.date_value_display).padStart(2, "0")}`, has_data: x.has_data ?? null, state: x.day_state ?? null })) });
    },
  );

  server.tool(
    "whoop_strap",
    "The strap: generation, serial, first/last seen. Explains gaps in data (not worn, not paired).",
    {},
    async () => { const r = await client.get("/membership-service/v1/straps") as J; return out({ current: r.last_seen_strap ?? null, ordered: r.ordered_strap ?? null, previous: r.previous_straps ?? [] }); },
  );
}
