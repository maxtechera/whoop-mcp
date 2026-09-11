import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerHealth } from "../src/tools/v2/health.js";

// Fixtures are trimmed captures of the live payloads (2026-09-11).
const monitor = { title: "HEALTH MONITOR", analytics: { metrics_in_range: 5, metrics_with_values: 5, highest_severity_status: "POSITIVE_RANGE" }, items: [
  { type: "KEY_METRIC_TILE", content: { id: "HRV", key_metric_tile_stat_value_display: "86", key_metric_tile_suffix_display: "ms", key_metric_tile_trend_display: "elevated > 83", key_metric_tile_trend_type: "POSITIVE_RANGE",
    key_metric_tile_dialog_content: { description: "Heart rate variability (HRV)...\n\nYour HRV of 86 ms is above your typical range of 65 ms to 83 ms. This indicates that your body has recovered nicely from yesterday's strain!\n\nYour ranges are calculated using data from the last 30 days:\n\nGreen = 45 ms and above \nOrange = 31 ms to 44 ms \nRed = 30 ms and below" } } },
  { type: "KEY_METRIC_TILE", content: { id: "RESPIRATORY_RATE", key_metric_tile_stat_value_display: "15.0", key_metric_tile_suffix_display: "rpm", key_metric_tile_trend_display: "low < 15.5", key_metric_tile_trend_type: "POSITIVE_RANGE",
    key_metric_tile_dialog_content: { description: "Respiratory rate...\n\nYour respiratory rate of 15.0 rpm is below your typical range of 15.5 rpm to 16.6 rpm, indicating that you're breathing slower.\n\nGreen = 17.9 rpm and below \nOrange = 18.0 rpm to 18.6 rpm \nRed = 18.7 rpm and above" } } },
  { type: "MENU_ITEM", content: { title: "Share" } },
] };
const healthTab = { sections: [{ items: [
  { type: "HEALTHSPAN_HERO_METRIC", content: { items: [
    { type: "WHOOP_AGE_AMOEBA", content: { style_values: { age: 27.9, pace_of_aging: 0.9, years_difference: -5.6 }, age_subtitle_display: "5.6 years younger", is_calibrating: false } },
    { type: "PACE_OF_AGING_METER", content: { trend: { title_display: "slower vs. last week" } } },
    { type: "CARD_BUTTON", content: { destination: { screen: "HEALTHSPAN", parameters: { date: "2026-09-06" } } } } ] } },
  { type: "HORIZONTAL_METRIC_TILE", content: { title: "HEALTH MONITOR", footer: { start_title: "5/5 metrics within range", status: "OK" }, metrics: [{ text: "HRV", status: "OK" }] } },
  { type: "GRAPH_DESCRIPTION_CARD", content: { title: "STRESS MONITOR", body: { magnitude: "0:34", magnitude_suffix: "hrs", trend: { title_display: "vs. typical Fri", trend: "POSITIVE_GREEN" } } } },
] }] };
const plan = { tile: { content: { title: "BOOST FITNESS PLAN", days_left_display: "3 days left", progress_bar: { percent_value: 39 }, items: [
  { id: "STEPS", title: "12,100+ Steps", circular_progress_indicator: { current_progress_steps: { text_display: "4/7", current_step: 4, total_steps: 7, style: "WEEKLY_PLAN_IN_PROGRESS" } } },
  { id: "WEIGHT", title: "Weight Goal: 79.1 kg", circular_progress_indicator: { current_progress_steps: null, current_progress_percentage: { text_display: "82.3", percentage: 0, style: "WEEKLY_PLAN_IN_PROGRESS" } } },
] } } };
const strapRaw = { last_seen_strap: { generation: "harvard", serial: "X", first_seen: "2026-04-06T20:56:08.583+0000", last_seen: null }, ordered_strap: null, previous_straps: [] };
const calendar = { calendar_title_display: "September", days_of_month: [{ date_value_display: "1", has_data: true, day_state: "LOW_STRESS" }, { date_value_display: "12", has_data: false, day_state: null }] };

const routes: Record<string, unknown> = { "/coaching-service/v1/health/bff/monitor": monitor, "/health-tab-bff/v1/health-tab": healthTab, "/membership-service/v1/straps": strapRaw };
const client = { get: async (p: string) => routes[p] ?? (p.includes("weekly-plan") ? plan : p.includes("calendar") ? calendar : null) } as any;

function tools() {
  const captured: Record<string, (a: any) => Promise<any>> = {};
  const fake = { tool: (name: string, _d: string, _s: unknown, cb: any) => { captured[name] = cb; } } as unknown as McpServer;
  registerHealth(fake, client);
  return captured;
}
const text = async (r: Promise<any>) => JSON.parse((await r).content[0].text);

describe("health context projections", () => {
  it("health monitor keeps values, typical ranges, thresholds", async () => {
    const t = tools(); const o = await text(t.whoop_health_monitor({}));
    expect(o.metrics_in_range).toBe(5);
    expect(o.metrics).toHaveLength(2);
    expect(o.metrics[0]).toMatchObject({ metric: "hrv", value: 86, unit: "ms", vs_typical: "elevated > 83", typical_range_30d: "65 ms to 83 ms" });
    expect(o.metrics[0].thresholds).toEqual({ green: "45 ms and above", orange: "31 ms to 44 ms", red: "30 ms and below" });
    expect(o.metrics[1].typical_range_30d).toBe("15.5 rpm to 16.6 rpm");
  });
  it("healthspan pulls WHOOP age, pace, monitor summary, stress", async () => {
    const t = tools(); const o = await text(t.whoop_healthspan({}));
    expect(o).toMatchObject({ whoop_age: 27.9, years_difference: -5.6, pace_of_aging: 0.9, pace_of_aging_trend: "slower vs. last week", healthspan_date: "2026-09-06" });
    expect(o.health_monitor.summary).toBe("5/5 metrics within range");
    expect(o.stress_today.high_stress).toBe("0:34 hrs");
  });
  it("weekly plan handles step and percentage goals", async () => {
    const t = tools(); const o = await text(t.whoop_weekly_plan({}));
    expect(o.accomplished_pct).toBe(39);
    expect(o.goals[0]).toMatchObject({ id: "STEPS", progress: "4/7", current: 4, total: 7, state: "in_progress" });
    expect(o.goals[1]).toMatchObject({ id: "WEIGHT", progress: "82.3", percent: 0, state: "in_progress" });
  });
  it("stress calendar yields ISO dates", async () => {
    const t = tools(); const o = await text(t.whoop_stress_calendar({ date: "2026-09-11" }));
    expect(o.days[0]).toEqual({ date: "2026-09-01", has_data: true, state: "LOW_STRESS" });
    expect(o.days[1].date).toBe("2026-09-12");
  });
  it("strap", async () => {
    const t = tools(); const o = await text(t.whoop_strap({}));
    expect(o.current.generation).toBe("harvard");
  });
});
