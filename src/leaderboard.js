import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

const LOCAL_KEY = 'room-survivors:records';
const LIMIT = 50;

export const isShared = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function headers() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function writeLocal(records) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(records));
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
    writeLocal([...readLocal(), entry]);
    return;
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/room_survivors_records`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=minimal' },
    body: JSON.stringify({ crew_name: crewName, survived_ms: survivedMs, kills, level }),
  });
  if (!response.ok) throw new Error(`기록을 저장하지 못했어요 (${response.status})`);
}

export async function fetchRanking() {
  if (!isShared) return rankBest(readLocal());
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/room_survivors_crew_best?select=crew_name,best_survived_ms,kills,level,created_at`
      + `&order=best_survived_ms.desc,kills.desc,created_at.asc&limit=${LIMIT}`,
    { headers: headers() },
  );
  if (!response.ok) throw new Error(`순위를 불러오지 못했어요 (${response.status})`);
  const rows = await response.json();
  return rows.map((row) => ({ crewName: row.crew_name, survivedMs: row.best_survived_ms, kills: row.kills,
    level: row.level, createdAt: row.created_at }));
}
