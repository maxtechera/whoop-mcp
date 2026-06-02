# Docs — WHOOP data ownership

This fork adds a **sync → Supabase → read** layer to the WHOOP MCP: an autonomous job syncs the WHOOP API into a Postgres schema you own (raw stored verbatim), and a CLI (`whoop-db`) reads it back with the same shape the MCP returns — offline, over your full history.

| Doc | What it covers |
|---|---|
| [SETUP.md](./SETUP.md) | **Start here.** Step-by-step: own your WHOOP data in Supabase (~15 min). |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | How it works — the sync→Supabase→read design, schema tiers, and the two CLIs. |
| [DEPLOY.md](./DEPLOY.md) | Run the autonomous hourly sync on a Docker host (Railway/Fly/VPS). |

Skill entry point for agents: [`../SKILL.md`](../SKILL.md). Sync code: [`../sync/`](../sync/). WHOOP MCP usage: [`../README.md`](../README.md).

## TL;DR
- **Own it:** a `whoop` schema in your Supabase, full history, hourly sync, durable self-refreshing auth.
- **Raw-first:** `whoop.raw_responses` is lossless truth; thin tables + `*_raw` views derive from it (the latter = WHOOP's exact UI shape, for rebuilding the app from your DB).
- **Read it:** `whoop-db today | recovery | trend HRV | workouts | raw stress <date> | sql "…"` — same output as the MCP, from your database.
