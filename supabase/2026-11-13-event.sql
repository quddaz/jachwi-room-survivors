-- 2026-11-13 이벤트용. SQL Editor에서 한 번 실행한다. 시즌 기록(room_survivors_records)은 건드리지 않는다.
-- 이벤트마다 크루 이름 하나당 한 판만 남길 수 있다. 판을 시작할 때 0초 기록으로 자리를 잡고,
-- 끝났을 때 finish_room_survivors_event로 한 번만 채운다. 중간에 나가면 0초로 남는다.
create table if not exists public.room_survivors_event_records (
  id bigint generated always as identity primary key,
  event text not null check (char_length(event) between 1 and 40),
  crew_name text not null check (char_length(btrim(crew_name)) between 1 and 12),
  survived_ms integer not null default 0 check (survived_ms between 0 and 7200000),
  kills integer not null default 0 check (kills between 0 and 1000000),
  level integer not null default 1 check (level between 1 and 500),
  finished boolean not null default false,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (event, crew_name)
);

alter table public.room_survivors_event_records enable row level security;
grant select, insert on public.room_survivors_event_records to anon;

-- 시작할 때는 빈 기록만 넣을 수 있다. 고치거나 지우는 권한은 주지 않는다.
drop policy if exists "event runs can be claimed" on public.room_survivors_event_records;
create policy "event runs can be claimed" on public.room_survivors_event_records for insert to anon
  with check (survived_ms = 0 and kills = 0 and level = 1 and finished = false and finished_at is null);
drop policy if exists "event runs are readable" on public.room_survivors_event_records;
create policy "event runs are readable" on public.room_survivors_event_records for select to anon using (true);

-- 끝난 판을 한 번만 채운다. 시작한 뒤 실제로 흐른 시간보다 오래 버텼다고 보내면 거절한다.
create or replace function public.finish_room_survivors_event(
  p_event text, p_crew_name text, p_survived_ms integer, p_kills integer, p_level integer
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  changed integer;
begin
  update public.room_survivors_event_records
  set survived_ms = p_survived_ms, kills = p_kills, level = p_level, finished = true, finished_at = now()
  where event = p_event
    and crew_name = btrim(p_crew_name)
    and not finished
    and p_survived_ms <= extract(epoch from (now() - created_at)) * 1000 + 30000;
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

revoke all on function public.finish_room_survivors_event(text, text, integer, integer, integer) from public;
grant execute on function public.finish_room_survivors_event(text, text, integer, integer, integer) to anon;
