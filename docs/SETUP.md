# Setup — own your WHOOP data in Supabase

Sync your full WHOOP history into your own Supabase database and query it offline. ~15 minutes.

## Prerequisites
- A **WHOOP account** (and the app, for MFA if enabled).
- **Node 24+**.
- A **Supabase project** (free tier is fine) — [supabase.com](https://supabase.com).
- *(Optional, for the always-on autonomous sync)* a host that runs Docker — e.g. [Railway](https://railway.app), Fly, Render, or a VPS.

## 1. Clone + build the MCP, then authenticate with WHOOP
```bash
git clone https://github.com/<your-fork>/whoop-mcp.git
cd whoop-mcp
npm install && npx tsc          # build the MCP (dist/)
node dist/cli/index.js auth     # log into WHOOP → writes tokens to .env
```
`auth` reads `WHOOP_EMAIL`/`WHOOP_PASSWORD` from `.env` (or prompts) and saves `WHOOP_IOS_BEARER_TOKEN` + `WHOOP_COGNITO_REFRESH_TOKEN`. (See the main [README](../README.md) for full MCP options.)

## 2. Create the Supabase connection
In your Supabase project: **Settings → Database → Connection string → URI** (the **Direct connection**, not the pooler). It looks like:
```
postgresql://postgres.<project-ref>:<password>@<host>:5432/postgres
```

## 3. Configure + install the sync
```bash
cd sync
cp .env.example .env
# edit sync/.env → set POSTGRES_URL_NON_POOLING to the string from step 2
npm install
```

## 4. Create the schema
```bash
npm run migrate          # applies sync/supabase/migrations/*.sql (idempotent)
```
Creates the `whoop` schema (raw + derived tables + views).

## 5. Backfill your full history
```bash
npm run backfill         # account-creation → today; resumable. Heavy on first run.
npm run audit            # row counts, date-gap check, freshness
```

## 6. Query it
```bash
npm run db -- today
npm run db -- recovery --date 2024-05-31
npm run db -- trend HRV
npm run db -- workouts --limit 10
npm run db -- raw stress 2024-05-31     # verbatim WHOOP UI shape
npm run db -- sql "select * from whoop.v_daily order by local_date desc limit 7"
```
Output matches the WHOOP MCP's tools exactly — but from your database.

## 7. (Optional) Run it autonomously
For a hands-off hourly sync, deploy the service (it runs the MCP server **and** the in-process sync). See **[DEPLOY.md](./DEPLOY.md)**.

## Notes
- Local dev keeps WHOOP tokens in the parent `.env` and the Postgres string in `sync/.env` — both gitignored.
- WHOOP's refresh token rotates ~monthly. The deployed service self-refreshes (durable token store); for purely-local use, re-run `node dist/cli/index.js auth` if it ever expires.
- Architecture + data model: **[ARCHITECTURE.md](./ARCHITECTURE.md)**.
