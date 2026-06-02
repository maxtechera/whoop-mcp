-- Raw-passthrough views: WHOOP's exact response shape (the BFF view-models that
-- drive the app UI), surfaced as first-class per-domain views over the verbatim
-- Tier-1 raw. No parsing/denormalization — query these to re-create the WHOOP UI
-- from your own DB. Always in sync with whoop.raw_responses.

create or replace view whoop.stress as
  select captured_for as local_date, raw, fetched_at, updated_at
  from whoop.raw_responses where endpoint = 'stress';

create or replace view whoop.trends as
  select entity_key as metric, captured_for as as_of_date, raw, fetched_at, updated_at
  from whoop.raw_responses where endpoint = 'trend';

-- The rest of the UI surface (raw view-models), for full reconstruction:
create or replace view whoop.recovery_raw as
  select captured_for as local_date, raw, fetched_at from whoop.raw_responses where endpoint = 'recovery';
create or replace view whoop.sleep_raw as
  select captured_for as local_date, raw, fetched_at from whoop.raw_responses where endpoint = 'sleep';
create or replace view whoop.strain_raw as
  select captured_for as local_date, raw, fetched_at from whoop.raw_responses where endpoint = 'strain';
create or replace view whoop.journal_raw as
  select captured_for as local_date, raw, fetched_at from whoop.raw_responses where endpoint = 'journal';
create or replace view whoop.home_raw as
  select captured_for as local_date, raw, fetched_at from whoop.raw_responses where endpoint = 'home';
create or replace view whoop.workout_raw as
  select entity_key as activity_id, raw, fetched_at from whoop.raw_responses where endpoint = 'workout_detail';
