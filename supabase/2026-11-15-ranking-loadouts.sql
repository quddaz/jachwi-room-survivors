-- 시즌 4부터 기록을 세운 당시의 오리·능력치·장비를 함께 저장한다.
-- 기존 기록·권한은 유지하고, 이전 기록의 loadout은 null로 둔다.
begin;
alter table public.room_survivors_records add column if not exists loadout jsonb;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'room_survivors_records_loadout_check'
      and conrelid = 'public.room_survivors_records'::regclass
  ) then
    alter table public.room_survivors_records add constraint room_survivors_records_loadout_check
      check (loadout is null or (jsonb_typeof(loadout) = 'object' and octet_length(loadout::text) <= 16384));
  end if;
end $$;

-- 최고 기록과 조합은 반드시 같은 행에서 선택한다. 기존 뷰 끝에 열을 추가한다.
create or replace view public.room_survivors_season_best with (security_invoker = true) as
select distinct on (season, crew_name)
  season, crew_name, survived_ms as best_survived_ms, kills, level, created_at, loadout
from public.room_survivors_records
order by season, crew_name, survived_ms desc, kills desc, created_at asc, id asc;

notify pgrst, 'reload schema';
commit;
