-- 2026-11-11에 한 번 실행했다. 그때까지의 기록 1,130개(68개 크루)는 모두 시즌 1이 되고,
-- 이후 게임은 season = 2를 적어 보낸다. 기존 기록과 뷰는 지우지 않는다.
alter table public.room_survivors_records add column if not exists season smallint not null default 1;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'room_survivors_records_season_check') then
    alter table public.room_survivors_records add constraint room_survivors_records_season_check check (season between 1 and 99);
  end if;
end $$;

create index if not exists room_survivors_records_season_idx
  on public.room_survivors_records (season, crew_name, survived_ms desc, kills desc, created_at);

create or replace view public.room_survivors_season_best with (security_invoker = true) as
select distinct on (season, crew_name)
  season,
  crew_name,
  survived_ms as best_survived_ms,
  kills,
  level,
  created_at
from public.room_survivors_records
order by season, crew_name, survived_ms desc, kills desc, created_at asc;

grant select on public.room_survivors_season_best to anon;
