---
name: whoop
description: Query your owned WHOOP data (recovery, sleep, strain, stress, workouts, trends, journal, profile) from your Supabase `whoop` schema via the `whoop-db` CLI — the WHOOP MCP's read tools served from the database (owned, historical, offline). Use for any question about your WHOOP / recovery / sleep / HRV / strain / workout data. For live, real-time values use the WHOOP MCP instead.
---

# WHOOP Skill

Your full WHOOP history is owned in Supabase (schema `whoop`, synced hourly). Query it with **`whoop-db`** — it replicates the WHOOP MCP's read tools but reads the database (loads stored raw → runs the same projections → identical output), so it works offline and over history.

## Quick start

Run from the repo (needs `POSTGRES_URL_NON_POOLING` — in `sync/.env` locally, or the service env when deployed):

```bash
cd <repo>
npm --prefix sync run db -- <command>           # local
# or on the deployed service:
railway ssh "cd /app && sync/node_modules/.bin/tsx sync/src/db-cli.ts <command>"
```

```bash
whoop-db today                      # composite snapshot (recovery + sleep + strain)
whoop-db recovery [--date D]        # also: sleep | strain | stress | journal | cycle
whoop-db trend HRV                  # HRV | RECOVERY | DAY_STRAIN | SLEEP_* | … (see `list trend`)
whoop-db workouts [--limit N]       # recent workouts
whoop-db workout <activity_id>      # full workout detail (HR, zones, strain)
whoop-db profile | sleep_need | hr_zones
whoop-db raw <endpoint> [key]       # verbatim WHOOP view-model JSON (for UI reconstruction)
whoop-db list [endpoint]            # what's available (dates/keys)
whoop-db sql "select * from whoop.v_daily order by local_date desc limit 7"
```

Output matches the WHOOP MCP exactly, e.g. `whoop-db recovery`:
```json
{ "date": "…", "score": 35, "state": "YELLOW",
  "hrv": { "ms": 60, "baseline_ms": 76, "delta_pct": -21.1 }, "rhr": { … }, … }
```

## When to use what
- **`whoop-db`** — any historical/owned query, analysis across days, trends, or rebuilding the WHOOP UI (`whoop-db raw …` / the `whoop.*_raw` views). No WHOOP API call.
- **WHOOP MCP** (live API) — real-time values not yet synced (current HR, live strain/stress) or the newest minutes of today.

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the data model and [docs/SETUP.md](./docs/SETUP.md) to set it up.
