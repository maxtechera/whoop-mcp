-- whoop-sync · Tier 3 (thin query views). Hot daily shapes joined across the
-- granular tables. Separate file so query-shape churn never touches ingestion.

create or replace view whoop.v_daily as
select
  d.day                                   as local_date,
  r.score                                 as recovery_score,
  r.state                                 as recovery_state,
  r.hrv_ms,
  r.rhr_bpm,
  s.total_sleep_ms,
  s.performance_pct                       as sleep_performance_pct,
  s.efficiency_pct                        as sleep_efficiency_pct,
  st.score                                as day_strain,
  st.calories,
  st.avg_hr_bpm                           as strain_avg_hr_bpm,
  st.max_hr_bpm                           as strain_max_hr_bpm,
  st.workouts_count,
  st.steps,
  sd.current_level                        as stress_level
from (
  select distinct local_date as day from (
    select local_date from whoop.recovery
    union select local_date from whoop.sleep_day
    union select local_date from whoop.strain_day
    union select local_date from whoop.stress_day
  ) u
) d
left join whoop.recovery   r  on r.local_date  = d.day
left join whoop.sleep_day  s  on s.local_date  = d.day
left join whoop.strain_day st on st.local_date = d.day
left join whoop.stress_day sd on sd.local_date = d.day;

create or replace view whoop.v_workouts as
select id, sport_name, start_at, end_at, duration_ms, strain,
       avg_hr_bpm, max_hr_bpm, calories, distance_m, msk_is_strength
from whoop.workouts
order by start_at desc;
