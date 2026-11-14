-- Supabase SQL Editor에서 한 번 실행한다.
create table if not exists public.room_survivors_records (
  id bigint generated always as identity primary key,
  crew_name text not null check (char_length(btrim(crew_name)) between 1 and 12),
  survived_ms integer not null check (survived_ms between 0 and 7200000),
  kills integer not null check (kills between 0 and 1000000),
  level integer not null check (level between 1 and 500),
  season smallint not null default 1 check (season between 1 and 99),
  created_at timestamptz not null default now()
);

create index if not exists room_survivors_records_crew_idx
  on public.room_survivors_records (crew_name, survived_ms desc, kills desc, created_at);

alter table public.room_survivors_records enable row level security;

-- 새 프로젝트는 anon 권한이 기본으로 붙지 않을 수 있어 직접 준다.
grant select, insert on public.room_survivors_records to anon;

-- 누구나 기록을 남기고 볼 수 있지만, 고치거나 지울 수는 없다.
drop policy if exists "room survivors records are insertable" on public.room_survivors_records;
create policy "room survivors records are insertable" on public.room_survivors_records for insert to anon with check (true);
drop policy if exists "room survivors records are readable" on public.room_survivors_records;
create policy "room survivors records are readable" on public.room_survivors_records for select to anon using (true);

create or replace view public.room_survivors_crew_best with (security_invoker = true) as
select distinct on (crew_name)
  crew_name,
  survived_ms as best_survived_ms,
  kills,
  level,
  created_at
from public.room_survivors_records
order by crew_name, survived_ms desc, kills desc, created_at asc;

grant select on public.room_survivors_crew_best to anon;

-- 시즌별 크루 최고 기록. 지금 게임은 이 뷰를 읽는다(위의 crew_best는 시즌을 나누기 전 버전용).
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
