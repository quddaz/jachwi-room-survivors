import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

const LIMIT = 50;

// 지금 기록을 모으는 시즌. 새 시즌을 열려면 이 숫자만 올리고 SEASONS 맨 앞에 넣는다.
export const SEASON = 3;
// 순위 화면에 보여 줄 시즌, 최신 순
export const SEASONS = [3, 2, 1];

// 시즌 1은 시즌을 나누기 전 이름 그대로 둔다.
const localKey = (season) => (season === 1 ? 'room-survivors:records' : `room-survivors:records:s${season}`);

export const isShared = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function headers() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

function readLocal(season) {
  try {
    return JSON.parse(localStorage.getItem(localKey(season)) ?? '[]');
  } catch {
    return [];
  }
}

function writeLocal(season, records) {
  try {
    localStorage.setItem(localKey(season), JSON.stringify(records));
  } catch {
    // 저장소를 못 쓰는 브라우저에서는 이번 판 순위만 보여 준다.
  }
}

function better(a, b) {
  return a.survivedMs - b.survivedMs || a.kills - b.kills || b.createdAt.localeCompare(a.createdAt);
}

// 크루마다 가장 오래 버틴 기록 한 줄만 남기고, 오래 버틴 순, 같으면 많이 잡은 순으로 줄 세운다.
export function rankBest(records) {
  const best = new Map();
  for (const entry of records) {
    const current = best.get(entry.crewName);
    if (!current || better(entry, current) > 0) best.set(entry.crewName, entry);
  }
  return [...best.values()].sort((a, b) => better(b, a)).slice(0, LIMIT);
}

export async function submitRecord({ crewName, survivedMs, kills, level }) {
  const entry = { crewName, survivedMs, kills, level, createdAt: new Date().toISOString() };
  if (!isShared) {
    writeLocal(SEASON, [...readLocal(SEASON), entry]);
    return;
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/room_survivors_records`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=minimal' },
    body: JSON.stringify({ crew_name: crewName, survived_ms: survivedMs, kills, level, season: SEASON }),
  });
  if (!response.ok) throw new Error(`기록을 저장하지 못했어요 (${response.status})`);
}

export async function fetchRanking(season = SEASON) {
  if (!isShared) return rankBest(readLocal(season));
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/room_survivors_season_best?select=crew_name,best_survived_ms,kills,level,created_at`
      + `&season=eq.${season}&order=best_survived_ms.desc,kills.desc,created_at.asc&limit=${LIMIT}`,
    { headers: headers() },
  );
  if (!response.ok) throw new Error(`순위를 불러오지 못했어요 (${response.status})`);
  const rows = await response.json();
  return rows.map((row) => ({ crewName: row.crew_name, survivedMs: row.best_survived_ms, kills: row.kills,
    level: row.level, createdAt: row.created_at }));
}

// 하루짜리 이벤트. 크루 이름 하나당 한 판만 기록된다. 이벤트가 끝나면 시작 버튼만 사라지고 순위는 남는다.
export const EVENT = { id: '2026-11-13', label: '11/13 이벤트', endsAt: '2026-11-14T00:00:00+09:00' };
export const isEventOpen = (now = Date.now()) => now < Date.parse(EVENT.endsAt);
const EVENT_LOCAL_KEY = `room-survivors:event:${EVENT.id}`;

// 이벤트 판을 시작하며 참가권을 쓴다. 이미 쓴 이름이면 false를 돌려준다.
export async function claimEventRun(crewName) {
  if (!isShared) {
    const runs = readLocalEvent();
    if (runs.some((entry) => entry.crewName === crewName)) return false;
    writeLocalEvent([...runs, { crewName, survivedMs: 0, kills: 0, level: 1, createdAt: new Date().toISOString() }]);
    return true;
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/room_survivors_event_records`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=minimal' },
    body: JSON.stringify({ event: EVENT.id, crew_name: crewName }),
  });
  if (response.status === 409) return false;
  if (!response.ok) throw new Error(`이벤트 참가를 확인하지 못했어요 (${response.status})`);
  return true;
}

export async function finishEventRun({ crewName, survivedMs, kills, level }) {
  if (!isShared) {
    writeLocalEvent(readLocalEvent().map((entry) => (entry.crewName === crewName ? { ...entry, survivedMs, kills, level } : entry)));
    return;
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/finish_room_survivors_event`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ p_event: EVENT.id, p_crew_name: crewName, p_survived_ms: survivedMs, p_kills: kills, p_level: level }),
  });
  if (!response.ok) throw new Error(`이벤트 기록을 저장하지 못했어요 (${response.status})`);
  if ((await response.json()) !== true) throw new Error('이벤트 기록은 한 번만 남길 수 있어요');
}

export async function fetchEventRanking() {
  if (!isShared) return rankBest(readLocalEvent());
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/room_survivors_event_records?select=crew_name,survived_ms,kills,level,created_at`
      + `&event=eq.${EVENT.id}&order=survived_ms.desc,kills.desc,created_at.asc&limit=${LIMIT}`,
    { headers: headers() },
  );
  if (!response.ok) throw new Error(`이벤트 순위를 불러오지 못했어요 (${response.status})`);
  const rows = await response.json();
  return rows.map((row) => ({ crewName: row.crew_name, survivedMs: row.survived_ms, kills: row.kills, level: row.level,
    createdAt: row.created_at }));
}

function readLocalEvent() {
  try {
    return JSON.parse(localStorage.getItem(EVENT_LOCAL_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function writeLocalEvent(records) {
  try {
    localStorage.setItem(EVENT_LOCAL_KEY, JSON.stringify(records));
  } catch {
    // 저장소를 못 쓰면 이 판만 기록하지 못한다.
  }
}
