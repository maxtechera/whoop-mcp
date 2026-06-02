// The WHOOP endpoint superset to own — grounded in the real whoop-mcp tool
// implementations (src/tools/v2/*). Grouped by how they're addressed/looped.
// Used by both discovery (Phase 0) and extraction.

// @ts-ignore - compiled JS from the parent package
import { METRICS } from "../../dist/schemas/trend.js";

export const TREND_METRICS: string[] = METRICS as string[];

/** date passed as ?date= query. */
export const DAILY_QUERY_ENDPOINTS = [
  { name: "recovery", path: "/home-service/v1/deep-dive/recovery" },
  { name: "sleep", path: "/home-service/v1/deep-dive/sleep/last-night" },
  { name: "strain", path: "/home-service/v1/deep-dive/strain" },
  { name: "cycle", path: "/womens-health-service/v1/menstrual-cycle-insights" },
  { name: "home", path: "/home-service/v1/home" },
] as const;

/** date embedded in the path. */
export const DAILY_PATH_ENDPOINTS = [
  { name: "stress", path: (d: string) => `/health-service/v2/stress-bff/${d}` },
  { name: "journal", path: (d: string) => `/journal-service/v3/journals/drafts/mobile/${d}` },
] as const;

/** account/config/static — fetched once (or on a slow cadence). */
export const CONFIG_ENDPOINTS = [
  { name: "bootstrap", path: "/users-service/v2/bootstrap" },
  { name: "hidden_body_comp", path: "/users-service/v1/hidden-metrics/BODY_COMP" },
  { name: "hidden_healthspan", path: "/users-service/v1/hidden-metrics/HEALTHSPAN" },
  { name: "hr_zones", path: "/hr-zones-service/v1/bff/zones" },
  { name: "hr_zone_settings", path: "/hr-zones-service/v1/bff/settings" },
  { name: "sleep_need", path: "/coaching-service/v2/sleepneed" },
  { name: "stealth_mode", path: "/users-service/v1/stealth-mode" },
] as const;

/** list of workouts over a time window (start/end ISO, limit ≤ 25). */
export const WORKOUTS_ENDPOINT = { name: "workouts", path: "/developer/v2/activity/workout" } as const;

/** per-workout detail (HR curve, full 6 zones, distance, MSK, lift sets) — fan-out by activityId. */
export const WORKOUT_DETAIL_ENDPOINT = { name: "workout_detail", path: "/core-details-bff/v1/cardio-details" } as const;

/** per-metric trend series (endDate query). */
export const TREND_ENDPOINT = { name: "trend", path: (m: string) => `/progression-service/v3/trends/${m}` } as const;

/** strength PRs (startDate/endDate/offset) + per-exercise history (fan-out by exercise id). */
export const LIFT_PRS_ENDPOINT = { name: "lift_prs", path: "/weightlifting-service/v3/prs" } as const;
export const exerciseHistoryPath = (id: string | number) =>
  `/weightlifting-service/v3/exercise/${id}/exercise_history`;
