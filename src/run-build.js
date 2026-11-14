import { BUILD, CHARACTERS, EVOLUTIONS, FUSIONS, MAX_FUSIONS, MAX_LEVEL, MAX_RELICS, MAX_WEAPONS, PASSIVES, RELICS, WEAPONS, normalizeBuild, passiveMaxLevel } from './rules.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (definitions, id) => typeof id === 'string' && Object.hasOwn(definitions, id);
const statKeys = ['maxHp', 'speed', 'might', 'cooldownScale', 'critChance', 'critDamage', 'flatDamage', 'area', 'summonPower', 'summonCount', 'dotPower', 'relicPower', 'relicRepeats', 'dropBonus'];
const uniqueIds = (values, definitions, limit) => [...new Set(Array.isArray(values) ? values.filter(id => own(definitions, id)) : [])].slice(0, limit);
function leveled(values, definitions, max, limit) {
  const result = [], seen = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    if (!object(value) || !own(definitions, value.id) || seen.has(value.id) || !Number.isFinite(value.level)) continue;
    const level = Math.max(0, Math.min(max(value.id), Math.floor(value.level)));
    if (!level) continue;
    seen.add(value.id);
    result.push({ id: value.id, level, ...(definitions === WEAPONS ? { evolved: value.evolved === true && level === MAX_LEVEL } : {}) });
    if (result.length >= limit) break;
  }
  return result;
}

// 저장된 입력은 알려진 ID와 유한한 수치만 남긴다. 이전 기록의 빈 정보는 추측하지 않는다.
export function normalizeRunBuild(value) {
  if (!object(value) || value.version !== 1 || !own(CHARACTERS, value.character) || !object(value.build) || !Array.isArray(value.weapons)) return null;
  const weapons = leveled(value.weapons, WEAPONS, () => MAX_LEVEL, MAX_WEAPONS);
  const fused = uniqueIds(value.fusions, FUSIONS, MAX_FUSIONS).filter(id =>
    FUSIONS[id].from.every(material => weapons.some(weapon => weapon.id === material && weapon.evolved)));
  const stats = Object.fromEntries(statKeys.filter(key => object(value.stats) && Number.isFinite(value.stats[key]) && value.stats[key] >= 0 && value.stats[key] <= 1e6)
    .map(key => [key, Math.round(value.stats[key] * 10000) / 10000]));
  return { version: 1, character: value.character, build: normalizeBuild(value.build), weapons, fusions: fused,
    passives: leveled(value.passives, PASSIVES, passiveMaxLevel, Object.keys(PASSIVES).length),
    relics: uniqueIds(value.relics, RELICS, MAX_RELICS + BUILD.treasure.perks[20].maxRelics + CHARACTERS.hunter.maxRelics), stats };
}

export function captureRunBuild(game, stats) {
  return normalizeRunBuild({ version: 1, character: game.character, build: { ...game.build },
    weapons: Object.entries(game.weapons).map(([id, level]) => ({ id, level, evolved: Boolean(game.evolved[id]) })),
    fusions: Object.keys(game.fusions).filter(id => game.fusions[id]),
    passives: Object.entries(game.passives).map(([id, level]) => ({ id, level })),
    relics: Object.keys(game.relics).filter(id => game.relics[id]), stats: { ...stats } });
}

// 합체 재료는 독립 무기로 다시 표시하지 않는다.
export function runBuildWeapons(loadout) {
  const materials = new Set(loadout.fusions.flatMap(id => FUSIONS[id].from));
  return [
    ...loadout.fusions.map(id => ({ id, label: FUSIONS[id].label, badge: '합체', icon: id })),
    ...loadout.weapons.filter(weapon => !materials.has(weapon.id)).map(weapon => ({ id: weapon.id,
      label: weapon.evolved ? EVOLUTIONS[weapon.id].label : WEAPONS[weapon.id].label,
      badge: weapon.evolved ? '완성형' : `Lv ${weapon.level}`, icon: weapon.evolved ? EVOLUTIONS[weapon.id].icon ?? weapon.id : weapon.id })),
  ];
}
