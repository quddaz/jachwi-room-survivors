import {
  ARENA, BOSS_EVERY_SEC, bossStatsOf, BUILD, buildEfficiency, difficultyAt, HIT_FREEZE, HIT_SLOW, HP_SURGE, hpSurgeAt, normalizeBuild, DROP_LIMIT, DROPS, ELITE, eliteFrom, ENEMIES, EVOLUTIONS, FUSIONS, MAX_FUSIONS, MAX_LEVEL, MAX_WEAPONS, MAX_RELICS, RELIC_LEVEL_SCALE, RELICS, passiveMaxLevel, PASSIVES, PLAYER, WEAPONS, xpToNext,
} from './rules.js';

// 화면과 분리한 게임 상태. update(dt)만 부르면 한 프레임이 흐르고, 그리기는 상태를 읽기만 한다.
export function createGame(random = Math.random) {
  return {
    random,
    time: 0,
    over: false,
    kills: 0,
    level: 1,
    xp: 0,
    nextXp: xpToNext(1),
    pendingLevels: 0,
    choices: null,
    player: { x: ARENA.width / 2, y: ARENA.height / 2, hp: PLAYER.maxHp, facing: 1, moving: false, hurtFlash: 0, invulnerable: 0 },
    weapons: { spray: 1 },
    passives: {},
    cooldowns: {},
    enemies: [],
    shots: [],
    slippers: [],
    traps: [],
    pins: [],
    waves: [],
    splashes: [],
    balls: [],
    robots: [],
    summons: [],
    enemyShots: [],
    puddles: [],
    slimes: [],
    hazards: [],
    evolved: {},
    fusions: {},
    relics: {},
    pendingRelics: 0,
    revived: false,
    alarmIn: 0,
    eliteUnlocked: 0,
    hpSurgeWarned: false,
    hpSurgeStarted: false,
    swapIn: null,
    shake: 0,
    gems: [],
    drops: [],
    effects: [],
    spawnCarry: 0,
    nextBossAt: BOSS_EVERY_SEC,
    nextSwarmAt: 60,
    bossIndex: 0,
    coffeeUntil: -1,
    freezeUntil: -1,
    shieldUntil: -1,
    xpCarry: 0,
    nextId: 1,
    rerollLeft: 1,
  };
}

function passiveValue(game, id, key) {
  const level = game.passives[id] ?? 0;
  return level === 0 ? 0 : PASSIVES[id][key][Math.min(level, PASSIVES[id][key].length) - 1];
}

const relic = (game, id) => (game.relics[id] ? RELICS[id] : null);

// 체력 30% 이하인지(마지막 컵라면)
// 시작할 때 나눈 능력치에서 나오는 값. 파트마다 점수 × 포인트당 효과 × 효율 배율을 더한다.
function buildValue(game, key) {
  // 배분은 게임 중에 바뀌지 않아서 한 번 계산한 값을 기억해 둔다(치명타 계산마다 불린다).
  const cache = game.buildCache ??= {};
  if (cache.build === game.build && key in cache) return cache[key];
  if (cache.build !== game.build) {
    game.buildCache = { build: game.build };
    return buildValue(game, key);
  }
  let sum = 0;
  for (const [tree, def] of Object.entries(BUILD)) {
    const points = game.build?.[tree] ?? 0;
    if (points && def.per[key]) sum += points * def.per[key] * buildEfficiency(points);
  }
  cache[key] = sum;
  return sum;
}

// 5·10·20점에 열리는 능력. 아직 못 열었으면 null이다.
const perk = (game, tree, at) => ((game.build?.[tree] ?? 0) >= at ? BUILD[tree].perks[at] : null);

// 보물이 직접 주는 피해의 배율: 보물 파트, 광택제, 보물 파트 10점
function relicPowerOf(game) {
  return 1 + buildValue(game, 'relicPower') + passiveValue(game, 'polish', 'relicPower') + (perk(game, 'treasure', 10)?.relicPower ?? 0);
}

// 보물이 직접 주는 피해. 공격력, 레벨, 보물 피해에 비례해서 후반에도 쓸모 있다.
function relicDamage(game, base) {
  return base * mightOf(game) * relicPowerOf(game) * (1 + RELIC_LEVEL_SCALE * (game.level - 1));
}

// 때마다 발동하는 보물의 주기. 무기처럼 쿨타임(공격 속도) 영향을 받고, 보물 파트 10점이면 더 짧아진다.
// 보물은 쿨타임이 핵심이라, 보물 파트(1점당·10점)와 태엽 열쇠의 주기 감소가 무기 쿨타임에 곱해진다. 최소 원래의 20%.
function relicHasteOf(game) {
  return 1 - (1 - buildValue(game, 'relicHaste')) * (1 - (perk(game, 'treasure', 10)?.relicHaste ?? 0)) * (1 - passiveValue(game, 'windup', 'relicHaste'));
}

function relicEvery(game, sec) {
  return sec * Math.max(0.2, statsOf(game).cooldownScale * (1 - relicHasteOf(game)));
}

// 보물이 닿는 범위. 무기처럼 범위(물티슈 등) 영향을 받는다.
function relicReach(game, radius) {
  return radius * statsOf(game).area;
}

function hasDotSource(game) {
  return ['bleach', 'dryer', 'dehumidifier'].some(id => activeWeapon(game, id))
    || ['poisongun', 'dryoven', 'sawblade', 'bleachbot', 'spinlaser'].some(id => game.fusions[id])
    || Boolean(game.relics.match);
}

function fixedPowerOf(game) {
  return 1 + (relic(game, 'precisionscale')?.fixedPower ?? 0);
}

// 전용 보물과 패시브는 해당 파트 20점이어야 나온다.
function buildUnlocked(game, def) {
  return (!def.treasureOnly || Boolean(perk(game, 'treasure', 20)))
    && (!def.hasteOnly || Boolean(perk(game, 'haste', 20)))
    && (!def.summonOnly || Boolean(perk(game, 'summon', 20)))
    && (!def.dotOnly || hasDotSource(game))
    && (!def.requiresFixedDamage || flatDamageOf(game) > 0);
}

// 가질 수 있는 무기 수. 보물 파트 20점이면 보물 칸을 늘리는 대신 무기는 3칸이다.
export function maxWeaponsOf(game) {
  return perk(game, 'treasure', 20)?.maxWeapons ?? MAX_WEAPONS;
}

// 가질 수 있는 보물 수
export function maxRelicsOf(game) {
  return MAX_RELICS + (perk(game, 'treasure', 20)?.maxRelics ?? 0);
}

// 공속 20점 과충전: 8초마다 3초 동안 공격 속도가 1.5배다.
function overcharged(game) {
  const charge = perk(game, 'haste', 20);
  return Boolean(charge) && game.time % charge.everySec >= charge.everySec - charge.burstSec;
}

// 게임을 시작할 때 능력치 배분을 넣고, 늘어난 최대 체력만큼 채운다.
export function applyBuild(game, build) {
  game.build = normalizeBuild(build);
  game.player.hp = statsOf(game).maxHp;
}

function maxHpOf(game) {
  return PLAYER.maxHp + passiveValue(game, 'vitamin', 'maxHp') + (relic(game, 'waterbottle')?.maxHp ?? 0) + buildValue(game, 'maxHp');
}

// 모은 치명타 확률. 고무망치가 있으면 치명타는 안 터지고 이 값이 고정 피해로 바뀐다.
function rawCritChance(game) {
  return passiveValue(game, 'clover', 'critChance') + (relic(game, 'neko')?.critChance ?? 0) + (relic(game, 'dice')?.critChance ?? 0)
    + buildValue(game, 'critChance') - passiveValue(game, 'precision', 'critPenalty');
}

function critChanceOf(game, bonus = 0) {
  return relic(game, 'mallet') ? 0 : Math.max(0, rawCritChance(game) + bonus);
}

// 고무망치 전환은 치명타 확률 감소까지 적용한 뒤 계산한다.
function malletDamageOf(game) {
  const mallet = relic(game, 'mallet');
  return mallet ? Math.floor(Math.max(0, rawCritChance(game)) / mallet.step + 1e-9) * mallet.flat * fixedPowerOf(game) : 0;
}

// 새 고정 피해는 공격력·진화·합체 배율과 치명타를 적용한 뒤 한 번 더한다.
// 독·화상·장판처럼 프레임마다 계산하는 지속 피해와 공격 보물에는 붙이지 않는다.
function onHitDamageOf(game) {
  return (passiveValue(game, 'precision', 'hitDamage') + passiveValue(game, 'lightgear', 'hitDamage')
    + passiveValue(game, 'counterweight', 'hitDamage') + (relic(game, 'precisionscale')?.hitDamage ?? 0)) * fixedPowerOf(game);
}

function flatDamageOf(game) {
  return malletDamageOf(game) + onHitDamageOf(game);
}

function critDamageOf(game) {
  return PLAYER.critDamage + passiveValue(game, 'hotsauce', 'critDamage') + (relic(game, 'dice')?.critDamage ?? 0) + buildValue(game, 'critDamage')
    + (perk(game, 'crit', 20)?.critDamage ?? 0);
}

function cornered(game) {
  const cup = relic(game, 'lastcup');
  return Boolean(cup) && game.player.hp <= maxHpOf(game) * cup.below;
}

// 공격력 배율. 단백질 셰이크에 움직일 때(에너지 드링크)와 궁지에 몰렸을 때(마지막 컵라면) 보너스가 더해진다.
function mightOf(game) {
  return (1 + passiveValue(game, 'protein', 'might')
    + (game.player.moving ? relic(game, 'energy')?.might ?? 0 : 0)
    + (cornered(game) ? RELICS.lastcup.might : 0)) * (1 - passiveValue(game, 'counterweight', 'attackPenalty'));
}

function weaponDamageScaleOf(game) {
  return 1 - passiveValue(game, 'lightgear', 'weaponPenalty');
}

export function statsOf(game) {
  const coffee = game.time < game.coffeeUntil;
  const guard = !game.player.moving ? relic(game, 'blanket')?.guard ?? 0 : 0;
  return {
    speed: PLAYER.speed * (1 + passiveValue(game, 'sneakers', 'speed') + (relic(game, 'energy')?.speed ?? 0)
      + (relic(game, 'scooter')?.speed ?? 0)) * (coffee ? 1.25 : 1),
    armor: guard,
    pickupRadius: PLAYER.pickupRadius * (1 + passiveValue(game, 'vacuum', 'pickup') + (relic(game, 'magnet')?.pickup ?? 0)),
    maxHp: maxHpOf(game),
    regen: PLAYER.regen + passiveValue(game, 'vitamin', 'regen') + (relic(game, 'waterbottle')?.regen ?? 0),
    cooldownScale: (1 - passiveValue(game, 'battery', 'haste')) * (coffee ? 0.7 : 1) * (cornered(game) ? 1 - RELICS.lastcup.haste : 1)
      * (1 - (relic(game, 'stopwatch')?.haste ?? 0)) / (1 + (relic(game, 'mallet')?.attackSpeed ?? 0)) / (1 + buildValue(game, 'attackSpeed'))
      / (1 + (perk(game, 'haste', 20)?.attackSpeed ?? 0)) / (game.time < (game.rushUntil ?? -1) ? 1 + BUILD.haste.perks[5].rush : 1)
      / (overcharged(game) ? 1 + BUILD.haste.perks[20].burst : 1),
    xpGain: 1 + passiveValue(game, 'candle', 'xpGain') + (relic(game, 'piggy')?.xpGain ?? 0),
    area: 1 + passiveValue(game, 'wipes', 'area') + (relic(game, 'bigpot')?.area ?? 0) + (perk(game, 'haste', 10)?.area ?? 0),
    might: mightOf(game),
    weaponDamageScale: weaponDamageScaleOf(game),
    projectile: 1 + passiveValue(game, 'magnifier', 'size') + (relic(game, 'bigpot')?.projectile ?? 0)
      + (perk(game, 'haste', 10)?.projectile ?? 0),
    critChance: critChanceOf(game),
    critDamage: critDamageOf(game),
    flatDamage: flatDamageOf(game),
    relicPower: relicPowerOf(game),
    dotPower: 1 + (relic(game, 'thermos')?.dotPower ?? 0),
    summonPower: (1 + buildValue(game, 'summonPower') + passiveValue(game, 'summoncrest', 'summonPower')) * (1 + (relic(game, 'baton')?.power ?? 0)),
    summonSpeed: (1 + buildValue(game, 'summonSpeed') + (perk(game, 'summon', 5)?.speed ?? 0)) * (1 + (relic(game, 'marchdrum')?.speed ?? 0)),
    summonHaste: (1 + (perk(game, 'summon', 10)?.attackSpeed ?? 0)) * (1 + (relic(game, 'marchdrum')?.attackSpeed ?? 0)),
    summonRange: (1 + (perk(game, 'summon', 5)?.range ?? 0)) * (1 + (relic(game, 'baton')?.range ?? 0)),
    summonCount: passiveValue(game, 'summonwhistle', 'summonCount'),
  };
}

function rerollsPerLevel(game) {
  return 1 + (relic(game, 'neko')?.rerolls ?? 0);
}

const percent = (value) => {
  const rounded = Math.round(value * 100);
  return rounded === 0 ? '0%' : `${rounded > 0 ? '+' : ''}${rounded}%`;
};
const number = (value) => (Math.abs(value) >= 10 ? String(Math.round(value)) : String(Math.round(value * 10) / 10));

// 공속 배율을 자율 이동형 무기의 이동에도 그대로 적용한다.
export function attackTempoOf(game) {
  return 1 / statsOf(game).cooldownScale;
}

// 오른쪽 아래 능력치 창. [이름, 값] 목록이다.
export function statSheet(game) {
  const stats = statsOf(game);
  return [
    ['최대 체력', number(stats.maxHp)],
    ['초당 회복', number(stats.regen)],
    ['공격력', percent(stats.might - 1)],
    ...(stats.weaponDamageScale < 1 ? [['무기 기본 피해', percent(stats.weaponDamageScale - 1)]] : []),
    ['이동 속도', percent(stats.speed / PLAYER.speed - 1)],
    ['쿨타임', percent(stats.cooldownScale - 1)],
    ['무기 범위', percent(stats.area - 1)],
    ['투사체 크기', percent(stats.projectile - 1)],
    ['받는 피해', percent(-stats.armor)],
    ['줍는 범위', percent(stats.pickupRadius / PLAYER.pickupRadius - 1)],
    ['경험치', percent(stats.xpGain - 1)],
    ['치명타 확률', `${Math.round(stats.critChance * 100)}%`],
    ['치명타 피해', `${Math.round(stats.critDamage * 100)}%`],
    ...(stats.summonPower > 1 ? [['소환 피해', percent(stats.summonPower - 1)], ['소환 이동 속도', percent(stats.summonSpeed - 1)]] : []),
    ...(stats.summonHaste > 1 ? [['소환 공격 속도', percent(stats.summonHaste - 1)]] : []),
    ...(stats.summonCount ? [['추가 소환수', `+${stats.summonCount}`]] : []),
    ...(stats.dotPower > 1 ? [['지속 피해', percent(stats.dotPower - 1)]] : []),
    ...(game.relics.concentrate ? [['농축 피해', `최대 ${percent(RELICS.concentrate.power)}`]] : []),
    ...(stats.flatDamage > 0 ? [['고정 피해', `+${stats.flatDamage}`]] : []),
    ...(stats.relicPower > 1 ? [['보물 피해', percent(stats.relicPower - 1)]] : []),
    ...(relicHasteOf(game) > 0 ? [['보물 발동 주기', `-${Math.round(relicHasteOf(game) * 100)}%`]] : []),
  ];
}

// 패시브 효과를 사람이 읽는 말로. [이름, 값을 글로 바꾸는 함수]
const PASSIVE_TEXT = {
  summonPower: ['소환 피해', percent],
  summonCount: ['소환수', value => `+${number(value)}`],
  speed: ['이동 속도', percent],
  pickup: ['줍는 범위', percent],
  maxHp: ['최대 체력', (value) => `+${number(value)}`],
  regen: ['초당 회복', (value) => `+${number(value)}`],
  haste: ['쿨타임', (value) => percent(-value)],
  xpGain: ['경험치', percent],
  area: ['무기 범위', percent],
  might: ['공격력', percent],
  size: ['투사체 크기', percent],
  critChance: ['치명타 확률', percent],
  critDamage: ['치명타 피해', percent],
  critPenalty: ['치명타 확률 감소', (value) => `${Math.round(value * 100)}%p`],
  weaponPenalty: ['무기 기본 피해', (value) => percent(-value)],
  attackPenalty: ['공격력 감소', (value) => percent(-value)],
  hitDamage: ['타격당 고정 피해', (value) => `+${number(value)}`],
  relicPower: ['보물 피해', percent],
  relicHaste: ['보물 발동 주기', (value) => `-${Math.round(value * 100)}%`],
};

// 무기 능력치 이름. lower는 줄어들수록 좋은 값이고, plain은 퍼센트 대신 개수로 보여 준다.
const WEAPON_TEXT = {
  damage: { name: '피해', might: true }, dps: { name: '초당 피해', might: true }, cooldown: { name: '쿨타임', lower: true, unit: '초' },
  radius: { name: '범위' }, range: { name: '사거리' }, width: { name: '굵기' }, size: { name: '크기' }, orbit: { name: '궤도' },
  speed: { name: '속도' }, length: { name: '길이' }, count: { name: '개수', plain: true }, pierce: { name: '관통', plain: true }, chains: { name: '연쇄', plain: true },
};

const EVOLUTION_TEXT = { power: '합체 피해', damage: '피해', dps: '초당 피해', radius: '범위', range: '사거리', size: '크기', jump: '연쇄 거리' };

// 패시브가 그 레벨일 때의 효과(도감용)
export function passiveLines(id, level) {
  return Object.entries(PASSIVES[id]).filter(([, values]) => Array.isArray(values))
    .map(([key, values]) => `${PASSIVE_TEXT[key][0]} ${PASSIVE_TEXT[key][1](values[level - 1])}`);
}

// 레벨업 카드에 적을 정확한 수치. 지금 값에서 얼마나 바뀌는지 보여 준다.
export function describeChoice(game, choice) {
  if (choice.kind === 'heal') return ['체력 +20'];
  if (choice.kind === 'passive') {
    const passive = PASSIVES[choice.id];
    return Object.entries(passive).filter(([, values]) => Array.isArray(values)).map(([key, values]) => {
      const [name, format] = PASSIVE_TEXT[key];
      if (key === 'attackPenalty') {
        const before = mightOf(game);
        const currentScale = 1 - passiveValue(game, choice.id, key);
        const after = before / currentScale * (1 - values[choice.level - 1]);
        return `공격력 ${percent(before - 1)} → ${percent(after - 1)}`;
      }
      const next = format(values[choice.level - 1]);
      return choice.level === 1 ? `${name} ${next}` : `${name} ${format(values[choice.level - 2])} → ${next}`;
    });
  }
  if (choice.kind === 'weapon') {
    const weapon = WEAPONS[choice.id];
    const might = statsOf(game).might;
    return Object.entries(weapon).filter(([key, values]) => Array.isArray(values) && WEAPON_TEXT[key]).flatMap(([key, values]) => {
      const dragonLength = weapon.summon === 'dragon' && key === 'count';
      const text = dragonLength ? { ...WEAPON_TEXT[key], name: '몸통 마디' } : WEAPON_TEXT[key];
      const summonPower = weapon.summon ? statsOf(game).summonPower : 1;
      const scale = text.might ? might * weaponDamageScaleOf(game) * summonPower : 1;
      const flat = key === 'damage' ? malletDamageOf(game) * summonPower + onHitDamageOf(game) : 0;
      const countBonus = key === 'count' && weapon.summon ? statsOf(game).summonCount : 0;
      const value = (level) => dragonLength ? weapon.segments + (values[level - 1] + countBonus - 1) * weapon.segmentsPerCount
        : values[level - 1] * scale + flat + countBonus;
      const show = (amount) => `${number(amount)}${text.unit ?? ''}`;
      if (choice.level === 1) return [`${text.name} ${show(value(1))}`];
      const before = value(choice.level - 1);
      const after = value(choice.level);
      if (before === after) return [];
      if (text.plain) return [`${text.name} ${show(before)} → ${show(after)}`];
      return [`${text.name} ${percent(after / before - 1)} (${show(before)} → ${show(after)})`];
    });
  }
  const recipe = choice.kind === 'fusion' ? FUSIONS[choice.id] : EVOLUTIONS[choice.id];
  return Object.entries(recipe).filter(([key, value]) => EVOLUTION_TEXT[key] && typeof value === 'number' && value > 1)
    .map(([key, value]) => `${EVOLUTION_TEXT[key]} ${percent(value - 1)}`);
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
// Math.hypot은 느려서, 프레임마다 수만 번 부르는 거리 계산은 sqrt로 한다.
const distance = (a, b) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// 적 찾기 격자. 프레임마다 한 번 적을 칸에 나눠 담아, 무기가 근처 칸의 적만 살피게 한다(적이 수백 마리여도 가볍게).
const CELL = 64;
const COLS = Math.ceil(ARENA.width / CELL) + 1;
const ROWS = Math.ceil(ARENA.height / CELL) + 1;
// 칸을 고를 때 더하는 여유: 가장 큰 적의 반지름과 이번 프레임에 밀려난 거리
const CELL_MARGIN = 72;

function buildGrid(game) {
  game.cells ??= Array.from({ length: COLS * ROWS }, () => []);
  for (const index of game.usedCells ?? []) game.cells[index].length = 0;
  const used = [];
  for (const enemy of game.enemies) {
    if (enemy.dead) continue;
    const index = clamp(Math.floor(enemy.x / CELL), 0, COLS - 1) + clamp(Math.floor(enemy.y / CELL), 0, ROWS - 1) * COLS;
    if (game.cells[index].length === 0) used.push(index);
    game.cells[index].push(enemy);
  }
  game.usedCells = used;
  game.gridFresh = true;
}

// (x, y)에서 reach 안쪽에 있을 수 있는 적들. 격자가 없거나 범위가 아주 넓으면 모든 적을 돌려준다.
function near(game, x, y, reach) {
  if (!game.gridFresh) return game.enemies;
  const span = reach + CELL_MARGIN;
  const left = clamp(Math.floor((x - span) / CELL), 0, COLS - 1);
  const right = clamp(Math.floor((x + span) / CELL), 0, COLS - 1);
  const top = clamp(Math.floor((y - span) / CELL), 0, ROWS - 1);
  const bottom = clamp(Math.floor((y + span) / CELL), 0, ROWS - 1);
  if ((right - left + 1) * (bottom - top + 1) > 160) return game.enemies;
  const found = [];
  for (let row = top; row <= bottom; row += 1) {
    for (let column = left; column <= right; column += 1) {
      const cell = game.cells[column + row * COLS];
      for (let index = 0; index < cell.length; index += 1) found.push(cell[index]);
    }
  }
  return found;
}

// 두 프레임 사이의 이동 경로를 원과 교차 검사한다. 빠른 탄이 작은 적을 통과하지 않게 한다.
function sweepHits(game, from, to, radius) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const lengthSq = dx * dx + dy * dy;
  const hits = [];
  for (const enemy of near(game, (from.x + to.x) / 2, (from.y + to.y) / 2, Math.sqrt(lengthSq) / 2 + radius)) {
    if (enemy.dead) continue;
    const x = from.x - enemy.x, y = from.y - enemy.y;
    const r = radius + enemy.radius;
    const c = x * x + y * y - r * r;
    let t = 0;
    if (c > 0) {
      if (lengthSq === 0) continue;
      const b = x * dx + y * dy;
      const discriminant = b * b - lengthSq * c;
      if (discriminant < 0) continue;
      t = (-b - Math.sqrt(discriminant)) / lengthSq;
      if (t < 0 || t > 1) continue;
    }
    hits.push({ enemy, t });
  }
  return hits.sort((a, b) => a.t - b.t || a.enemy.id - b.enemy.id);
}

function addEffect(game, effect) {
  if (game.effects.length > 240) {
    const index = game.effects.findIndex((candidate) => candidate.type !== 'banner');
    if (index >= 0) game.effects.splice(index, 1);
  }
  game.effects.push({ age: 0, seed: game.nextId++, ...effect });
}

function fire(game, from, angle, speed, damage, kind) {
  game.enemyShots.push({ x: from.x, y: from.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    damage, radius: 6, life: 5, kind, age: 0 });
}

// 보스는 ENEMIES에 없어서 능력치를 overrides로 모두 넘긴다.
const BOSS_BASE = { hp: 1, speed: 0, radius: 30, damage: 0, xp: 0 };

function spawnEnemy(game, kind, x, y, overrides = {}) {
  const base = ENEMIES[kind] ?? BOSS_BASE;
  const difficulty = difficultyAt(game.time);
  const enemy = {
    id: game.nextId++,
    kind,
    x: clamp(x, 20, ARENA.width - 20),
    y: clamp(y, 20, ARENA.height - 20),
    hp: base.hp * difficulty.hp,
    maxHp: base.hp * difficulty.hp,
    speed: base.speed * difficulty.speed,
    radius: base.radius,
    damage: base.damage * difficulty.damage,
    xp: base.xp,
    boss: false,
    timer: game.random() * 2,
    kx: 0,
    ky: 0,
    hitFlash: 0,
    ...overrides,
  };
  game.enemies.push(enemy);
  return enemy;
}

function spawnPoint(game, minDistance = 440, maxDistance = 560) {
  const angle = game.random() * Math.PI * 2;
  const reach = minDistance + game.random() * (maxDistance - minDistance) + Math.max(0, (game.viewRadius ?? 0) - 400);
  return { x: game.player.x + Math.cos(angle) * reach, y: game.player.y + Math.sin(angle) * reach };
}

function pickKind(game) {
  const alive = (kind) => game.enemies.reduce((count, enemy) => count + (enemy.kind === kind && !enemy.dead ? 1 : 0), 0);
  const available = Object.entries(ENEMIES).filter(([kind, enemy]) => enemy.weight > 0 && game.time >= enemy.from
    && (!enemy.maxAlive || alive(kind) < enemy.maxAlive));
  const total = available.reduce((sum, [, enemy]) => sum + enemy.weight, 0);
  let roll = game.random() * total;
  for (const [kind, enemy] of available) {
    roll -= enemy.weight;
    if (roll <= 0) return kind;
  }
  return available[0][0];
}

function eliteChance(game) {
  return Math.min(ELITE.maxChance, ELITE.chance + ((game.time - ELITE.from) / 60) * ELITE.chancePerMin);
}

function makeElite(enemy) {
  enemy.elite = true;
  enemy.hp *= ELITE.hp;
  enemy.maxHp *= ELITE.hp;
  enemy.damage *= ELITE.damage;
  enemy.speed *= ELITE.speed;
  enemy.radius *= ELITE.radius;
  enemy.xp *= ELITE.xp;
  return enemy;
}

function spawn(game, dt) {
  const difficulty = difficultyAt(game.time);
  // 정예가 한 종류씩 풀릴 때마다 알려 준다.
  while (game.eliteUnlocked < ELITE.order.length && game.time >= eliteFrom(ELITE.order[game.eliteUnlocked])) {
    const kind = ELITE.order[game.eliteUnlocked];
    if (game.time >= (ENEMIES[kind].from ?? 0)) addEffect(game, { type: 'banner', text: `정예 ${ENEMIES[kind].label} 등장!`, life: 2.2, boss: true });
    game.eliteUnlocked += 1;
  }
  game.spawnCarry += difficulty.spawnPerSec * dt;
  while (game.spawnCarry >= 1) {
    game.spawnCarry -= 1;
    if (game.enemies.length >= difficulty.maxEnemies) continue;
    const point = spawnPoint(game);
    const kind = pickKind(game);
    // 개미처럼 무리 지어 나오는 적은 한 번에 여럿이 나온다.
    for (let member = 0; member < (ENEMIES[kind].group ?? 1); member += 1) {
      const enemy = spawnEnemy(game, kind, point.x + (member ? (game.random() - 0.5) * 40 : 0), point.y + (member ? (game.random() - 0.5) * 40 : 0));
      if (game.time >= eliteFrom(kind) && game.random() < eliteChance(game)) makeElite(enemy);
    }
  }
  // 1분마다 바퀴벌레 떼가 사방에서 몰려온다.
  if (game.time >= game.nextSwarmAt) {
    const count = 26 + Math.floor(game.time / 60) * 12;
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      spawnEnemy(game, game.time >= 150 && index % 3 === 0 ? 'fly' : 'roach',
        game.player.x + Math.cos(angle) * 480, game.player.y + Math.sin(angle) * 480);
    }
    addEffect(game, { type: 'banner', text: '바퀴벌레 떼가 몰려와요!', life: 2.2 });
    game.nextSwarmAt += 60;
  }
  if (game.time >= game.nextBossAt) {
    const stats = bossStatsOf(game.bossIndex, game.time);
    const point = spawnPoint(game, 420, 460);
    spawnEnemy(game, stats.kind, point.x, point.y, {
      boss: true, hp: stats.hp, maxHp: stats.hp, speed: stats.speed, radius: stats.radius, damage: stats.damage,
      xp: stats.xp, label: stats.label, stats, dashUntil: -1, dashX: 0, dashY: 0,
    });
    addEffect(game, { type: 'banner', text: `${stats.label} 등장!`, life: 2.6, boss: true });
    addEffect(game, { type: 'flash', life: 0.5, color: 'red' });
    game.shake = 0.4;
    game.bossIndex += 1;
    game.nextBossAt += BOSS_EVERY_SEC;
  }
}

function movePlayer(game, dt, input) {
  const { player } = game;
  const stats = statsOf(game);
  const length = Math.hypot(input.x, input.y);
  const onSlime = game.slimes.some((slime) => distance(slime, player) < slime.radius);
  const speed = stats.speed * (onSlime ? 1 - ENEMIES.mold.slow : 1);
  player.moving = length > 0.05;
  if (player.moving) {
    const scale = Math.min(1, length) / length;
    player.x = clamp(player.x + input.x * scale * speed * dt, PLAYER.radius, ARENA.width - PLAYER.radius);
    player.y = clamp(player.y + input.y * scale * speed * dt, PLAYER.radius, ARENA.height - PLAYER.radius);
    if (Math.abs(input.x) > 0.1) player.facing = Math.sign(input.x);
    player.heading = Math.atan2(input.y, input.x);
  }
  player.onSlime = onSlime;
  player.hurtFlash = Math.max(0, player.hurtFlash - dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);
}

// 맞으면 잠깐 무적이 되어, 적이 여럿 붙어 있어도 한 번에 한 대씩만 맞는다.
// ranged는 탄막이나 떨어지는 쓰레기처럼 날아온 피해다(우산이 막는다).
function damagePlayer(game, amount, ranged = false) {
  const { player } = game;
  if (player.invulnerable > 0 || game.time < game.shieldUntil) return false;
  if (ranged) amount *= 1 - (relic(game, 'umbrella')?.guard ?? 0);
  // 아무리 센 공격도 한 번에 최대 체력의 일정 비율까지만 깎는다.
  amount = Math.min(amount, statsOf(game).maxHp * difficultyAt(game.time).hitShare);
  player.hp -= amount * (1 - statsOf(game).armor);
  player.hurtFlash = 0.15;
  player.invulnerable = PLAYER.invulnerableSec;
  game.shake = 0.25;
  if (player.hp <= 0 && relic(game, 'firstaid') && !game.revived) {
    // 구급상자: 한 번만 일어난다.
    game.revived = true;
    player.hp = statsOf(game).maxHp * RELICS.firstaid.reviveHp;
    player.invulnerable = RELICS.firstaid.reviveGuardSec;
    game.shieldUntil = game.time + RELICS.firstaid.reviveGuardSec;
    addEffect(game, { type: 'levelup', x: player.x, y: player.y, life: 1.2, gold: true });
    addEffect(game, { type: 'flash', life: 0.5 });
    addEffect(game, { type: 'banner', text: '구급상자! 다시 일어났어요', life: 2.4 });
  }
  if (player.hp <= 0) {
    player.hp = 0;
    game.over = true;
  }
  return true;
}

function ringOfShots(game, enemy, count, speed, damage, kind, offset = 0) {
  for (let index = 0; index < count; index += 1) {
    fire(game, enemy, (index / count) * Math.PI * 2 + offset, speed, damage, kind);
  }
}

// 녹슨 보일러: 원형 탄막, 소용돌이, 조준 부채꼴을 번갈아 쏜다.
function boilerPattern(game, enemy, dt, aim, difficulty) {
  const { patternSec, burstCount, shotSpeed } = enemy.stats;
  const damage = enemy.stats.shotDamage * difficulty.damage;
  const before = enemy.patternTime ?? 0;
  const now = before + dt;
  const pattern = (enemy.patternIndex ?? 0) % 3;
  const crossed = (mark) => before < mark && now >= mark;
  if (pattern === 0) {
    if (crossed(0.4)) ringOfShots(game, enemy, burstCount, shotSpeed, damage, 'rust', enemy.id);
    if (crossed(1.1)) ringOfShots(game, enemy, burstCount, shotSpeed * 0.8, damage, 'rust', enemy.id + Math.PI / burstCount);
  } else if (pattern === 1) {
    for (let mark = 0.3; mark < 2.4; mark += 0.1) {
      if (crossed(mark)) {
        fire(game, enemy, mark * 5.2, shotSpeed * 0.9, damage, 'steam');
        fire(game, enemy, mark * 5.2 + Math.PI, shotSpeed * 0.9, damage, 'steam');
      }
    }
  } else {
    for (const mark of [0.4, 1.0, 1.6]) {
      if (crossed(mark)) for (let lane = -2; lane <= 2; lane += 1) fire(game, enemy, aim + lane * 0.22, shotSpeed * 1.15, damage, 'rust');
    }
  }
  enemy.patternTime = now;
  if (now >= patternSec) {
    enemy.patternTime = 0;
    enemy.patternIndex = (enemy.patternIndex ?? 0) + 1;
  }
}

function moveEnemies(game, dt) {
  const { player } = game;
  const difficulty = difficultyAt(game.time);
  const frozen = game.time < game.freezeUntil;
  for (const enemy of game.enemies) {
    enemy.frozen = (frozen || game.time < (enemy.chillUntil ?? 0)) && !enemy.boss;
    if (enemy.frozen) {
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      continue;
    }
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const gap = Math.hypot(dx, dy) || 1;
    let direction = 1;
    const hitSlow = game.time < (enemy.hitSlowUntil ?? 0) ? (enemy.elite ? HIT_SLOW.eliteSpeed : HIT_SLOW.speed) : 1;
    const areaSlow = game.time < (enemy.slowUntil ?? 0) ? enemy.slowBy : 1;
    let speed = enemy.speed * Math.min(hitSlow, areaSlow);
    let moveX = dx / gap;
    let moveY = dy / gap;
    enemy.timer += dt;

    if (enemy.kind === 'mosquito' || enemy.kind === 'moth') {
      // 날벌레는 다가오는 방향에서 좌우로 흔들린다.
      const sway = Math.sin(game.time * 7 + enemy.id) * ENEMIES[enemy.kind].sway;
      moveX -= (dy / gap) * sway;
      moveY += (dx / gap) * sway;
    }
    if (enemy.kind === 'moth') {
      const base = ENEMIES.moth;
      if (gap < base.range * 0.7) direction = -0.6;
      else if (gap < base.range) direction = 0.15;
      if (enemy.timer >= base.shootEverySec && gap < base.range + 80) {
        enemy.timer = 0;
        for (let lane = -1; lane <= 1; lane += 1) {
          fire(game, enemy, Math.atan2(dy, dx) + lane * base.spread, base.shotSpeed, base.shotDamage * difficulty.damage * (enemy.elite ? ELITE.damage : 1), 'rust');
        }
      }
    }
    if (enemy.kind === 'spider') {
      const base = ENEMIES.spider;
      enemy.crouching = false;
      if (game.time < (enemy.leapUntil ?? 0)) {
        moveX = enemy.leapX;
        moveY = enemy.leapY;
        speed *= base.leapSpeed;
      } else if (enemy.timer >= base.leapEverySec && gap < base.leapRange) {
        enemy.timer = 0;
        enemy.leapUntil = game.time + base.leapSec;
        enemy.leapX = dx / gap;
        enemy.leapY = dy / gap;
      } else if (enemy.timer >= base.leapEverySec - base.crouchSec && gap < base.leapRange) {
        // 뛰기 직전에 잠깐 멈춰 웅크린다.
        direction = 0;
        enemy.crouching = true;
      }
    }
    if (enemy.kind === 'slug' && enemy.timer >= ENEMIES.slug.trailEverySec) {
      enemy.timer = 0;
      if (game.slimes.length < 120) game.slimes.push({ x: enemy.x, y: enemy.y, radius: ENEMIES.slug.trailRadius, life: ENEMIES.slug.trailSec });
    }
    if (enemy.kind === 'sock') {
      const base = ENEMIES.sock;
      enemy.stinking = gap < base.auraRadius;
      if (enemy.stinking && enemy.timer >= base.auraEverySec) {
        enemy.timer = 0;
        damagePlayer(game, base.auraDamage * difficulty.damage * (enemy.elite ? ELITE.damage : 1));
      }
    }
    if (enemy.kind === 'dustbunny') {
      const base = ENEMIES.dustbunny;
      if (enemy.timer >= base.blinkEverySec && gap > base.blinkMin) {
        enemy.timer = 0;
        addEffect(game, { type: 'burst', x: enemy.x, y: enemy.y, color: 'dust', count: 10, life: 0.4 });
        const angle = game.random() * Math.PI * 2;
        enemy.x = clamp(player.x + Math.cos(angle) * base.blinkTo, enemy.radius, ARENA.width - enemy.radius);
        enemy.y = clamp(player.y + Math.sin(angle) * base.blinkTo, enemy.radius, ARENA.height - enemy.radius);
        addEffect(game, { type: 'ring', x: enemy.x, y: enemy.y, radius: 40, color: 'dust', life: 0.35 });
        continue;
      }
    }
    if (enemy.kind === 'pigeon') {
      const base = ENEMIES.pigeon;
      enemy.aiming = game.time < (enemy.aimUntil ?? 0);
      if (game.time < (enemy.swoopUntil ?? 0)) {
        moveX = enemy.swoopX;
        moveY = enemy.swoopY;
        speed *= base.swoopSpeed;
      } else if (enemy.aiming) {
        // 겨누는 동안 멈춰서 방향을 고정한다. 끝나면 바로 내리꽂는다.
        direction = 0;
        if (game.time + dt >= enemy.aimUntil) enemy.swoopUntil = game.time + base.swoopSec;
      } else if (enemy.timer >= base.swoopEverySec && gap < base.swoopRange) {
        enemy.timer = 0;
        enemy.aimUntil = game.time + base.aimSec;
        enemy.swoopX = dx / gap;
        enemy.swoopY = dy / gap;
        enemy.swoopLen = enemy.speed * base.swoopSpeed * base.swoopSec;
        direction = 0;
      }
    }
    if (enemy.kind === 'milk') {
      const base = ENEMIES.milk;
      if (!enemy.fuseAt && gap < base.fuseRange) {
        enemy.fuseAt = game.time + base.fuseSec;
        game.hazards.push({ x: enemy.x, y: enemy.y, radius: base.blastRadius, delay: base.fuseSec, total: base.fuseSec,
          damage: base.blastDamage * difficulty.damage * (enemy.elite ? ELITE.damage : 1), blast: true, owner: enemy });
      }
      if (enemy.fuseAt) {
        direction = 0;
        enemy.hitFlash = Math.floor(game.time * 14) % 2 === 0 ? 0.05 : 0;
        if (game.time >= enemy.fuseAt) {
          enemy.exploded = true;
          killEnemy(game, enemy);
          continue;
        }
      }
    }

    if (enemy.kind === 'rust') {
      const base = ENEMIES.rust;
      if (gap < base.range * 0.7) direction = -0.6;
      else if (gap < base.range) direction = 0;
      if (enemy.timer >= base.shootEverySec && gap < base.range + 80) {
        enemy.timer = 0;
        fire(game, enemy, Math.atan2(dy, dx), base.shotSpeed, base.shotDamage * difficulty.damage * (enemy.elite ? ELITE.damage : 1), 'rust');
      }
    }
    if (enemy.kind === 'kingRoach') {
      if (enemy.timer >= enemy.stats.chargeEverySec) {
        enemy.timer = 0;
        enemy.dashUntil = game.time + 0.7;
        enemy.dashX = dx / gap;
        enemy.dashY = dy / gap;
      }
      if (game.time < enemy.dashUntil) {
        enemy.vx = enemy.dashX;
        enemy.vy = enemy.dashY;
        enemy.dashing = true;
        enemy.x += enemy.dashX * enemy.speed * 3.4 * dt;
        enemy.y += enemy.dashY * enemy.speed * 3.4 * dt;
        if (game.random() < 0.5) addEffect(game, { type: 'burst', x: enemy.x, y: enemy.y, color: 'dust', count: 2, life: 0.3 });
        continue;
      }
      if (enemy.dashing) {
        // 돌진이 끝나면 사방으로 알을 뿌린다.
        enemy.dashing = false;
        ringOfShots(game, enemy, enemy.stats.ringCount, enemy.stats.shotSpeed, enemy.stats.shotDamage * difficulty.damage,
          'egg', enemy.timer);
        addEffect(game, { type: 'ring', x: enemy.x, y: enemy.y, radius: 70, color: 'dust', life: 0.35 });
        game.shake = Math.max(game.shake, 0.15);
      }
    }
    if (enemy.kind === 'rustBoiler') boilerPattern(game, enemy, dt, Math.atan2(dy, dx), difficulty);
    if (enemy.kind === 'washer') {
      const stats = enemy.stats;
      if (game.time < (enemy.spinUntil ?? 0)) {
        // 탈수: 제자리에서 돌며 두 줄 소용돌이 탄막을 뿜고, 가까운 오리를 빨아들인다.
        direction = 0;
        enemy.spinning = true;
        enemy.spinAngle = (enemy.spinAngle ?? 0) + stats.spin * dt;
        enemy.shotIn = (enemy.shotIn ?? 0) - dt;
        if (enemy.shotIn <= 0) {
          enemy.shotIn = stats.shotEverySec;
          for (const offset of [0, Math.PI]) fire(game, enemy, enemy.spinAngle + offset, stats.shotSpeed, stats.shotDamage * difficulty.damage, 'rust');
        }
        if (gap < stats.pullRange && gap > 40) {
          player.x = clamp(player.x - (dx / gap) * stats.pull * dt, PLAYER.radius, ARENA.width - PLAYER.radius);
          player.y = clamp(player.y - (dy / gap) * stats.pull * dt, PLAYER.radius, ARENA.height - PLAYER.radius);
        }
      } else {
        enemy.spinning = false;
        if (enemy.timer >= stats.spinEverySec) {
          enemy.timer = 0;
          enemy.spinUntil = game.time + stats.spinSec;
          addEffect(game, { type: 'banner', text: '탈수 시작!', life: 1.2, boss: true });
        }
      }
    }
    if (enemy.kind === 'riceCooker' && enemy.timer >= enemy.stats.ventEverySec) {
      // 오리 쪽으로 증기 줄기를 겨눈다. 빨간 띠가 보이고 잠시 뒤 뿜는다.
      enemy.timer = 0;
      const stats = enemy.stats;
      const aim = Math.atan2(dy, dx);
      for (let vent = 0; vent < stats.vents; vent += 1) {
        const angle = aim + (vent - (stats.vents - 1) / 2) * stats.ventSpread;
        game.hazards.push({ x: enemy.x, y: enemy.y, line: true, angle, length: stats.ventLength, radius: stats.ventWidth / 2,
          delay: stats.aimSec, total: stats.aimSec, damage: stats.ventDamage * difficulty.damage });
      }
    }
    if (enemy.kind === 'moldQueen') {
      const stats = enemy.stats;
      enemy.sporeIn = (enemy.sporeIn ?? stats.sporeEverySec) - dt;
      if (enemy.sporeIn <= 0) {
        // 오리 둘레에 포자 고리, 한가운데에도 하나. 고리 밖이나 틈으로 빠져나가야 한다.
        enemy.sporeIn = stats.sporeEverySec;
        const turn = game.random() * Math.PI * 2;
        const spots = [{ x: player.x, y: player.y }, ...Array.from({ length: stats.sporeCount }, (_, index) => {
          const angle = turn + (index / stats.sporeCount) * Math.PI * 2;
          return { x: player.x + Math.cos(angle) * stats.sporeRing, y: player.y + Math.sin(angle) * stats.sporeRing };
        })];
        for (const spot of spots) {
          game.hazards.push({ ...spot, radius: stats.sporeRadius, delay: stats.sporeSec, total: stats.sporeSec,
            damage: stats.sporeDamage * difficulty.damage, spore: true });
        }
      }
      if (enemy.timer >= stats.summonEverySec) {
        enemy.timer = 0;
        if (game.enemies.length < 600) {
          for (let index = 0; index < stats.summonCount; index += 1) {
            const angle = (index / stats.summonCount) * Math.PI * 2 + game.time;
            spawnEnemy(game, 'mold', enemy.x + Math.cos(angle) * 50, enemy.y + Math.sin(angle) * 50);
          }
          addEffect(game, { type: 'ring', x: enemy.x, y: enemy.y, radius: 90, color: 'mold', life: 0.4 });
        }
      }
    }
    if (enemy.kind === 'kingFly') {
      const sway = Math.sin(game.time * 3.2 + enemy.id) * enemy.stats.sway;
      moveX -= (dy / gap) * sway;
      moveY += (dx / gap) * sway;
      if (enemy.timer >= enemy.stats.summonEverySec) {
        enemy.timer = 0;
        // 화면이 날파리로 꽉 차지 않게, 적이 너무 많을 때는 부르지 않는다.
        if (game.enemies.length < 600) {
          for (let index = 0; index < enemy.stats.summonCount; index += 1) {
            const angle = (index / enemy.stats.summonCount) * Math.PI * 2 + game.time;
            spawnEnemy(game, 'fly', enemy.x + Math.cos(angle) * 36, enemy.y + Math.sin(angle) * 36);
          }
          addEffect(game, { type: 'ring', x: enemy.x, y: enemy.y, radius: 80, color: 'fly', life: 0.4 });
          addEffect(game, { type: 'burst', x: enemy.x, y: enemy.y, color: 'fly', count: 14, life: 0.5 });
        }
      }
    }
    if (enemy.kind === 'garbageGiant' && enemy.timer >= enemy.stats.lobEverySec) {
      // 쓰레기를 던져 잠시 뒤 떨어질 자리를 미리 보여 준다.
      enemy.timer = 0;
      for (let index = 0; index < enemy.stats.lobCount; index += 1) {
        const spread = index === 0 ? 0 : 110;
        game.hazards.push({ x: player.x + (game.random() - 0.5) * 2 * spread, y: player.y + (game.random() - 0.5) * 2 * spread,
          radius: enemy.stats.lobRadius, delay: enemy.stats.lobDelaySec + index * 0.15,
          total: enemy.stats.lobDelaySec + index * 0.15, damage: enemy.stats.lobDamage * difficulty.damage });
      }
    }

    enemy.vx = moveX * speed * direction + enemy.kx;
    enemy.vy = moveY * speed * direction + enemy.ky;
    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;
    enemy.kx *= 0.86;
    enemy.ky *= 0.86;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.x = clamp(enemy.x, enemy.radius, ARENA.width - enemy.radius);
    enemy.y = clamp(enemy.y, enemy.radius, ARENA.height - enemy.radius);
  }
  separate(game.enemies);
}

// 적끼리 겹치지 않게 살짝 밀어낸다. 격자로 가까운 적만 비교한다.
// 칸 배열은 프레임마다 새로 만들지 않고 비워서 다시 쓴다.
const SEP_CELL = 48;
const SEP_COLS = Math.ceil(ARENA.width / SEP_CELL) + 2;
const SEP_ROWS = Math.ceil(ARENA.height / SEP_CELL) + 2;
const sepCells = Array.from({ length: SEP_COLS * SEP_ROWS }, () => []);
let sepUsed = [];

function separate(enemies) {
  for (const index of sepUsed) sepCells[index].length = 0;
  sepUsed = [];
  const cellOf = (x, y) => (clamp(Math.floor(x / SEP_CELL), 0, SEP_COLS - 1) + clamp(Math.floor(y / SEP_CELL), 0, SEP_ROWS - 1) * SEP_COLS);
  for (let index = 0; index < enemies.length; index += 1) {
    const cell = cellOf(enemies[index].x, enemies[index].y);
    if (sepCells[cell].length === 0) sepUsed.push(cell);
    sepCells[cell].push(index);
  }
  for (let index = 0; index < enemies.length; index += 1) {
    const enemy = enemies[index];
    const cx = clamp(Math.floor(enemy.x / SEP_CELL), 0, SEP_COLS - 1);
    const cy = clamp(Math.floor(enemy.y / SEP_CELL), 0, SEP_ROWS - 1);
    for (let oy = -1; oy <= 1; oy += 1) {
      const row = cy + oy;
      if (row < 0 || row >= SEP_ROWS) continue;
      for (let ox = -1; ox <= 1; ox += 1) {
        const column = cx + ox;
        if (column < 0 || column >= SEP_COLS) continue;
        const bucket = sepCells[column + row * SEP_COLS];
        for (let slot = 0; slot < bucket.length; slot += 1) {
          const otherIndex = bucket[slot];
          if (otherIndex <= index) continue;
          const other = enemies[otherIndex];
          const dx = other.x - enemy.x;
          const dy = other.y - enemy.y;
          const minGap = (enemy.radius + other.radius) * 0.85;
          const squared = dx * dx + dy * dy;
          if (squared >= minGap * minGap || squared === 0) continue;
          const gap = Math.sqrt(squared);
          const push = (minGap - gap) / 2;
          const enemyShare = other.boss ? 1.6 : enemy.boss ? 0.2 : 1;
          const otherShare = enemy.boss ? 1.6 : other.boss ? 0.2 : 1;
          enemy.x -= (dx / gap) * push * enemyShare;
          enemy.y -= (dy / gap) * push * enemyShare;
          other.x += (dx / gap) * push * otherShare;
          other.y += (dy / gap) * push * otherShare;
        }
      }
    }
  }
}

// 치명 10점은 처치 시, 급소 마스터는 치명타 적중마다 폭발한다. 폭발에서 다시 폭발하지 않는다.
function critBlast(game, source, amount, master = false) {
  const blast = perk(game, 'crit', master ? 20 : 10);
  if (!blast || game.critBlasting) return;
  game.critBlasting = true;
  for (const enemy of near(game, source.x, source.y, blast.blastRadius)) {
    if (enemy !== source && !enemy.dead && distance(enemy, source) < blast.blastRadius + enemy.radius) {
      damageEnemy(game, enemy, amount * blast.blastShare, false, source, 0,
        master ? { canCrit: false, hitEffects: false, showHit: false } : undefined);
    }
  }
  game.critBlasting = false;
  // 피해는 매 치명타마다 적용하고, 같은 적의 겹치는 연출만 짧게 묶는다.
  if (master && game.time < (source.nextMasterBlastVisualAt ?? -Infinity)) return;
  if (master) source.nextMasterBlastVisualAt = game.time + blast.blastVisualEverySec;
  addEffect(game, { type: 'ring', x: source.x, y: source.y, radius: blast.blastRadius, color: 'crit', life: 0.3, sound: master ? 'impact' : undefined });
  if (master) addEffect(game, { type: 'burst', x: source.x, y: source.y, color: 'crit', count: 8, life: 0.25 });
}

function damageWeaponHit(game, enemy, amount, slows = false, from = game.player) {
  damageEnemy(game, enemy, amount, slows, from, onHitDamageOf(game));
  const resonator = relic(game, 'resonator');
  if (!resonator) { enemy.resonatorHits = 0; return; }
  if (enemy.dead) return;
  enemy.resonatorHits = (enemy.resonatorHits ?? 0) + 1;
  if (enemy.resonatorHits >= resonator.everyHits) {
    enemy.resonatorHits = 0;
    damageEnemy(game, enemy, 0, false, from, flatDamageOf(game) * resonator.flatPulse, { hitEffects: false, canCrit: false });
    addEffect(game, { type: 'ring', x: enemy.x, y: enemy.y, radius: 32, color: 'spark', life: 0.2, sound: 'impact' });
  }
}

// 지속 피해도 치명타 피해는 받지만 타격 기절·빙결·성냥은 발동시키지 않는다.
function damageOverTime(game, enemy, amount, from = game.player, span = game.stepDt ?? 1 / 60) {
  if (enemy.dead || amount <= 0) return;
  let power = 1 + (relic(game, 'thermos')?.dotPower ?? 0);
  const amp = relic(game, 'concentrate');
  if (amp) {
    const start = game.time - span;
    if (enemy.dotLastAt == null || start - enemy.dotLastAt > amp.resetSec) enemy.dotStartedAt = start;
    enemy.dotLastAt = game.time;
    // 프레임 구간의 평균 충전율을 써서 30·60·120 FPS에 같은 총 피해를 준다.
    const rampArea = age => age <= 0 ? 0 : age < amp.rampSec ? age * age / (2 * amp.rampSec) : age - amp.rampSec / 2;
    const average = span > 0 ? (rampArea(game.time - enemy.dotStartedAt) - rampArea(start - enemy.dotStartedAt)) / span : 0;
    power *= 1 + amp.power * average;
  }
  damageEnemy(game, enemy, amount * power, false, from, 0, { hitEffects: false, showHit: false });
}

function freezeOnHit(game, enemy, duration) {
  if (!duration || enemy.boss || game.time < (enemy.hitFreezeReadyAt ?? -Infinity)) return;
  enemy.chillUntil = game.time + duration;
  enemy.hitFreezeReadyAt = enemy.chillUntil + HIT_FREEZE.recoverySec;
}

export function damageEnemy(game, enemy, amount, slows = false, from = game.player, flatBonus = 0, { showHit = true, hitEffects = true, canCrit = true } = {}) {
  if (enemy.dead) return;
  // 치명타. 확률이 없으면 난수를 쓰지 않는다.
  // 치명 5점: 보스와 정예에게는 확률이 더 높다(고무망치가 있으면 치명타가 없으니 빼고).
  const weakSpot = (enemy.boss || enemy.elite) && !relic(game, 'mallet') ? perk(game, 'crit', 5)?.eliteCrit ?? 0 : 0;
  const chance = critChanceOf(game, weakSpot);
  const crit = canCrit && chance > 0 && game.random() < chance;
  if (crit) amount *= critDamageOf(game);
  amount += flatBonus;
  let freezeSec = hitEffects && crit && perk(game, 'crit', 20) ? BUILD.crit.perks[20].stun : 0;
  if (enemy.boss) amount *= 1 + (relic(game, 'lamp')?.bossDamage ?? 0);
  enemy.hp -= amount;
  // 얼음틀: 한 대씩 때리는 공격만 얼린다(매 순간 조금씩 닿는 공격은 빼고).
  const ice = relic(game, 'icetray');
  if (hitEffects && ice && !enemy.boss && amount >= 3 && game.random() < ice.chance) freezeSec = Math.max(freezeSec, ice.freezeSec);
  freezeOnHit(game, enemy, freezeSec);
  // 성냥: 한 대씩 때리는 공격에 가끔 불이 붙는다.
  const match = relic(game, 'match');
  if (hitEffects && match && amount >= 3 && game.random() < match.chance) {
    enemy.burnUntil = game.time + match.burnSec;
    enemy.burnDps = Math.max(enemy.burnDps ?? 0, relicDamage(game, match.dps));
  }
  enemy.hitFlash = 0.1;
  if (showHit && amount >= 6) {
    addEffect(game, { type: 'number', x: enemy.x + (game.random() - 0.5) * 14, y: enemy.y - enemy.radius, value: Math.round(amount),
      life: crit ? 0.8 : 0.6, crit });
    if (crit) addEffect(game, { type: 'burst', x: enemy.x, y: enemy.y - enemy.radius, color: 'crit', count: 6, life: 0.35 });
    addEffect(game, { type: 'burst', x: enemy.x, y: enemy.y, color: enemy.kind, count: 3, life: 0.3 });
  }
  if (slows && !enemy.boss) {
    enemy.hitSlowUntil = Math.max(enemy.hitSlowUntil ?? 0, game.time + HIT_SLOW.durationSec);
  }
  if (enemy.hp <= 0) {
    killEnemy(game, enemy);
    if (crit) critBlast(game, enemy, amount);
  }
  if (crit) critBlast(game, enemy, amount, true);
}

function dropGem(game, x, y, value) {
  if (game.gems.length > 450) {
    const target = game.gems[Math.floor(game.random() * game.gems.length)];
    target.value += value;
    return;
  }
  game.gems.push({ x, y, value, pulled: false });
}

function killEnemy(game, enemy) {
  enemy.dead = true;
  game.kills += 1;
  if (enemy.kind === 'milk' && !enemy.exploded) {
    // 상한 우유는 쓰러져도 터진다. 이미 부풀던 중이면 그 폭발이 그대로 터지고, 아니면 잠시 뒤 그 자리에서 터진다.
    const base = ENEMIES.milk;
    enemy.exploded = true;
    if (!enemy.fuseAt) {
      game.hazards.push({ x: enemy.x, y: enemy.y, radius: base.blastRadius, delay: base.deathFuseSec, total: base.deathFuseSec,
        damage: base.blastDamage * difficultyAt(game.time).damage * (enemy.elite ? ELITE.damage : 1), blast: true });
    }
  }
  const popcorn = relic(game, 'popcorn');
  // 팝콘 기계: 터진 팝콘이 또 터지는 건 두 번까지만 이어진다.
  if (popcorn && (game.popDepth ?? 0) < 2 && game.random() < popcorn.chance) {
    game.popDepth = (game.popDepth ?? 0) + 1;
    const damage = relicDamage(game, popcorn.damage);
    const popReach = relicReach(game, popcorn.radius);
    addEffect(game, { type: 'ring', x: enemy.x, y: enemy.y, radius: popReach, color: 'gold', life: 0.3 });
    addEffect(game, { type: 'burst', x: enemy.x, y: enemy.y, color: 'popcorn', count: 10, life: 0.4 });
    for (const other of near(game, enemy.x, enemy.y, popReach)) {
      if (other !== enemy && !other.dead && distance(other, enemy) < popReach + other.radius) damageEnemy(game, other, damage, true, enemy);
    }
    game.popDepth -= 1;
  }
  const pin = relic(game, 'clothespin');
  if (pin && !enemy.boss && game.pins.length < pin.max && game.random() < pin.chance) {
    // 빨래집게: 쓰러진 자리에 집게를 남기고, 적이 밟으면 콱 문다.
    game.pins.push({ x: enemy.x, y: enemy.y, life: pin.lifeSec });
  }
  dropGem(game, enemy.x, enemy.y, enemy.xp);
  addEffect(game, { type: 'pop', x: enemy.x, y: enemy.y, radius: enemy.radius, life: 0.3 });
  addEffect(game, { type: 'burst', x: enemy.x, y: enemy.y, color: enemy.kind, count: enemy.boss ? 40 : 7,
    life: enemy.boss ? 0.9 : 0.45, big: enemy.boss });
  if (enemy.boss) {
    addEffect(game, { type: 'flash', life: 0.4 });
    addEffect(game, { type: 'ring', x: enemy.x, y: enemy.y, radius: 160, color: 'gold', life: 0.6 });
    game.shake = 0.5;
  }
  if (enemy.kind === 'trash') {
    for (let index = 0; index < 2; index += 1) {
      spawnEnemy(game, 'scrap', enemy.x + (index ? 12 : -12), enemy.y + (game.random() - 0.5) * 12);
    }
  }
  if (enemy.kind === 'garbageGiant') {
    for (let index = 0; index < enemy.stats.splitInto; index += 1) {
      const angle = (index / enemy.stats.splitInto) * Math.PI * 2;
      spawnEnemy(game, 'trash', enemy.x + Math.cos(angle) * 50, enemy.y + Math.sin(angle) * 50);
    }
  }
  if (enemy.kind === 'mold') {
    game.slimes.push({ x: enemy.x, y: enemy.y, radius: ENEMIES.mold.slimeRadius, life: ENEMIES.mold.slimeSec });
  }
  if (enemy.boss) {
    game.drops.push({ type: 'chest', x: enemy.x, y: enemy.y });
    addEffect(game, { type: 'banner', text: `${enemy.label} 처치! 보물상자를 주워요`, life: 2.4 });
    return;
  }
  for (const [type, drop] of Object.entries(DROPS)) {
    // 같은 종류가 이미 맵에 가득 떨어져 있으면 그 아이템은 건너뛴다.
    if (game.drops.filter((item) => item.type === type).length >= DROP_LIMIT) continue;
    if (game.random() < drop.chance * (enemy.elite ? ELITE.drop : 1) * 1) {
      game.drops.push({ type, x: enemy.x, y: enemy.y });
      break;
    }
  }
}

function slow(game, enemy, factor) {
  if (!factor || enemy.boss) return;
  enemy.slowUntil = game.time + 0.25;
  enemy.slowBy = factor;
}

function evolution(game, id) {
  return game.evolved[id] ? EVOLUTIONS[id] : null;
}

function fusion(game, id) {
  return game.fusions[id] ? FUSIONS[id] : null;
}

// 재료 무기는 보관하되, 합체 공격을 담당하는 한 경로만 작동한다.
const recipesByWeapon = Object.fromEntries(Object.keys(WEAPONS).map(id => [id,
  Object.keys(FUSIONS).filter(fusionId => FUSIONS[fusionId].from.includes(id))]));
const fusionForWeapon = (game, id) => recipesByWeapon[id]?.find(fusionId => game.fusions[fusionId]);
export const inFusion = (game, id) => Boolean(fusionForWeapon(game, id));
export function activeWeapon(game, id) {
  const owner = fusionForWeapon(game, id);
  return Boolean(game.weapons[id]) && (!owner || FUSIONS[owner].primary === id);
}

function weaponValue(game, id, key) {
  const scale = evolution(game, id)?.[key];
  const might = key === 'damage' || key === 'dps' ? mightOf(game) * weaponDamageScaleOf(game) : 1;
  const owner = fusionForWeapon(game, id);
  const fusionPower = owner && (key === 'damage' || key === 'dps') ? FUSIONS[owner].power : 1;
  // 고정 피해는 한 대씩 때리는 무기(damage)에만 붙는다. 계속 닿는 무기(dps)는 빼야 매 순간 더해지지 않는다.
  const flat = key === 'damage' ? malletDamageOf(game) : 0;
  const echo = key === 'damage' && game.echoing === id ? RELICS.twin.echoDamage : 1;
  const summonPower = WEAPONS[id].summon && (key === 'damage' || key === 'dps') ? statsOf(game).summonPower : 1;
  return (WEAPONS[id][key][game.weapons[id] - 1] * might
    * (typeof scale === 'number' && key !== 'count' && key !== 'chains' ? scale : 1) + flat) * echo * fusionPower * summonPower;
}

function nearestEnemies(game, count, maxDistance = 560) {
  return game.enemies
    .filter((enemy) => !enemy.dead && distance(enemy, game.player) < maxDistance)
    .sort((a, b) => distance(a, game.player) - distance(b, game.player))
    .slice(0, count);
}

function ready(game, id, dt) {
  const fusionCooldown = id === 'stapler' ? fusion(game, 'poisongun')?.cooldownScale ?? 1 : 1;
  const cooldown = WEAPONS[id].cooldown[game.weapons[id] - 1] * statsOf(game).cooldownScale * fusionCooldown;
  game.cooldowns[id] = (game.cooldowns[id] ?? 0) - dt;
  if (game.cooldowns[id] > 0) return false;
  const twin = relic(game, 'twin');
  if (twin?.weapons.includes(id)) {
    // 쌍둥이 노즐: 쏘고 나서 잠깐 뒤에 한 번 더 쏜다.
    game.echoes ??= {};
    const gap = Math.min(twin.echoSec, cooldown / 2);
    game.echoes[id] = !game.echoes[id];
    game.cooldowns[id] = game.echoes[id] ? gap : cooldown - gap;
    // 두 번째 발사는 피해가 줄어든다. 바로 뒤에 이 무기가 피해를 계산할 때 쓴다.
    game.echoing = game.echoes[id] ? null : id;
    return true;
  }
  game.cooldowns[id] = cooldown;
  game.echoing = null;
  return true;
}

export function coilOrbs(game) {
  const level = game.weapons.coil;
  if (!level || !activeWeapon(game, 'coil')) return [];
  const count = WEAPONS.coil.count[level - 1];
  const orbit = WEAPONS.coil.orbit[level - 1] * statsOf(game).area;
  const ringAt = (radius, total, spin) => Array.from({ length: total }, (_, index) => {
    const angle = game.time * spin + (index / total) * Math.PI * 2;
    return { x: game.player.x + Math.cos(angle) * radius, y: game.player.y + Math.sin(angle) * radius };
  });
  const outer = evolution(game, 'coil')?.outer;
  const fire = fusion(game, 'firering');
  const { spin } = WEAPONS.coil;
  if (fire) return ringAt(orbit * fire.outer, count + 5, 1.6 * attackTempoOf(game));
  return [...ringAt(orbit, count, spin), ...(outer ? ringAt(orbit * outer, count + 2, -spin * 0.75) : [])];
}

// 회전 톱날의 지금 위치. 궤도가 넓어졌다 좁아졌다 하며 화면을 크게 돈다.
// 도탄 톱날의 지금 위치와 크기(그리기용)
export function sawBlades(game) {
  const saw = fusion(game, 'sawblade');
  if (!saw) return [];
  const { area, projectile } = statsOf(game);
  return (game.saws ?? []).map((blade) => ({ ...blade, radius: Math.min(saw.maxRadius, saw.radius * area * projectile) }));
}

// 도탄 톱날: 가까운 적에게 날아가 베고, 근처의 다른 적에게 튕긴다. 튕길 곳이 없거나 다 튕기면 오리에게 돌아온다.
function updateSaws(game, dt) {
  const saw = fusion(game, 'sawblade');
  if (!saw) {
    game.saws = [];
    return;
  }
  const { player } = game;
  const { area, projectile } = statsOf(game);
  const radius = Math.min(saw.maxRadius, saw.radius * area * projectile);
  const speed = saw.speed * attackTempoOf(game);
  const damage = weaponValue(game, 'roller', 'damage') * saw.damage;
  game.saws ??= [];
  while (game.saws.length < saw.count) {
    game.saws.push({ id: game.nextId++, x: player.x, y: player.y, vx: 0, vy: 0, bounces: saw.bounces, target: null, returning: false, last: null });
  }
  game.saws.forEach((blade, index) => {
    // 같은 적을 여러 톱날이 쫓지 않게 하고, 방금 벤 적에게는 다시 튕기지 않는다.
    const taken = new Set(game.saws.filter((other) => other !== blade).map((other) => other.target?.id));
    const pick = (from, reach) => {
      let best = null;
      let bestGap = reach;
      for (const enemy of near(game, from.x, from.y, reach)) {
        if (enemy.dead || enemy.id === blade.last || taken.has(enemy.id)
          || game.time - (enemy.sawHitAt ?? -9) < saw.hitEverySec) continue;
        const gap = distance(enemy, from);
        if (gap < bestGap) {
          bestGap = gap;
          best = enemy;
        }
      }
      return best;
    };
    if (blade.target && (blade.target.dead || game.time - (blade.target.sawHitAt ?? -9) < saw.hitEverySec)) blade.target = null;
    if (!blade.returning && !blade.target) blade.target = pick(player, saw.seek * area);
    let goal;
    if (blade.returning) goal = player;
    else if (blade.target) goal = blade.target;
    else {
      // 쫓을 적이 없으면 오리 곁을 돈다.
      const angle = game.time * 3 + (index / saw.count) * Math.PI * 2;
      goal = { x: player.x + Math.cos(angle) * saw.idleOrbit, y: player.y + Math.sin(angle) * saw.idleOrbit };
    }
    const gap = distance(blade, goal) || 1;
    const step = Math.min(gap, speed * dt);
    blade.vx = ((goal.x - blade.x) / gap) * speed;
    blade.vy = ((goal.y - blade.y) / gap) * speed;
    blade.x += ((goal.x - blade.x) / gap) * step;
    blade.y += ((goal.y - blade.y) / gap) * step;
    if (blade.returning && distance(blade, player) < 20) {
      blade.returning = false;
      blade.bounces = saw.bounces;
      blade.last = null;
      return;
    }
    if (!blade.target || distance(blade, blade.target) > radius + blade.target.radius) return;
    // 베고, 피를 흘리게 하고, 다음 적에게 튕긴다.
    const victim = blade.target;
    victim.sawHitAt = game.time;
    damageWeaponHit(game, victim, damage, true, blade);
    victim.bleedUntil = game.time + saw.bleedSec;
    victim.bleedDps = Math.max(victim.bleedDps ?? 0, damage * saw.bleed);
    addEffect(game, { type: 'slash', x: blade.x, y: blade.y, angle: Math.atan2(blade.vy, blade.vx), life: 0.22 });
    blade.last = victim.id;
    blade.bounces -= 1;
    blade.target = blade.bounces > 0 ? pick(blade, saw.hop * area) : null;
    if (!blade.target) blade.returning = true;
  });
  for (const enemy of game.enemies) {
    if (enemy.dead || (enemy.bleedUntil ?? 0) <= game.time) continue;
    damageOverTime(game, enemy, enemy.bleedDps * dt);
  }
}

// 회전 대신 한 지점에 방향을 고정해 충전 → 3초 발사 → 대기를 반복한다.
function updateMegaLaser(game, dt) {
  const mega = fusion(game, 'spinlaser');
  const { area, projectile } = statsOf(game);
  const makeCharge = () => {
    const target = nearestEnemies(game, 1, mega.length)[0];
    const angle = target ? Math.atan2(target.y - game.player.y, target.x - game.player.x)
      : game.player.heading ?? (game.player.facing > 0 ? 0 : Math.PI);
    const beam = { x: game.player.x, y: game.player.y, angle, length: mega.length,
      width: Math.min(mega.maxWidth, mega.width * area * projectile), phase: 'charge', remaining: mega.chargeSec };
    addEffect(game, { type: 'ring', x: beam.x, y: beam.y, radius: 32, color: 'spark', life: 0.35, sound: 'laserCharge' });
    return beam;
  };
  const strike = (beam, amount, impact, span = game.stepDt) => {
    const dx = Math.cos(beam.angle), dy = Math.sin(beam.angle);
    for (const enemy of game.enemies) {
      if (enemy.dead) continue;
      const rx = enemy.x - beam.x, ry = enemy.y - beam.y;
      const along = rx * dx + ry * dy;
      // 빔의 그림과 같은 시작점/너비로 판정한다. 오리 뒤쪽에는 닿지 않는다.
      if (along < 16 - enemy.radius || along > beam.length + enemy.radius
        || Math.abs(rx * dy - ry * dx) > beam.width / 2 + enemy.radius) continue;
      if (impact) damageWeaponHit(game, enemy, amount, true, beam);
      else damageOverTime(game, enemy, amount, beam, span);
    }
  };
  let beam = game.megaLaser ??= makeCharge();
  let left = dt;
  while (left > 1e-9) {
    const spent = Math.min(left, beam.remaining);
    if (beam.phase === 'fire') {
      // 지속 피해를 dt로 적분한다. 매 프레임 피해 숫자·파편을 만들거나 고정 피해를 반복 가산하지 않는다.
      strike(beam, weaponValue(game, 'laser', 'damage') * mega.dps * spent, false, spent);
    }
    beam.remaining -= spent;
    left -= spent;
    if (beam.remaining > 1e-9) break;
    if (beam.phase === 'charge') {
      beam.phase = 'fire';
      beam.remaining = mega.durationSec;
      strike(beam, weaponValue(game, 'laser', 'damage') * mega.impact, true);
      addEffect(game, { type: 'ring', x: beam.x, y: beam.y, radius: beam.width * 0.7, color: 'spark', life: 0.4, sound: 'laserBlast' });
      addEffect(game, { type: 'flash', life: 0.16 });
      game.shake = Math.max(game.shake, 0.55);
    } else if (beam.phase === 'fire') {
      beam.phase = 'cooldown';
      beam.remaining = mega.restSec * statsOf(game).cooldownScale;
    } else {
      beam = game.megaLaser = makeCharge();
    }
  }
}

// 용 한 마리의 몸통을 이어 붙이며 길이와 타격 판정을 갱신한다.
function updateDragon(game, unit, lengthCount, range, speed, damage, dt) {
  const weapon = WEAPONS.toydragon, evolved = evolution(game, 'toydragon'), stats = statsOf(game);
  unit.evolved = Boolean(evolved);
  const parts = weapon.segments + (lengthCount - 1) * weapon.segmentsPerCount;
  const spacing = weapon.spacing * (evolved?.size ?? 1);
  if (distance(unit, game.player) > weapon.recall) {
    unit.x = game.player.x; unit.y = game.player.y; unit.spine = [];
  }
  unit.spine ??= [];
  unit.spine.length = Math.min(unit.spine.length, parts);
  while (unit.spine.length < parts) {
    const tail = unit.spine.at(-1) ?? unit;
    unit.spine.push({ x: clamp(tail.x - Math.cos(unit.angle) * spacing, PLAYER.radius, ARENA.width - PLAYER.radius),
      y: clamp(tail.y - Math.sin(unit.angle) * spacing, PLAYER.radius, ARENA.height - PLAYER.radius) });
  }
  let target = null, best = range;
  for (const enemy of near(game, game.player.x, game.player.y, range + 100)) {
    if (enemy.dead || distance(enemy, game.player) > range + 100 || distance(unit, game.player) > weapon.roam) continue;
    const gap = distance(enemy, unit);
    if (gap < best) { best = gap; target = enemy; }
  }
  const center = target ?? game.player;
  const phase = game.time * (target ? 1.4 : 0.9) + unit.id;
  const radius = target ? weapon.circleRadius : weapon.circleRadius * 1.4;
  const goal = { x: center.x + Math.cos(phase) * radius, y: center.y + Math.sin(phase) * radius };
  const desired = Math.atan2(goal.y - unit.y, goal.x - unit.x);
  const turn = Math.atan2(Math.sin(desired - unit.angle), Math.cos(desired - unit.angle));
  // 고공속에도 선회 반경이 커져 화면 밖으로 날아가지 않도록 회전도 이동 속도에 맞춘다.
  const turnSpeed = Math.max(weapon.turnSpeed, speed / (weapon.circleRadius * 0.65));
  unit.angle += clamp(turn, -turnSpeed * dt, turnSpeed * dt);
  const previous = [{ x: unit.x, y: unit.y }, ...unit.spine.map(point => ({ ...point }))];
  const x = unit.x + Math.cos(unit.angle) * speed * dt, y = unit.y + Math.sin(unit.angle) * speed * dt;
  unit.x = clamp(x, PLAYER.radius, ARENA.width - PLAYER.radius);
  unit.y = clamp(y, PLAYER.radius, ARENA.height - PLAYER.radius);
  if (x !== unit.x || y !== unit.y) unit.angle += Math.PI / 2;
  let ahead = unit;
  for (const point of unit.spine) {
    const gap = distance(ahead, point);
    if (gap > spacing) {
      point.x = ahead.x + (point.x - ahead.x) / gap * spacing;
      point.y = ahead.y + (point.y - ahead.y) / gap * spacing;
    }
    ahead = point;
  }
  const hitEvery = weapon.hitEverySec / attackTempoOf(game) / stats.summonHaste;
  const hitRadius = weapon.radius * stats.area * (evolved?.size ?? 1);
  // 마디마다 때리는 대신 용 전체가 같은 적을 주기당 한 번만 때린다.
  [unit, ...unit.spine].forEach((point, index) => {
    for (const { enemy } of sweepHits(game, previous[index], point, hitRadius)) {
      if (game.time - (enemy.dragonHitAt ?? -Infinity) < hitEvery) continue;
      enemy.dragonHitAt = game.time;
      damageWeaponHit(game, enemy, damage, true, unit);
      unit.muzzleUntil = game.time + 0.1;
    }
  });
}

function updateSummons(game, dt) {
  const stats = statsOf(game), player = game.player;
  const ids = Object.keys(game.weapons).filter(id => WEAPONS[id].summon && id !== 'robot');
  game.summons = game.summons.filter(unit => ids.includes(unit.weapon));
  for (const id of ids) {
    const weapon = WEAPONS[id], evolved = evolution(game, id);
    const lengthCount = (evolved?.count ?? weaponValue(game, id, 'count')) + stats.summonCount;
    const count = weapon.summon === 'dragon' ? 1 : lengthCount;
    const units = game.summons.filter(unit => unit.weapon === id).slice(0, count);
    game.summons = game.summons.filter(unit => unit.weapon !== id).concat(units);
    while (units.length < count) {
      const unit = { id: game.nextId++, weapon: id, x: player.x, y: player.y, angle: 0, attackIn: units.length * 0.12 };
      units.push(unit); game.summons.push(unit);
    }
    const range = weaponValue(game, id, 'range') * stats.summonRange;
    const speed = weaponValue(game, id, 'speed') * attackTempoOf(game) * stats.summonSpeed;
    const damage = weaponValue(game, id, 'damage');
    if (weapon.summon === 'dragon') { updateDragon(game, units[0], lengthCount, range, speed, damage, dt); continue; }
    const cooldown = weaponValue(game, id, 'cooldown') * stats.cooldownScale / stats.summonHaste;
    const move = (unit, goal, pace) => {
      const gap = distance(unit, goal);
      if (gap < 1) return;
      const step = Math.min(gap, pace * dt);
      unit.angle = Math.atan2(goal.y - unit.y, goal.x - unit.x);
      unit.x = clamp(unit.x + (goal.x - unit.x) / gap * step, PLAYER.radius, ARENA.width - PLAYER.radius);
      unit.y = clamp(unit.y + (goal.y - unit.y) / gap * step, PLAYER.radius, ARENA.height - PLAYER.radius);
    };
    units.forEach((unit, index) => {
      if (distance(unit, player) > 850) { unit.x = player.x; unit.y = player.y; unit.charging = false; unit.returning = false; }
      unit.evolved = Boolean(evolved);
      unit.attackIn = Math.max(0, unit.attackIn - dt);
      const melee = weapon.summon === 'melee' || weapon.summon === 'sword';
      const seek = melee ? weapon.seek * stats.summonRange : range;
      let target = null, best = Infinity;
      for (const enemy of near(game, player.x, player.y, seek + 100)) {
        if (enemy.dead || distance(enemy, player) > seek + 100) continue;
        const gap = distance(enemy, unit) + (enemy.id + index) % count * 25;
        if (distance(enemy, unit) <= seek && gap < best) { target = enemy; best = gap; }
      }
      const angle = game.time * 0.9 + index / count * Math.PI * 2 + ['sockpuppet','toydrone','windcar','plantspirit','toyknight'].indexOf(id) * 0.8;
      const orbit = weapon.summon === 'ranged' ? 76 : 56;
      const home = { x: player.x + Math.cos(angle) * orbit, y: player.y + Math.sin(angle) * orbit };
      if (weapon.summon === 'charge' && unit.charging) {
        const previous = { x: unit.x, y: unit.y };
        const step = Math.min(unit.chargeLeft, speed * 2.6 * dt);
        const x = unit.x + Math.cos(unit.angle) * step, y = unit.y + Math.sin(unit.angle) * step;
        unit.x = clamp(x, PLAYER.radius, ARENA.width - PLAYER.radius);
        unit.y = clamp(y, PLAYER.radius, ARENA.height - PLAYER.radius);
        unit.chargeLeft = x === unit.x && y === unit.y ? unit.chargeLeft - step : 0;
        const radius = weapon.radius * (evolved?.size ?? 1) * stats.area;
        for (const { enemy } of sweepHits(game, previous, unit, radius)) {
          if (unit.hit.has(enemy.id)) continue;
          unit.hit.add(enemy.id); damageWeaponHit(game, enemy, damage, true, unit);
        }
        if (unit.chargeLeft <= 0) {
          unit.charging = false; unit.returning = true;
          if (evolved?.blast) {
            const blast = evolved.blast * stats.area;
            for (const enemy of near(game, unit.x, unit.y, blast)) {
              if (!enemy.dead && distance(enemy, unit) <= blast + enemy.radius) damageWeaponHit(game, enemy, damage, true, unit);
            }
            addEffect(game, { type: 'ring', x: unit.x, y: unit.y, radius: blast, color: 'gold', life: 0.35, sound: 'impact' });
          }
        }
        return;
      }
      const flank = index / count * Math.PI * 2;
      const goal = melee && target ? { x: target.x + Math.cos(flank) * (target.radius + range * 0.35), y: target.y + Math.sin(flank) * (target.radius + range * 0.35) } : home;
      const regroup = unit.returning || distance(unit, player) > 180;
      move(unit, goal, regroup ? Math.max(speed, stats.speed * 1.35) : speed);
      if (unit.returning) { if (distance(unit, player) < 75) unit.returning = false; else return; }
      if (!target || unit.attackIn > 0) return;
      unit.angle = Math.atan2(target.y - unit.y, target.x - unit.x);
      if (weapon.summon === 'sword') {
        const reach = range * stats.area;
        if (distance(target, unit) > reach + target.radius) return;
        const arc = evolved?.arc ?? weapon.arc;
        for (const enemy of near(game, unit.x, unit.y, reach)) {
          if (enemy.dead) continue;
          const gap = distance(enemy, unit);
          const offset = Math.atan2(enemy.y - unit.y, enemy.x - unit.x) - unit.angle;
          const angle = Math.abs(Math.atan2(Math.sin(offset), Math.cos(offset)));
          const edge = Math.asin(Math.min(1, enemy.radius / Math.max(gap, 1)));
          if (gap <= reach + enemy.radius && angle <= arc / 2 + edge) damageWeaponHit(game, enemy, damage, true, unit);
        }
        // 검흔은 피해 판정을 남기지 않는 잔상이다. 적 하나당 한 번만 벤다.
        addEffect(game, { type: 'swordscar', x: unit.x, y: unit.y, angle: unit.angle, radius: reach, arc,
          life: evolved?.scarSec ?? weapon.scarSec, evolved: Boolean(evolved), sound: 'slash' });
      } else if (weapon.summon === 'melee') {
        if (distance(target, unit) > range + target.radius) return;
        const cleave = evolved?.cleave ? evolved.cleave * stats.area : 0;
        if (cleave) {
          for (const enemy of near(game, target.x, target.y, cleave)) {
            if (!enemy.dead && distance(enemy, target) <= cleave + enemy.radius) damageWeaponHit(game, enemy, damage, true, unit);
          }
        } else damageWeaponHit(game, target, damage, true, unit);
        addEffect(game, { type: 'slash', x: unit.x, y: unit.y, angle: unit.angle, life: 0.18, sound: 'slash' });
      } else if (weapon.summon === 'charge') {
        unit.charging = true; unit.chargeLeft = Math.min(range, distance(unit, target) + 60); unit.hit = new Set();
      } else {
        const shots = evolved?.shots ?? 1;
        for (let n = 0; n < shots; n++) {
          const angle = unit.angle + (n - (shots - 1) / 2) * 0.1;
          const seed = weapon.summon === 'artillery';
          game.shots.push({ weapon: id, kind: seed ? 'seed' : 'summon', x: unit.x, y: unit.y,
            vx: Math.cos(angle) * weapon.bulletSpeed, vy: Math.sin(angle) * weapon.bulletSpeed,
            damage, life: (range + 100) / weapon.bulletSpeed, radius: (seed ? 6 : 4) * stats.projectile,
            scale: stats.projectile, hit: new Set(), pierce: evolved?.pierce ?? 0, slows: true,
            pop: seed ? weaponValue(game, id, 'radius') * stats.area : 0, popColor: 'teal', popSound: seed ? 'impact' : undefined });
        }
      }
      unit.attackIn = cooldown; unit.muzzleUntil = game.time + 0.12;
    });
  }
}

function fireWeapons(game, dt) {
  buildGrid(game);
  const { player } = game;
  const { area, projectile } = statsOf(game);
  // 독침 기관총으로 합체하면 살충제는 따로 뿌리지 않는다.
  if (activeWeapon(game, 'spray') && !game.fusions.poisongun && ready(game, 'spray', dt)) {
    const count = weaponValue(game, 'spray', 'count');
    const targets = nearestEnemies(game, count);
    for (let index = 0; index < count; index += 1) {
      const target = targets[index % Math.max(1, targets.length)];
      const angle = target
        ? Math.atan2(target.y - player.y, target.x - player.x) + (targets.length < count ? (index - 1) * 0.25 : 0)
        : (player.facing > 0 ? 0 : Math.PI) + (index - 1) * 0.25;
      const { speed, lifeSec } = WEAPONS.spray;
      game.shots.push({ weapon: 'spray', x: player.x, y: player.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        damage: weaponValue(game, 'spray', 'damage'), pierce: evolution(game, 'spray') ? 99 : weaponValue(game, 'spray', 'pierce'),
        life: lifeSec, radius: 7 * projectile, scale: projectile, hit: new Set(), mega: Boolean(evolution(game, 'spray')) });
    }
    const ringShots = evolution(game, 'spray')?.ring ?? 0;
    for (let index = 0; index < ringShots; index += 1) {
      const angle = (index / ringShots) * Math.PI * 2 + game.time;
      game.shots.push({ weapon: 'spray', x: player.x, y: player.y, vx: Math.cos(angle) * WEAPONS.spray.speed, vy: Math.sin(angle) * WEAPONS.spray.speed,
        damage: weaponValue(game, 'spray', 'damage'), pierce: 99, life: WEAPONS.spray.lifeSec, radius: 7 * projectile,
        scale: projectile, hit: new Set(), mega: true });
    }
  }
  if (activeWeapon(game, 'broom') && ready(game, 'broom', dt)) {
    const radius = weaponValue(game, 'broom', 'radius') * area;
    const damage = weaponValue(game, 'broom', 'damage');
    for (const enemy of near(game, player.x, player.y, radius)) {
      if (distance(enemy, player) < radius + enemy.radius) damageWeaponHit(game, enemy, damage, WEAPONS.broom.slows);
    }
    addEffect(game, { weapon: 'broom', type: 'sweep', x: player.x, y: player.y, radius, life: 0.28, facing: player.facing,
      mega: Boolean(evolution(game, 'broom')) });
    if (evolution(game, 'broom') && !game.broomEcho) {
      game.broomEcho = true;
      game.cooldowns.broom = 0.3;
    } else if (game.broomEcho) {
      game.broomEcho = false;
    }
  }
  if (activeWeapon(game, 'bleach') && ready(game, 'bleach', dt)) {
    const candidates = nearestEnemies(game, 12, 380);
    for (let index = 0; index < weaponValue(game, 'bleach', 'count'); index += 1) {
      const target = candidates.length > 0 ? candidates[Math.floor(game.random() * candidates.length)]
        : { x: player.x + (game.random() - 0.5) * 200, y: player.y + (game.random() - 0.5) * 200 };
      addEffect(game, { weapon: 'bleach', type: 'ring', x: target.x, y: target.y, radius: weaponValue(game, 'bleach', 'radius') * area,
        color: 'teal', life: 0.3 });
      game.puddles.push({ weapon: 'bleach', x: target.x, y: target.y, radius: weaponValue(game, 'bleach', 'radius') * area,
        dps: weaponValue(game, 'bleach', 'dps'), life: evolution(game, 'bleach')?.lifeSec ?? WEAPONS.bleach.lifeSec,
        maxLife: WEAPONS.bleach.lifeSec, slow: evolution(game, 'bleach')?.slow });
    }
  }
  if (activeWeapon(game, 'dehumidifier')) {
    const radius = weaponValue(game, 'dehumidifier', 'radius') * area;
    const damage = weaponValue(game, 'dehumidifier', 'dps') * dt;
    for (const enemy of near(game, player.x, player.y, radius)) {
      if (distance(enemy, player) > radius + enemy.radius) continue;
      damageOverTime(game, enemy, damage);
      slow(game, enemy, evolution(game, 'dehumidifier')?.slow);
    }
  }
  // 파리채 폭격기로 합체하면 파리채는 종이비행기를 따라서만 내려친다.
  if (activeWeapon(game, 'swatter') && !game.fusions.bomber && ready(game, 'swatter', dt)) {
    const targets = game.enemies
      .filter((enemy) => !enemy.dead && distance(enemy, player) < 420)
      .sort((a, b) => b.hp - a.hp)
      .slice(0, evolution(game, 'swatter')?.targets ?? 1);
    const radius = weaponValue(game, 'swatter', 'radius') * area;
    const damage = weaponValue(game, 'swatter', 'damage');
    for (const target of targets) {
      const center = { x: target.x, y: target.y };
      for (const enemy of near(game, center.x, center.y, radius)) {
        if (distance(enemy, center) < radius + enemy.radius) damageWeaponHit(game, enemy, damage, true, center);
      }
      addEffect(game, { weapon: 'swatter', type: 'swat', x: center.x, y: center.y, radius, life: 0.35, mega: Boolean(evolution(game, 'swatter')) });
    }
    if (targets.length === 0) game.cooldowns.swatter = 0.2;
  }
  if (activeWeapon(game, 'slipper') && ready(game, 'slipper', dt)) {
    const storm = evolution(game, 'slipper');
    const count = storm ? storm.count : weaponValue(game, 'slipper', 'count');
    const targets = nearestEnemies(game, count, 380);
    const target = targets[0];
    const baseAngle = target ? Math.atan2(target.y - player.y, target.x - player.x) : (player.facing > 0 ? 0 : Math.PI);
    for (let index = 0; index < count; index += 1) {
      const aimed = targets[index % Math.max(1, targets.length)];
      const angle = storm ? baseAngle + (index / count) * Math.PI * 2
        : aimed ? Math.atan2(aimed.y - player.y, aimed.x - player.x) : baseAngle + (index - (count - 1) / 2) * 0.3;
      const { speed, rangeSec } = WEAPONS.slipper;
      game.slippers.push({ x: player.x, y: player.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        damage: weaponValue(game, 'slipper', 'damage'), outFor: rangeSec, returning: false, radius: 10 * projectile,
        scale: projectile, target: storm ? null : aimed,
        spin: 0, hit: new Set() });
    }
    addEffect(game, { weapon: 'slipper', type: 'ring', x: player.x, y: player.y, radius: 20, color: 'ball', life: 0.18, sound: 'slash' });
  }
  if (activeWeapon(game, 'coil')) {
    const fire = fusion(game, 'firering');
    const damage = weaponValue(game, 'coil', 'damage') * (fire?.damage ?? 1);
    if (fire) {
      game.novaIn = (game.novaIn ?? 0) - dt;
      if (game.novaIn <= 0) {
        game.novaIn = fire.novaEverySec * statsOf(game).cooldownScale;
        const radius = fire.novaRadius * area;
        const burn = (weaponValue(game, 'dryer', 'dps') + weaponValue(game, 'coil', 'damage') * 0.8) * fire.nova;
        for (const enemy of game.enemies) {
          if (!enemy.dead && distance(enemy, player) < radius + enemy.radius) damageWeaponHit(game, enemy, burn, true);
        }
        addEffect(game, { weapon: 'coil', type: 'nova', x: player.x, y: player.y, radius, life: 0.55 });
        game.shake = Math.max(game.shake, 0.15);
      }
    }
    for (const orb of coilOrbs(game)) {
      for (const enemy of near(game, orb.x, orb.y, 11 * projectile)) {
        if (enemy.dead || distance(enemy, orb) > 11 * projectile + enemy.radius) continue;
        if (game.time - (enemy.coilHitAt ?? -9) < WEAPONS.coil.hitEverySec) continue;
        enemy.coilHitAt = game.time;
        damageWeaponHit(game, enemy, damage, true, orb);
      }
    }
  }
  if (activeWeapon(game, 'zapper') && ready(game, 'zapper', dt)) {
    const damage = weaponValue(game, 'zapper', 'damage');
    const points = [{ x: player.x, y: player.y }];
    const hit = new Set();
    let from = player;
    let reach = 300;
    const chains = evolution(game, 'zapper')?.chains ?? weaponValue(game, 'zapper', 'chains');
    for (let jump = 0; jump < chains; jump += 1) {
      let next = null;
      let best = reach;
      for (const enemy of near(game, from.x, from.y, reach)) {
        if (enemy.dead || hit.has(enemy.id)) continue;
        const gap = distance(enemy, from);
        if (gap < best) {
          best = gap;
          next = enemy;
        }
      }
      if (!next) break;
      hit.add(next.id);
      points.push({ x: next.x, y: next.y });
      damageWeaponHit(game, next, damage);
      from = next;
      reach = WEAPONS.zapper.jump * area * (evolution(game, 'zapper')?.jump ?? 1);
    }
    if (points.length > 1) addEffect(game, { weapon: 'zapper', type: 'bolt', points, life: 0.22, mega: Boolean(evolution(game, 'zapper')) });
    else game.cooldowns.zapper = 0.2;
  }
  if (activeWeapon(game, 'detergent') && ready(game, 'detergent', dt)) {
    const count = weaponValue(game, 'detergent', 'count') * (evolution(game, 'detergent') ? 2 : 1);
    const { speed, lifeSec } = WEAPONS.detergent;
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2 + game.random() * 0.8;
      const pace = speed * (0.7 + game.random() * 0.6);
      game.shots.push({ weapon: 'detergent', x: player.x, y: player.y, vx: Math.cos(angle) * pace, vy: Math.sin(angle) * pace,
        damage: weaponValue(game, 'detergent', 'damage'), pierce: 0, life: lifeSec, radius: 9 * projectile, scale: projectile,
        hit: new Set(), kind: 'bubble',
        pop: weaponValue(game, 'detergent', 'radius') * area, mega: Boolean(evolution(game, 'detergent')), seed: game.nextId++ });
    }
  }
  if (activeWeapon(game, 'roller') && ready(game, 'roller', dt)) {
    const { speed, lifeSec } = WEAPONS.roller;
    const target = nearestEnemies(game, 1, speed * lifeSec)[0];
    const forward = target ? Math.atan2(target.y - player.y, target.x - player.x)
      : player.heading ?? (player.facing > 0 ? 0 : Math.PI);
    for (const angle of evolution(game, 'roller') ? [forward, forward + Math.PI] : [forward]) {
      game.shots.push({ weapon: 'roller', sound: 'roll', x: player.x, y: player.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        damage: weaponValue(game, 'roller', 'damage'), pierce: 999, life: lifeSec, radius: weaponValue(game, 'roller', 'size') * area * projectile,
        hit: new Set(), kind: 'roller', slows: true, mega: Boolean(evolution(game, 'roller')) });
    }
  }
  if (activeWeapon(game, 'dryer')) {
    const range = weaponValue(game, 'dryer', 'range') * area;
    // 물티슈가 바람이 퍼지는 폭도 넓힌다.
    const spread = Math.min(1.3, (evolution(game, 'dryer')?.wide ?? WEAPONS.dryer.spread) * area);
    const damage = weaponValue(game, 'dryer', 'dps') * dt;
    const nearest = nearestEnemies(game, 1, range + 40)[0];
    const locked = game.dryerTarget;
    const target = locked && !locked.dead && distance(locked, player) <= range + 40
      && (!nearest || distance(nearest, player) >= distance(locked, player) * 0.75) ? locked : nearest;
    game.dryerTarget = target;
    const wanted = target ? Math.atan2(target.y - player.y, target.x - player.x) : (player.facing > 0 ? 0 : Math.PI);
    const current = game.dryerAngle ?? wanted;
    const turn = Math.atan2(Math.sin(wanted - current), Math.cos(wanted - current));
    game.dryerAngle = current + clamp(turn, -WEAPONS.dryer.turn * dt, WEAPONS.dryer.turn * dt);
    if (target && !game.dryerOn) addEffect(game, { weapon: 'dryer', type: 'ring', x: player.x, y: player.y, radius: 18, color: 'gold', life: 0.18, sound: 'roll' });
    game.dryerOn = Boolean(target);
    game.dryerRange = range;
    game.dryerSpread = spread;
    if (target) {
      for (const enemy of game.enemies) {
        if (enemy.dead || distance(enemy, player) > range + enemy.radius) continue;
        const toEnemy = Math.atan2(enemy.y - player.y, enemy.x - player.x);
        const diff = Math.abs(Math.atan2(Math.sin(toEnemy - game.dryerAngle), Math.cos(toEnemy - game.dryerAngle)));
        if (diff < spread) damageOverTime(game, enemy, damage);
      }
    }
  }
  if (activeWeapon(game, 'fan') && ready(game, 'fan', dt)) {
    const cone = Math.min(1.6, WEAPONS.fan.cone * area);
    const range = weaponValue(game, 'fan', 'range') * area;
    const damage = weaponValue(game, 'fan', 'damage');
    const target = nearestEnemies(game, 1, range)[0];
    const angle = target ? Math.atan2(target.y - player.y, target.x - player.x) : (player.facing > 0 ? 0 : Math.PI);
    for (const enemy of game.enemies) {
      const gap = distance(enemy, player);
      if (enemy.dead || gap > range + enemy.radius) continue;
      const toEnemy = Math.atan2(enemy.y - player.y, enemy.x - player.x);
      const diff = Math.abs(Math.atan2(Math.sin(toEnemy - angle), Math.cos(toEnemy - angle)));
      if (diff < cone + Math.asin(Math.min(1, enemy.radius / Math.max(1, gap))) || evolution(game, 'fan')) damageWeaponHit(game, enemy, damage, WEAPONS.fan.slows);
    }
    addEffect(game, { weapon: 'fan', type: 'gust', x: player.x, y: player.y, angle, range, cone, life: 0.35,
      mega: Boolean(evolution(game, 'fan')) });
  }
  if (activeWeapon(game, 'laser') && fusion(game, 'spinlaser')) {
    updateMegaLaser(game, dt);
  } else if (activeWeapon(game, 'laser') && ready(game, 'laser', dt)) {
    const show = evolution(game, 'laser');
    const count = show ? show.count : weaponValue(game, 'laser', 'count');
    const width = weaponValue(game, 'laser', 'width') * area * projectile;
    const damage = weaponValue(game, 'laser', 'damage');
    const { length } = WEAPONS.laser;
    const targets = nearestEnemies(game, count, length);
    const base = player.heading ?? (player.facing > 0 ? 0 : Math.PI);
    const hitCounts = new Map();
    for (let index = 0; index < count; index += 1) {
      const target = targets[index % Math.max(1, targets.length)];
      const angle = target ? Math.atan2(target.y - player.y, target.x - player.x) : base + (index - (count - 1) / 2) * 0.18;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      for (const enemy of game.enemies) {
        if (enemy.dead || (hitCounts.get(enemy.id) ?? 0) >= (show?.maxHitsPerTarget ?? 1)) continue;
        const rx = enemy.x - player.x;
        const ry = enemy.y - player.y;
        const along = rx * dx + ry * dy;
        if (along < -enemy.radius || along > length) continue;
        if (Math.abs(rx * dy - ry * dx) < width / 2 + enemy.radius) {
          hitCounts.set(enemy.id, (hitCounts.get(enemy.id) ?? 0) + 1);
          damageWeaponHit(game, enemy, damage, true);
        }
      }
      addEffect(game, { weapon: 'laser', type: 'laser', x: player.x, y: player.y, angle, length, width, life: 0.34, mega: Boolean(show), focus: target ? { x: target.x, y: target.y } : null });
    }
    game.shake = Math.max(game.shake, 0.08);
  }
  if (activeWeapon(game, 'stapler') && ready(game, 'stapler', dt)) {
    const nailer = evolution(game, 'stapler');
    const forward = player.heading ?? (player.facing > 0 ? 0 : Math.PI);
    const { speed, lifeSec, spread } = WEAPONS.stapler;
    const venom = fusion(game, 'poisongun');
    const volleyId = venom ? game.nextId++ : null;
    const sides = venom ? Array.from({ length: venom.shots }, (_, index) => index - (venom.shots - 1) / 2) : nailer ? [-1, 1] : [0];
    for (const side of sides) {
      const angle = forward + (venom ? side * venom.spread : 0) + (game.random() - 0.5) * 2 * spread;
      game.shots.push({ weapon: 'stapler',
        x: player.x + Math.cos(forward) * 12 - Math.sin(forward) * side * 7,
        y: player.y + Math.sin(forward) * 12 + Math.cos(forward) * side * 7,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, damage: weaponValue(game, 'stapler', 'damage') * (venom?.damage ?? 1),
        pierce: venom ? venom.pierce : nailer ? nailer.pierce : 0, life: lifeSec * (venom?.lifeScale ?? 1), radius: 5 * projectile, scale: projectile,
        homing: venom?.homing, speed, volleyId, volleyMaxHits: venom?.maxHitsPerTarget,
        poison: venom ? weaponValue(game, 'spray', 'damage') * venom.poison : 0,
        hit: new Set(), kind: 'staple', slows: true,
        mega: Boolean(nailer),
      });
    }
    game.staplerAt = game.time;
  }
  if (game.fusions.dryoven || game.relics.match) {
    for (const enemy of game.enemies) {
      enemy.burning = !enemy.dead && (enemy.burnUntil ?? 0) > game.time;
      if (enemy.burning) damageOverTime(game, enemy, enemy.burnDps * dt);
    }
  }
  if (game.fusions.poisongun) {
    for (const enemy of game.enemies) {
      enemy.poisoned = !enemy.dead && (enemy.poisonUntil ?? 0) > game.time;
      if (enemy.poisoned) damageOverTime(game, enemy, enemy.poisonDps * dt);
    }
  }
  if (activeWeapon(game, 'ball')) {
    const big = evolution(game, 'ball');
    const count = big ? big.count : weaponValue(game, 'ball', 'count');
    while (game.balls.length < count) {
      const target = nearestEnemies(game, count, 600)[game.balls.length % count];
      const angle = target ? Math.atan2(target.y - player.y, target.x - player.x) + (game.balls.length - (count - 1) / 2) * 0.2 : game.random() * Math.PI * 2;
      game.balls.push({ id: game.nextId++, x: player.x, y: player.y, dx: Math.cos(angle), dy: Math.sin(angle), bounce: 0 });
    }
    game.balls.length = count;
    const speed = weaponValue(game, 'ball', 'speed') * attackTempoOf(game);
    const radius = WEAPONS.ball.radius * (big?.size ?? 1) * area * projectile;
    const thunder = fusion(game, 'thunderball');
    const damage = weaponValue(game, 'ball', 'damage') * (thunder?.damage ?? 1);
    // 공은 지금 보이는 화면 가장자리에서 튕긴다. 오리가 움직이면 화면도 따라가므로 벽도 같이 움직인다.
    const halfW = (game.view?.halfW ?? 420) - radius;
    const halfH = (game.view?.halfH ?? 320) - radius;
    for (const ball of game.balls) {
      ball.radius = radius;
      ball.mega = Boolean(big);
      ball.bounce = Math.max(0, ball.bounce - dt);
      const previous = { x: ball.x, y: ball.y };
      ball.x += ball.dx * speed * dt;
      ball.y += ball.dy * speed * dt;
      const before = ball.dx * 2 + ball.dy;
      if (ball.x < player.x - halfW) { ball.x = player.x - halfW; ball.dx = Math.abs(ball.dx); }
      if (ball.x > player.x + halfW) { ball.x = player.x + halfW; ball.dx = -Math.abs(ball.dx); }
      if (ball.y < player.y - halfH) { ball.y = player.y - halfH; ball.dy = Math.abs(ball.dy); }
      if (ball.y > player.y + halfH) { ball.y = player.y + halfH; ball.dy = -Math.abs(ball.dy); }
      if (before !== ball.dx * 2 + ball.dy) {
        ball.bounce = 0.12;
        const target = game.enemies.filter(enemy => !enemy.dead
          && Math.abs(enemy.x - player.x) < halfW && Math.abs(enemy.y - player.y) < halfH)
          .sort((a, b) => distance(a, ball) - distance(b, ball))[0];
        if (target) {
          const gap = distance(target, ball) || 1;
          let dx = ball.dx * 0.65 + (target.x - ball.x) / gap * 0.35;
          let dy = ball.dy * 0.65 + (target.y - ball.y) / gap * 0.35;
          if (Math.abs(ball.x - player.x) >= halfW - 0.01) dx = Math.sign(ball.dx) * Math.abs(dx);
          if (Math.abs(ball.y - player.y) >= halfH - 0.01) dy = Math.sign(ball.dy) * Math.abs(dy);
          const length = Math.hypot(dx, dy) || 1;
          ball.dx = dx / length; ball.dy = dy / length;
        }
        addEffect(game, { type: 'burst', x: ball.x, y: ball.y, color: big ? 'gold' : 'ball', count: 5, life: 0.3, sound: 'bounce' });
      }
      if (thunder) {
        ball.thunder = true;
        ball.zapIn = (ball.zapIn ?? 0) - dt;
        const blast = ball.bounce === 0.12;
        if (ball.zapIn <= 0 || blast) {
          ball.zapIn = thunder.zapEverySec;
          const reach = (blast ? thunder.blast : thunder.range) * area;
          const struck = game.enemies
            .filter((enemy) => !enemy.dead && distance(enemy, ball) < reach + enemy.radius)
            .sort((a, b) => distance(a, ball) - distance(b, ball))
            .slice(0, blast ? 12 : thunder.targets);
          const zap = weaponValue(game, 'zapper', 'damage') * (blast ? thunder.blastDamage : thunder.zap);
          for (const enemy of struck) {
            addEffect(game, { type: 'bolt', points: [{ x: ball.x, y: ball.y }, { x: enemy.x, y: enemy.y }], life: 0.18, mega: true });
            damageWeaponHit(game, enemy, zap);
          }
          if (blast) addEffect(game, { type: 'ring', x: ball.x, y: ball.y, radius: reach, color: 'spark', life: 0.3 });
        }
      }
      for (const { enemy } of sweepHits(game, previous, ball, radius)) {
        enemy.ballHitAt ??= {};
        if (game.time - (enemy.ballHitAt[ball.id] ?? -9) < WEAPONS.ball.hitEverySec) continue;
        enemy.ballHitAt[ball.id] = game.time;
        damageWeaponHit(game, enemy, damage, true, ball);
      }
    }
  }
  if (activeWeapon(game, 'robot')) {
    const squad = evolution(game, 'robot');
    const summonStats = statsOf(game);
    const count = (squad ? squad.count : weaponValue(game, 'robot', 'count')) + summonStats.summonCount;
    while (game.robots.length < count) game.robots.push({ id: game.nextId++, x: player.x, y: player.y, angle: 0 });
    game.robots.length = count;
    const sanitizer = fusion(game, 'bleachbot');
    const speed = weaponValue(game, 'robot', 'speed') * (sanitizer?.speed ?? 1) * attackTempoOf(game) * summonStats.summonSpeed;
    const damage = weaponValue(game, 'robot', 'damage') * (sanitizer?.damage ?? 1);
    const reach = WEAPONS.robot.radius * area;
    game.robots.forEach((robot, index) => {
      const tether = distance(robot, player);
      if (tether > (squad?.recall ?? 620)) { robot.x = player.x; robot.y = player.y; robot.regrouping = false; }
      else if (squad && tether > squad.leash) robot.regrouping = true;
      if (squad && distance(robot, player) < squad.regroup) robot.regrouping = false;
      let target = null;
      let best = Infinity;
      const range = (squad?.range ?? 300) * summonStats.summonRange;
      const origin = squad ? robot : player;
      const seek = squad ? range * squad.seekScale : range;
      for (const enemy of near(game, origin.x, origin.y, seek)) {
        if (enemy.dead || distance(enemy, origin) > seek
          || (squad && distance(enemy, player) > squad.leash + range)) continue;
        const gap = distance(enemy, robot) + ((enemy.id + index) % count) * 60;
        if (gap < best) { best = gap; target = enemy; }
      }
      const idle = game.time * 1.6 + (index / count) * Math.PI * 2;
      const formation = { x: player.x + Math.cos(idle) * 56, y: player.y + Math.sin(idle) * 56 };
      let goal = target ?? formation;
      if (squad) {
        goal = formation;
        if (target && !robot.regrouping) {
          // 적과 사거리의 절반을 유지하며 좌우로 돌아 사격한다.
          const side = index % 2 ? -1 : 1;
          const angle = Math.atan2(robot.y - target.y, robot.x - target.x) + side * squad.strafeAngle;
          goal = { x: target.x + Math.cos(angle) * range * squad.keepRange,
            y: target.y + Math.sin(angle) * range * squad.keepRange };
          const away = distance(goal, player), roam = squad.leash - 40;
          if (away > roam) goal = { x: player.x + (goal.x - player.x) / away * roam,
            y: player.y + (goal.y - player.y) / away * roam };
        }
      }
      const gap = distance(goal, robot);
      if (gap > 2) {
        const pace = squad && robot.regrouping ? Math.max(speed, summonStats.speed * 1.35) : speed;
        const step = Math.min(gap, pace * dt);
        robot.x = clamp(robot.x + ((goal.x - robot.x) / gap) * step, PLAYER.radius, ARENA.width - PLAYER.radius);
        robot.y = clamp(robot.y + ((goal.y - robot.y) / gap) * step, PLAYER.radius, ARENA.height - PLAYER.radius);
        robot.angle = Math.atan2(goal.y - robot.y, goal.x - robot.x);
      }
      robot.busy = Boolean(target);
      robot.marine = Boolean(squad);
      robot.acid = Boolean(sanitizer);
      if (squad) {
        robot.fireIn = Math.max(0, (robot.fireIn ?? 0) - dt);
        robot.grenadeIn = Math.max(0, (robot.grenadeIn ?? squad.grenadeStartSec + index * 0.2) - dt);
        if (target && distance(target, robot) <= range + target.radius) {
          robot.angle = Math.atan2(target.y - robot.y, target.x - robot.x);
          const acid = sanitizer ? { everySec: sanitizer.impactEverySec, radius: sanitizer.radius * area,
            dps: weaponValue(game, 'bleach', 'dps') * sanitizer.dps * summonStats.summonPower, life: sanitizer.lifeSec, slow: sanitizer.slow } : null;
          if (robot.grenadeIn <= 0 && !game.shots.some(shot => shot.kind === 'grenade' && shot.owner === robot.id && shot.life > 0)) {
            robot.grenadeIn = squad.grenadeEverySec * summonStats.cooldownScale / summonStats.summonHaste;
            game.shots.push({ weapon: 'robot', kind: 'grenade', owner: robot.id, x: robot.x, y: robot.y,
              fromX: robot.x, fromY: robot.y, toX: target.x, toY: target.y, age: 0,
              flightSec: squad.grenadeFlightSec, life: squad.grenadeFlightSec + squad.grenadeFuseSec,
              arcHeight: squad.grenadeArc, blast: squad.grenadeRadius * area, damage: damage * squad.grenadePower,
              acid, sound: 'roll' });
          }
          if (robot.fireIn <= 0) {
            robot.fireIn = squad.fireEverySec * summonStats.cooldownScale / summonStats.summonHaste;
            for (let shot = 0; shot < squad.shots; shot += 1) {
              const angle = robot.angle + (shot - (squad.shots - 1) / 2) * 0.06;
              game.shots.push({ weapon: 'robot', x: robot.x, y: robot.y, vx: Math.cos(angle) * squad.bulletSpeed, vy: Math.sin(angle) * squad.bulletSpeed,
                speed: squad.bulletSpeed, damage, life: Math.max(squad.bulletLifeSec, (range + target.radius) / squad.bulletSpeed), radius: 4 * projectile, scale: projectile,
                pierce: squad.pierce, hit: new Set(), kind: 'marine', slows: true,
                acid });
            }
            robot.muzzleUntil = game.time + 0.08;
          }
        }
        return;
      }
      for (const enemy of near(game, robot.x, robot.y, reach)) {
        if (enemy.dead || distance(enemy, robot) > reach + enemy.radius) continue;
        if (game.time - (enemy.robotHitAt ?? -9) < WEAPONS.robot.hitEverySec / summonStats.summonHaste) continue;
        enemy.robotHitAt = game.time;
        damageWeaponHit(game, enemy, damage, true, robot);
      }
    });
  }
  updateSummons(game, dt);
  if (activeWeapon(game, 'towel') && ready(game, 'towel', dt)) {
    const beach = evolution(game, 'towel');
    const length = weaponValue(game, 'towel', 'length') * area;
    const height = WEAPONS.towel.height * area * (beach?.size ?? 1);
    const damage = weaponValue(game, 'towel', 'damage');
    const sides = beach || weaponValue(game, 'towel', 'count') >= 2 ? [1, -1] : [1];
    for (const side of sides) {
      const dir = player.facing * side;
      for (const enemy of game.enemies) {
        if (enemy.dead) continue;
        const along = (enemy.x - player.x) * dir;
        if (along > -10 && along < length + enemy.radius && Math.abs(enemy.y - player.y) < height / 2 + enemy.radius) {
          damageWeaponHit(game, enemy, damage, WEAPONS.towel.slows);
          if (!enemy.boss) {
            enemy.slowUntil = Math.max(enemy.slowUntil ?? 0, game.time + WEAPONS.towel.slowSec);
            enemy.slowBy = WEAPONS.towel.slow;
          }
        }
      }
      addEffect(game, { weapon: 'towel', type: 'towel', x: player.x, y: player.y, dir, length, height, life: 0.25, mega: Boolean(beach) });
    }
  }
  if (activeWeapon(game, 'paperplane') && ready(game, 'paperplane', dt)) {
    const crane = evolution(game, 'paperplane');
    const count = crane ? crane.count : weaponValue(game, 'paperplane', 'count');
    const { speed, turn, lifeSec } = WEAPONS.paperplane;
    const forward = player.heading ?? (player.facing > 0 ? 0 : Math.PI);
    for (let index = 0; index < count; index += 1) {
      const angle = forward + (index - (count - 1) / 2) * 0.5;
      game.shots.push({ weapon: 'paperplane', x: player.x, y: player.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        damage: weaponValue(game, 'paperplane', 'damage'), pierce: crane ? crane.pierce : 0, life: lifeSec, radius: 8 * projectile,
        bomb: fusion(game, 'bomber') ? { damage: weaponValue(game, 'swatter', 'damage') * FUSIONS.bomber.damage, radius: FUSIONS.bomber.radius * area } : null,
        scale: projectile, hit: new Set(), kind: 'plane', homing: turn, speed, slows: true, mega: Boolean(crane) });
    }
  }
  if (activeWeapon(game, 'mousetrap')) {
    const sticky = evolution(game, 'mousetrap');
    if (ready(game, 'mousetrap', dt)) {
      const { lifeSec, maxTraps } = WEAPONS.mousetrap;
      const count = weaponValue(game, 'mousetrap', 'count');
      const targets = nearestEnemies(game, count, 480);
      for (let index = 0; index < count; index += 1) {
        const target = targets[index % Math.max(1, targets.length)];
        const angle = target ? Math.atan2(target.y - player.y, target.x - player.x) + (targets.length === 1 ? (index - (count - 1) / 2) * 0.18 : 0)
          : (player.heading ?? 0) + (index / count) * Math.PI * 2;
        const reach = target ? Math.max(35, clamp(distance(target, player) - target.speed * 0.4, 35, 165) - index * 28)
          : 70 + index * 24;
        game.traps.push({ x: player.x + Math.cos(angle) * reach, y: player.y + Math.sin(angle) * reach, armIn: 0.4, armSec: 0.4, life: lifeSec,
          radius: weaponValue(game, 'mousetrap', 'radius') * area, damage: weaponValue(game, 'mousetrap', 'damage'), mega: Boolean(sticky) });
      }
      if (game.traps.length > maxTraps) game.traps.splice(0, game.traps.length - maxTraps);
    }
    for (const trap of game.traps) {
      trap.armIn -= dt;
      trap.life -= dt;
      if (trap.armIn > 0) continue;
      if (!near(game, trap.x, trap.y, trap.radius).some((enemy) => !enemy.dead && distance(enemy, trap) < trap.radius + enemy.radius * 0.6)) continue;
      // 탁! 덫 둘레의 적을 모두 문다.
      for (const enemy of near(game, trap.x, trap.y, trap.radius * 1.5)) {
        if (!enemy.dead && distance(enemy, trap) < trap.radius * 1.5 + enemy.radius) damageWeaponHit(game, enemy, trap.damage, true, trap);
      }
      addEffect(game, { weapon: 'mousetrap', type: 'slam', x: trap.x, y: trap.y, radius: trap.radius * 1.5, life: 0.3 });
      const foam = fusion(game, 'foammine');
      if (foam) {
        // 거품 지뢰: 여러 파편의 피해를 한 번의 큰 폭발로 모은다.
        for (let index = 0; index < foam.bubbles; index += 1) {
          const angle = (index / foam.bubbles) * Math.PI * 2;
          game.shots.push({ weapon: 'mousetrap', x: trap.x, y: trap.y, vx: Math.cos(angle) * 140, vy: Math.sin(angle) * 140,
            damage: weaponValue(game, 'detergent', 'damage') * foam.blast, pierce: 0, life: 1.4, radius: 9 * projectile, scale: projectile, hit: new Set(),
            kind: 'bubble', foamMine: true, pop: weaponValue(game, 'detergent', 'radius') * area, mega: true, seed: game.nextId++ });
        }
      }
      addEffect(game, { weapon: 'mousetrap', type: 'burst', x: trap.x, y: trap.y, color: 'trap', count: 8, life: 0.35 });
      trap.life = 0;
    }
    game.traps = game.traps.filter((trap) => trap.life > 0);
  }
  if (activeWeapon(game, 'microwave')) {
    if (ready(game, 'microwave', dt)) {
      const max = weaponValue(game, 'microwave', 'radius') * area;
      const oven = fusion(game, 'dryoven');
      // 건조 오븐이면 두 파동이 차례로 출발한다(r이 음수인 동안은 보이지 않는다).
      for (const start of oven ? Array.from({ length: oven.waves }, (_, index) => index ? -max * 0.4 * index : 8) : [8]) {
        game.waves.push({ x: player.x, y: player.y, r: start, max, speed: max / WEAPONS.microwave.growSec,
          damage: weaponValue(game, 'microwave', 'damage') * (oven?.damage ?? 1), hit: new Set(), mega: Boolean(evolution(game, 'microwave')), oven });
      }
      addEffect(game, { weapon: 'microwave', type: 'ring', x: player.x, y: player.y, radius: 28, color: 'gold', life: 0.22, sound: 'pulse' });
    }
    for (const wave of game.waves) {
      const previousRadius = wave.r;
      wave.r += wave.speed * dt;
      for (const enemy of game.enemies) {
        if (enemy.dead || wave.hit.has(enemy.id)) continue;
        const gap = distance(enemy, wave);
        if (wave.r > 0 && gap - enemy.radius < Math.min(wave.r, wave.max) && gap + enemy.radius > Math.max(0, previousRadius - 20)) {
          wave.hit.add(enemy.id);
          damageWeaponHit(game, enemy, wave.damage, true, wave);
          if (wave.oven && !enemy.boss) {
            enemy.slowUntil = game.time + FUSIONS.dryoven.burnSec;
            enemy.slowBy = FUSIONS.dryoven.slow;
          }
          if (wave.oven) {
            enemy.burnUntil = game.time + FUSIONS.dryoven.burnSec;
            enemy.burnDps = weaponValue(game, 'dehumidifier', 'dps') * FUSIONS.dryoven.burn;
          }
        }
      }
    }
    game.waves = game.waves.filter((wave) => wave.r < wave.max);
  }
  if (activeWeapon(game, 'shower')) {
    if (ready(game, 'shower', dt)) {
      const count = weaponValue(game, 'shower', 'count') * (evolution(game, 'shower')?.double ? 2 : 1);
      const nearby = game.enemies.filter((enemy) => !enemy.dead && distance(enemy, player) < 360);
      for (let index = 0; index < count; index += 1) {
        const target = nearby.length ? nearby[Math.floor(game.random() * nearby.length)]
          : { x: player.x + (game.random() - 0.5) * 400, y: player.y + (game.random() - 0.5) * 300 };
        const { fallSec } = WEAPONS.shower;
        game.splashes.push({ x: target.x, y: target.y, delay: fallSec + index * 0.06, total: fallSec + index * 0.06,
          radius: weaponValue(game, 'shower', 'radius') * area, damage: weaponValue(game, 'shower', 'damage'),
          mega: Boolean(evolution(game, 'shower')) });
      }
    }
    for (const splash of game.splashes) {
      splash.delay -= dt;
      if (splash.delay > 0) continue;
      for (const enemy of near(game, splash.x, splash.y, splash.radius)) {
        if (!enemy.dead && distance(enemy, splash) < splash.radius + enemy.radius) damageWeaponHit(game, enemy, splash.damage, true, splash);
      }
      addEffect(game, { weapon: 'shower', type: 'ring', x: splash.x, y: splash.y, radius: splash.radius, color: 'water', life: 0.3 });
      const shock = fusion(game, 'shockshower');
      if (shock) {
        // 감전 샤워: 젖은 자리에서 가까운 적 셋에게 전기가 튄다.
        const struck = game.enemies
          .filter((enemy) => !enemy.dead && distance(enemy, splash) < shock.range * area)
          .sort((a, b) => distance(a, splash) - distance(b, splash))
          .slice(0, shock.targets);
        for (const enemy of struck) {
          addEffect(game, { weapon: 'shower', type: 'bolt', points: [{ x: splash.x, y: splash.y }, { x: enemy.x, y: enemy.y }], life: 0.18, mega: true });
          damageWeaponHit(game, enemy, weaponValue(game, 'zapper', 'damage') * shock.damage);
        }
      }
      addEffect(game, { weapon: 'shower', type: 'burst', x: splash.x, y: splash.y, color: 'water', count: 8, life: 0.35 });
    }
    game.splashes = game.splashes.filter((splash) => splash.delay > 0);
  }
  const mop = fusion(game, 'mopstorm');
  if (mop) {
    game.mopIn = (game.mopIn ?? mop.everySec) - dt;
    if (game.mopIn <= 0) {
      // 물걸레 회오리: 주위를 한 바퀴 휘감고, 맞은 적을 느리게 한다.
      game.mopIn = mop.everySec * statsOf(game).cooldownScale;
      const radius = weaponValue(game, 'towel', 'length') * area;
      const damage = weaponValue(game, 'towel', 'damage') * mop.damage;
      for (const enemy of game.enemies) {
        const gap = distance(enemy, player);
        if (enemy.dead || gap > radius + enemy.radius) continue;
        damageWeaponHit(game, enemy, damage);
        slow(game, enemy, mop.slow);
      }
      addEffect(game, { type: 'sweep', x: player.x, y: player.y, radius, life: 0.35, facing: player.facing, mega: true });
      addEffect(game, { type: 'ring', x: player.x, y: player.y, radius, color: 'water', life: 0.35 });
    }
  }
  updateSaws(game, dt);
}

function updateProjectiles(game, dt) {
  for (const shot of game.shots) {
    if (shot.kind === 'grenade') {
      shot.age += dt;
      shot.life -= dt;
      const progress = Math.min(1, shot.age / shot.flightSec);
      shot.x = shot.fromX + (shot.toX - shot.fromX) * progress;
      shot.y = shot.fromY + (shot.toY - shot.fromY) * progress;
      if (shot.life <= 0) {
        for (const enemy of near(game, shot.toX, shot.toY, shot.blast)) {
          if (!enemy.dead && distance(enemy, shot) <= shot.blast + enemy.radius) damageWeaponHit(game, enemy, shot.damage, true, shot);
        }
        if (shot.acid) game.puddles.push({ x: shot.toX, y: shot.toY, radius: shot.acid.radius, dps: shot.acid.dps,
          life: shot.acid.life, maxLife: shot.acid.life, slow: shot.acid.slow });
        addEffect(game, { weapon: 'robot', type: 'bomb', x: shot.toX, y: shot.toY, radius: shot.blast, life: 0.35, sound: 'impact' });
        addEffect(game, { weapon: 'robot', type: 'burst', x: shot.toX, y: shot.toY, color: shot.acid ? 'teal' : 'gold', count: 12, life: 0.4, big: true });
      }
      continue;
    }
    if (shot.homing) {
      // 종이비행기: 가장 가까운 적 쪽으로 조금씩 방향을 튼다.
      let target = null;
      let best = 420;
      for (const enemy of near(game, shot.x, shot.y, 420)) {
        if (enemy.dead || shot.hit.has(enemy.id) || shot.ignored?.has(enemy.id)) continue;
        const gap = distance(enemy, shot);
        if (gap < best) {
          best = gap;
          target = enemy;
        }
      }
      if (target) {
        const current = Math.atan2(shot.vy, shot.vx);
        const wanted = Math.atan2(target.y - shot.y, target.x - shot.x);
        const turn = clamp(Math.atan2(Math.sin(wanted - current), Math.cos(wanted - current)), -shot.homing * dt, shot.homing * dt);
        shot.vx = Math.cos(current + turn) * shot.speed;
        shot.vy = Math.sin(current + turn) * shot.speed;
      }
    }
    if (shot.life <= 0) continue;
    const previous = { x: shot.x, y: shot.y };
    const travel = Math.min(dt, shot.life);
    shot.x += shot.vx * travel;
    shot.y += shot.vy * travel;
    shot.life -= dt;
    for (const { enemy, t } of sweepHits(game, previous, shot, shot.radius)) {
      if (enemy.dead || shot.hit.has(enemy.id) || shot.ignored?.has(enemy.id)) continue;
      const impact = { x: previous.x + (shot.x - previous.x) * t, y: previous.y + (shot.y - previous.y) * t };
      if (shot.volleyId != null) {
        enemy.volleyHits ??= new Map();
        const count = enemy.volleyHits.get(shot.volleyId) ?? 0;
        if (count >= shot.volleyMaxHits) {
          // 이미 맞을 만큼 맞은 적은 통과한다. 다른 적에게 쓸 관통 횟수는 소모하지 않는다.
          shot.ignored ??= new Set();
          shot.ignored.add(enemy.id);
          continue;
        }
        enemy.volleyHits.set(shot.volleyId, count + 1);
        if (enemy.volleyHits.size > 128) enemy.volleyHits.delete(enemy.volleyHits.keys().next().value);
      }
      shot.hit.add(enemy.id);
      if (shot.pop) {
        for (const other of near(game, impact.x, impact.y, shot.pop)) {
          if (other.dead || distance(other, impact) >= shot.pop + other.radius) continue;
          if (shot.foamMine) {
            if (game.time - (other.foamHitAt ?? -9) < FUSIONS.foammine.hitEverySec) continue;
            other.foamHitAt = game.time;
          }
          damageWeaponHit(game, other, shot.damage, true, shot);
        }
        addEffect(game, { type: 'ring', x: impact.x, y: impact.y, radius: shot.pop, color: shot.popColor ?? 'bubble', life: 0.3, sound: shot.popSound });
        addEffect(game, { type: 'burst', x: impact.x, y: impact.y, color: shot.popColor ?? 'bubble', count: 6, life: 0.35 });
        shot.life = 0;
        break;
      }
      if (shot.kind === 'ice') damageEnemy(game, enemy, shot.damage, shot.slows ?? true, shot);
      else damageWeaponHit(game, enemy, shot.damage, shot.slows ?? true, shot);
      if (shot.bomb) {
        // 파리채 폭격기: 비행기가 맞힌 자리를 파리채가 함께 내려친다.
        for (const other of near(game, enemy.x, enemy.y, shot.bomb.radius)) {
          if (other !== enemy && !other.dead && distance(other, enemy) < shot.bomb.radius + other.radius) damageWeaponHit(game, other, shot.bomb.damage, true, enemy);
        }
        damageWeaponHit(game, enemy, shot.bomb.damage, true, shot);
        addEffect(game, { type: 'swat', x: enemy.x, y: enemy.y, radius: shot.bomb.radius, life: 0.3, mega: true });
      }
      if (shot.acid && game.time - (enemy.acidHitAt ?? -9) >= shot.acid.everySec) {
        enemy.acidHitAt = game.time;
        game.puddles.push({ x: enemy.x, y: enemy.y, radius: shot.acid.radius, dps: shot.acid.dps,
          life: shot.acid.life, maxLife: shot.acid.life, slow: shot.acid.slow });
      }
      if (shot.poison) {
        enemy.poisonUntil = game.time + FUSIONS.poisongun.poisonSec;
        enemy.poisonDps = shot.poison;
      }
      if (shot.hit.size > shot.pierce) { shot.life = 0; break; }
    }
  }
  game.shots = game.shots.filter((shot) => shot.life > 0);

  for (const slipper of game.slippers) {
    slipper.spin += dt * 14;
    const previous = { x: slipper.x, y: slipper.y };
    if (!slipper.returning) {
      if (slipper.target && !slipper.target.dead && !slipper.hit.has(slipper.target.id)) {
        const current = Math.atan2(slipper.vy, slipper.vx);
        const wanted = Math.atan2(slipper.target.y - slipper.y, slipper.target.x - slipper.x);
        const turn = clamp(Math.atan2(Math.sin(wanted - current), Math.cos(wanted - current)), -WEAPONS.slipper.turn * dt, WEAPONS.slipper.turn * dt);
        slipper.vx = Math.cos(current + turn) * WEAPONS.slipper.speed;
        slipper.vy = Math.sin(current + turn) * WEAPONS.slipper.speed;
      }
      slipper.outFor -= dt;
      if (slipper.outFor <= 0) {
        slipper.returning = true;
        slipper.hit.clear();
      }
    } else {
      const gap = distance(slipper, game.player) || 1;
      const speed = Math.min(Math.max(WEAPONS.slipper.speed * 1.15, statsOf(game).speed * 1.35), gap / dt);
      slipper.vx = ((game.player.x - slipper.x) / gap) * speed;
      slipper.vy = ((game.player.y - slipper.y) / gap) * speed;
      if (gap <= Math.max(18, speed * dt)) slipper.done = true;
    }
    slipper.x += slipper.vx * dt;
    slipper.y += slipper.vy * dt;
    for (const { enemy } of sweepHits(game, previous, slipper, slipper.radius)) {
      if (enemy.dead || slipper.hit.has(enemy.id)) continue;
      slipper.hit.add(enemy.id);
      damageWeaponHit(game, enemy, slipper.damage, true, slipper);
    }
  }
  game.slippers = game.slippers.filter((slipper) => !slipper.done);

  // 장판을 무한히 겹쳐 깔아도 한 적에게는 가장 강한 세 장까지만 적용한다.
  const puddleHits = new Map();
  for (const puddle of game.puddles) {
    puddle.life -= dt;
    if (puddle.life <= 0) continue;
    for (const enemy of near(game, puddle.x, puddle.y, puddle.radius)) {
      if (enemy.dead || distance(enemy, puddle) > puddle.radius + enemy.radius * 0.5) continue;
      const hits = puddleHits.get(enemy) ?? [];
      hits.push(puddle);
      hits.sort((a, b) => b.dps - a.dps);
      if (hits.length > 3) hits.length = 3;
      puddleHits.set(enemy, hits);
    }
  }
  for (const [enemy, hits] of puddleHits) {
    for (const puddle of hits) damageOverTime(game, enemy, puddle.dps * dt, puddle);
    const factor = Math.min(...hits.map(puddle => puddle.slow ?? 1));
    if (factor < 1) slow(game, enemy, factor);
  }
  game.puddles = game.puddles.filter((puddle) => puddle.life > 0);
  game.slimes.forEach((slime) => { slime.life -= dt; });
  game.slimes = game.slimes.filter((slime) => slime.life > 0);

  for (const shot of game.enemyShots) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    shot.age = (shot.age ?? 0) + dt;
    if (shot.life > 0 && distance(shot, game.player) < shot.radius + PLAYER.radius && damagePlayer(game, shot.damage, true)) {
      shot.life = 0;
    }
  }
  game.enemyShots = game.enemyShots.filter((shot) => shot.life > 0);

  for (const hazard of game.hazards) {
    hazard.delay -= dt;
    // 터지기 전에 잡힌 상한 우유는 터지지 않는다.
    if (hazard.owner?.dead && !hazard.owner.exploded) {
      hazard.delay = 0;
      continue;
    }
    if (hazard.delay > 0) continue;
    if (hazard.line) {
      // 증기 줄기: 오리가 띠 안에 있으면 맞는다.
      const rx = game.player.x - hazard.x;
      const ry = game.player.y - hazard.y;
      const along = rx * Math.cos(hazard.angle) + ry * Math.sin(hazard.angle);
      const side = Math.abs(-rx * Math.sin(hazard.angle) + ry * Math.cos(hazard.angle));
      if (along > -PLAYER.radius && along < hazard.length && side < hazard.radius + PLAYER.radius * 0.5) damagePlayer(game, hazard.damage, true);
      addEffect(game, { type: 'laser', x: hazard.x, y: hazard.y, angle: hazard.angle, length: hazard.length, width: hazard.radius * 2, life: 0.4, steam: true });
      continue;
    }
    if (distance(hazard, game.player) < hazard.radius + PLAYER.radius * 0.5) damagePlayer(game, hazard.damage, true);
    addEffect(game, { type: 'slam', x: hazard.x, y: hazard.y, radius: hazard.radius, life: 0.4 });
    addEffect(game, { type: 'burst', x: hazard.x, y: hazard.y, color: hazard.spore ? 'mold' : 'trash', count: 8, life: 0.45 });
    game.shake = Math.max(game.shake, 0.2);
  }
  game.hazards = game.hazards.filter((hazard) => hazard.delay > 0);
}

function contactDamage(game) {
  let strongest = 0;
  for (const enemy of near(game, game.player.x, game.player.y, PLAYER.radius)) {
    if (!enemy.dead && !enemy.frozen && distance(enemy, game.player) < enemy.radius + PLAYER.radius) {
      strongest = Math.max(strongest, enemy.damage);
    }
  }
  if (strongest > 0 && damagePlayer(game, strongest)) {
    const scrubber = relic(game, 'scrubber');
    if (scrubber) {
      // 철수세미: 받은 피해를 주변 적에게 몇 배로 돌려준다.
      const scrubReach = relicReach(game, scrubber.radius);
      for (const enemy of near(game, game.player.x, game.player.y, scrubReach)) {
        if (!enemy.dead && distance(enemy, game.player) < scrubReach + enemy.radius) {
          damageEnemy(game, enemy, strongest * scrubber.reflect * relicPowerOf(game), true);
        }
      }
      addEffect(game, { type: 'ring', x: game.player.x, y: game.player.y, radius: scrubReach, color: 'spark', life: 0.3 });
    }
  }
}

function applyDrop(game, drop) {
  const { player } = game;
  const stats = statsOf(game);
  const boost = 1;
  if (drop.type === 'ramen') player.hp = Math.min(stats.maxHp, player.hp + 15 * boost);
  if (drop.type === 'vacuumBag') game.gems.forEach((gem) => { gem.pulled = true; });
  if (drop.type === 'coffee') game.coffeeUntil = game.time + 10 * boost;
  if (drop.type === 'bugBomb') {
    for (const enemy of game.enemies) {
      if (!enemy.boss && distance(enemy, player) < 560) killEnemy(game, enemy);
    }
    addEffect(game, { type: 'bomb', x: player.x, y: player.y, radius: 560, life: 0.6 });
  }
  if (drop.type === 'chicken') player.hp = stats.maxHp;
  if (drop.type === 'icepack') game.freezeUntil = game.time + 4 * boost;
  if (drop.type === 'box') game.shieldUntil = game.time + 5 * boost;
  if (drop.type === 'chest') {
    game.pendingRelics += 1;
    addEffect(game, { type: 'banner', text: '보물 상자 발견!', life: 2 });
  }
  addEffect(game, { type: 'pickup', sound: drop.type === 'chest' ? 'chest' : 'pickup', x: drop.x, y: drop.y, life: 0.4 });
  if (drop.type !== 'chest') addEffect(game, { type: 'banner', text: `${DROPS[drop.type].label}!`, life: 1.1 });
}

function collect(game, dt) {
  const { player } = game;
  const { pickupRadius } = statsOf(game);
  for (const gem of game.gems) {
    const gap = distance(gem, player);
    if (gem.pulled || gap < pickupRadius) {
      gem.pulled = true;
      const speed = 420 + (gem.pulled ? 200 : 0);
      gem.x += ((player.x - gem.x) / (gap || 1)) * speed * dt;
      gem.y += ((player.y - gem.y) / (gap || 1)) * speed * dt;
    }
    if (distance(gem, player) < PLAYER.radius + 6) {
      gem.taken = true;
      game.xpCarry += gem.value * statsOf(game).xpGain;
      const gained = Math.floor(game.xpCarry);
      game.xpCarry -= gained;
      game.xp += gained;
    }
  }
  game.gems = game.gems.filter((gem) => !gem.taken);
  for (const drop of game.drops) {
    if (distance(drop, player) < PLAYER.radius + 16) {
      drop.taken = true;
      applyDrop(game, drop);
    }
  }
  game.drops = game.drops.filter((drop) => !drop.taken);
  while (game.xp >= game.nextXp) {
    game.xp -= game.nextXp;
    game.level += 1;
    game.nextXp = xpToNext(game.level);
    game.pendingLevels += 1;
    if (perk(game, 'haste', 5)) game.rushUntil = game.time + BUILD.haste.perks[5].rushSec;
    if (relic(game, 'piggy')) player.hp = Math.min(statsOf(game).maxHp, player.hp + RELICS.piggy.levelHeal);
    addEffect(game, { type: 'levelup', x: player.x, y: player.y, life: 0.7 });
  }
}

function shuffle(items, random) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

// 레벨업 선택지 3개. 새 무기, 무기 강화, 패시브 중에서 고르고, 다 올렸으면 라면으로 회복한다.
export function rollChoices(game) {
  const pool = [
    ...Object.keys(WEAPONS).filter((id) => (game.weapons[id] ?? 0) < MAX_LEVEL)
      .map((id) => ({ kind: 'weapon', id, level: (game.weapons[id] ?? 0) + 1, ...WEAPONS[id] })),
    ...Object.keys(PASSIVES).filter((id) => (game.passives[id] ?? 0) < passiveMaxLevel(id)
      && (!PASSIVES[id].requires || game.passives[PASSIVES[id].requires]) && buildUnlocked(game, PASSIVES[id]))
      .map((id) => ({ kind: 'passive', id, level: (game.passives[id] ?? 0) + 1, ...PASSIVES[id] })),
  ];
  const evolvable = Object.keys(WEAPONS).filter((id) => game.weapons[id] === MAX_LEVEL && !game.evolved[id])
    .map((id) => ({ kind: 'evolve', id, level: MAX_LEVEL + 1, ...EVOLUTIONS[id] }));
  // 두 완성형을 모두 갖추면 합체가 가장 먼저 나온다.
  const fusionRoom = Object.keys(game.fusions).length < MAX_FUSIONS;
  const fusable = Object.entries(FUSIONS)
    .filter(([id, recipe]) => fusionRoom && !game.fusions[id] && recipe.from.every((weapon) => game.evolved[weapon] && !inFusion(game, weapon)))
    .map(([id, recipe]) => ({ kind: 'fusion', id, level: MAX_LEVEL + 2, ...recipe }));
  const special = [...shuffle(fusable, game.random), ...shuffle(evolvable, game.random)].slice(0, 1);
  const choices = [...special, ...shuffle(pool, game.random)].slice(0, 3)
    .map(({ kind, id, level, label, description, icon }) => ({ kind, id, level, label, description, ...(icon ? { icon } : {}) }));
  while (choices.length < 3) {
    choices.push({ kind: 'heal', id: `ramen-${choices.length}`, level: 0, label: '라면 한 그릇', description: '체력 20 회복' });
  }
  return choices.map((choice) => ({ ...choice, details: describeChoice(game, choice) }));
}

// 아직 없는 보물 가운데 셋
// 보물을 바꾸지 않고 대신 레벨업 두 번을 받는 카드
const KEEP_RELICS = {
  kind: 'relic-keep', id: 'keep', icon: 'chest', level: 0, label: '지금 보물 그대로', description: '보물을 바꾸지 않고 대신 두 번 강화해요',
  details: ['레벨업 +2'],
};

const relicsFull = (game) => Object.keys(game.relics).length >= maxRelicsOf(game);
const weaponsFull = (game) => Object.keys(game.weapons).length >= maxWeaponsOf(game);

// 무기를 내려놓는다. 그 무기가 남긴 공, 로봇, 슬리퍼, 쥐덫도 함께 치운다.
function dropWeapon(game, id) {
  delete game.weapons[id];
  delete game.evolved[id];
  delete game.cooldowns[id];
  game.summons = game.summons.filter(unit => unit.weapon !== id);
  if (WEAPONS[id].summon) game.shots = game.shots.filter(shot => shot.weapon !== id);
  if (id === 'ball') game.balls = [];
  if (id === 'robot') game.robots = [];
  if (id === 'slipper') game.slippers = [];
  if (id === 'mousetrap') game.traps = [];
  if (id === 'dryer') game.dryerOn = false;
}

function clearMaterialAttacks(game, fusionId) {
  const materials = FUSIONS[fusionId].from;
  game.summons = game.summons.filter(unit => !materials.includes(unit.weapon));
  game.shots = game.shots.filter(shot => !materials.includes(shot.weapon));
  game.effects = game.effects.filter(effect => !materials.includes(effect.weapon));
  if (materials.includes('slipper')) game.slippers = [];
  if (materials.includes('ball')) game.balls = [];
  if (materials.includes('robot')) game.robots = [];
  if (materials.includes('bleach')) game.puddles = game.puddles.filter(puddle => puddle.weapon !== 'bleach');
  if (materials.includes('mousetrap')) game.traps = [];
  if (materials.includes('microwave')) game.waves = [];
  if (materials.includes('shower')) game.splashes = [];
  if (materials.includes('dryer')) game.dryerOn = false;
  for (const id of materials) {
    delete game.cooldowns[id];
    if (game.echoes) delete game.echoes[id];
  }
  game.echoing = null;
}

// 아직 없는 보물 가운데 셋. 보물이 가득 찼으면 바꿀 수 있게 하고, 바꾸지 않는 카드를 하나 더 둔다.
export function rollRelics(game) {
  const offers = shuffle(Object.keys(RELICS).filter((id) => !game.relics[id] && buildUnlocked(game, RELICS[id])), game.random).slice(0, 3 + (perk(game, 'treasure', 20)?.offers ?? 0))
    .map((id) => ({ kind: 'relic', id, level: 0, label: RELICS[id].label, description: RELICS[id].description, details: RELICS[id].stats }));
  if (offers.length === 0) return [];
  return relicsFull(game) ? [...offers, { ...KEEP_RELICS }] : offers;
}

function gainRelic(game, id) {
  game.relics[id] = true;
  if (id === 'resonator') for (const enemy of game.enemies) enemy.resonatorHits = 0;
  if (id === 'concentrate') for (const enemy of game.enemies) { delete enemy.dotLastAt; delete enemy.dotStartedAt; }
  if (id === 'alarm') game.alarmIn = RELICS.alarm.everySec;
  if (id === 'firecracker') game.fireIn = RELICS.firecracker.everySec;
  if (id === 'pas') game.pasIn = RELICS.pas.everySec;
  if (id === 'outlet') game.outletIn = RELICS.outlet.everySec;
  if (id === 'glove') game.gloveIn = RELICS.glove.everySec;
  if (id === 'purifier') game.purifierIn = RELICS.purifier.everySec;
  if (id === 'freshener') game.freshIn = RELICS.freshener.everySec;
  addEffect(game, { type: 'levelup', x: game.player.x, y: game.player.y, life: 1.2, gold: true });
}

// 다음에 보여 줄 선택지. 보물이 레벨업보다 먼저다. 보물을 최대로 가졌으면 상자는 레벨업 두 번이 된다.
function nextChoices(game) {
  if (game.pendingRelics > 0) {
    const relics = rollRelics(game);
    if (relics.length > 0) return relics;
    game.pendingLevels += game.pendingRelics * 2;
    game.pendingRelics = 0;
  }
  return game.pendingLevels > 0 ? rollChoices(game) : null;
}

// 게임을 시작하면 보물을 하나 고른다.
export function startWithRelic(game) {
  game.pendingRelics += 1 + (perk(game, 'treasure', 5)?.relics ?? 0);
  game.choices = nextChoices(game);
  game.rerollLeft = rerollsPerLevel(game);
}

// 선택지마다 정해진 횟수만큼 새로 뽑을 수 있다.
export function reroll(game) {
  // 내려놓을 보물을 고르는 중에는 다시 뽑지 않는다.
  if (!game.choices || game.rerollLeft <= 0 || game.choices[0]?.kind.endsWith('-swap')) return false;
  game.rerollLeft -= 1;
  game.choices = game.choices[0]?.kind === 'relic' ? rollRelics(game) : rollChoices(game);
  return true;
}

function finishChoice(game) {
  if (game.choices[0].kind.startsWith('relic')) game.pendingRelics -= 1;
  else game.pendingLevels -= 1;
  game.swapIn = null;
  game.weaponSwap = null;
  game.choices = nextChoices(game);
  game.rerollLeft = rerollsPerLevel(game);
}

export function declineChoice(game) {
  if (!game.choices) return false;
  finishChoice(game);
  return true;
}

export function choose(game, index) {
  const choice = game.choices?.[index];
  if (!choice) return null;
  if (choice.kind === 'relic' && relicsFull(game)) {
    // 보물이 가득 찼으면 무엇을 내려놓을지 한 번 더 고른다.
    game.swapIn = choice.id;
    game.choices = [
      ...Object.keys(game.relics).map((id) => ({
        kind: 'relic-swap', id, level: 0, label: RELICS[id].label, description: `내려놓고 ${choice.label} 받기`, details: RELICS[id].stats,
      })),
      { ...KEEP_RELICS },
    ];
    return choice;
  }
  if (choice.kind === 'weapon' && choice.level === 1 && weaponsFull(game)) {
    // 무기 칸이 가득 찼으면 무엇을 내려놓을지 고른다. 합체에 쓰인 무기는 내려놓을 수 없다.
    game.weaponSwap = { id: choice.id, choices: game.choices };
    game.choices = [
      ...Object.keys(game.weapons).filter((id) => !inFusion(game, id)).map((id) => ({
        kind: 'weapon-swap', id, level: 0, label: WEAPONS[id].label, description: `내려놓고 ${choice.label} 받기`,
        details: [game.evolved[id] ? '완성형' : `Lv ${game.weapons[id]}`],
      })),
      { kind: 'weapon-cancel', id: 'cancel', icon: choice.id, level: 0, label: '그대로 두기', description: '새 무기를 받지 않고 다른 카드를 고를게요', details: [] },
    ];
    return choice;
  }
  if (choice.kind === 'weapon-cancel') {
    // 교체를 그만두면 아까 보던 카드로 돌아간다(다시 뽑기 횟수도 그대로).
    game.choices = game.weaponSwap.choices;
    game.weaponSwap = null;
    return choice;
  }
  const before = statsOf(game).maxHp;
  if (choice.kind === 'weapon') game.weapons[choice.id] = choice.level;
  if (choice.kind === 'weapon-swap') {
    const incoming = game.weaponSwap.id;
    dropWeapon(game, choice.id);
    game.weapons[incoming] = 1;
    addEffect(game, { type: 'banner', text: `무기 교체: ${WEAPONS[choice.id].label} → ${WEAPONS[incoming].label}`, life: 2.4 });
  }
  if (choice.kind === 'passive') game.passives[choice.id] = choice.level;
  if (choice.kind === 'evolve') {
    game.evolved[choice.id] = true;
    addEffect(game, { type: 'levelup', x: game.player.x, y: game.player.y, life: 1, gold: true });
    addEffect(game, { type: 'banner', text: `${choice.label} 완성!`, life: 2 });
  }
  if (choice.kind === 'fusion') {
    clearMaterialAttacks(game, choice.id);
    game.fusions[choice.id] = true;
    addEffect(game, { type: 'levelup', x: game.player.x, y: game.player.y, life: 1.2, gold: true });
    addEffect(game, { type: 'flash', life: 0.5 });
    addEffect(game, { type: 'banner', text: `${choice.label} 합체!`, life: 2.4 });
    game.shake = 0.3;
  }
  if (choice.kind === 'relic') {
    gainRelic(game, choice.id);
    addEffect(game, { type: 'banner', text: `보물: ${choice.label}`, life: 2.2 });
  }
  if (choice.kind === 'relic-swap') {
    delete game.relics[choice.id];
    gainRelic(game, game.swapIn);
    addEffect(game, { type: 'banner', text: `보물 교체: ${RELICS[choice.id].label} → ${RELICS[game.swapIn].label}`, life: 2.4 });
  }
  if (choice.kind === 'relic-keep') game.pendingLevels += 2;
  const stats = statsOf(game);
  if (choice.kind === 'heal') game.player.hp = Math.min(stats.maxHp, game.player.hp + 20);
  if (stats.maxHp > before) game.player.hp += stats.maxHp - before;
  game.player.hp = Math.min(game.player.hp, stats.maxHp); // 물병을 내려놓으면 넘치는 체력은 버린다.
  finishChoice(game);
  return choice;
}

// 8분 강화는 기존 적과 새 적에 같은 배율로 적용한다. 기존 적의 남은 체력 비율은 보존한다.
function updateHpSurge(game, previousTime) {
  if (!game.hpSurgeWarned && game.time >= HP_SURGE.from - HP_SURGE.warningSec && game.time < HP_SURGE.from) {
    game.hpSurgeWarned = true;
    addEffect(game, { type: 'banner', text: '경고! 8분부터 적 체력이 추가로 증가해요', life: HP_SURGE.warningSec, warning: true, sound: 'boss' });
  }
  const ratio = hpSurgeAt(game.time) / hpSurgeAt(previousTime);
  if (ratio !== 1) {
    for (const enemy of game.enemies) {
      if (enemy.dead) continue;
      enemy.hp *= ratio;
      enemy.maxHp *= ratio;
    }
  }
  if (!game.hpSurgeStarted && game.time >= HP_SURGE.from) {
    game.hpSurgeStarted = true;
    game.hpSurgeWarned = true;
    addEffect(game, { type: 'banner', text: `위험 단계! 적 체력 +${Math.round((HP_SURGE.multiplier - 1) * 100)}% · 이후 서서히 증가`, life: 4, warning: true, sound: 'boss' });
  }
}

export function update(game, dt, input = { x: 0, y: 0 }) {
  if (game.over || game.choices) return game;
  const previousTime = game.time;
  game.stepDt = dt;
  game.time += dt;
  updateHpSurge(game, previousTime);
  movePlayer(game, dt, input);
  spawn(game, dt);
  moveEnemies(game, dt);
  fireWeapons(game, dt);
  updateProjectiles(game, dt);
  contactDamage(game);
  collect(game, dt);
  game.enemies = game.enemies.filter((enemy) => !enemy.dead);
  const stats = statsOf(game);
  if (!game.over) game.player.hp = Math.min(stats.maxHp, game.player.hp + stats.regen * dt);
  game.shake = Math.max(0, game.shake - dt);
  game.effects.forEach((effect) => { effect.age += dt; });
  game.effects = game.effects.filter((effect) => effect.age < effect.life);
  const firecracker = relic(game, 'firecracker');
  if (firecracker && !game.over) {
    game.fireIn = (game.fireIn ?? firecracker.everySec) - dt;
    if (game.fireIn <= 0) {
      game.fireIn = relicEvery(game, firecracker.everySec);
      const damage = relicDamage(game, firecracker.damage);
      for (const enemy of game.enemies) {
        if (!enemy.dead && distance(enemy, game.player) < relicReach(game, firecracker.radius) + enemy.radius) damageEnemy(game, enemy, damage, true);
      }
      addEffect(game, { type: 'nova', x: game.player.x, y: game.player.y, radius: relicReach(game, firecracker.radius), life: 0.6 });
      addEffect(game, { type: 'burst', x: game.player.x, y: game.player.y, color: 'gold', count: 40, life: 0.8, big: true });
      game.shake = Math.max(game.shake, 0.3);
    }
  }
  game.enemies = game.enemies.filter((enemy) => !enemy.dead);
  const alarm = relic(game, 'alarm');
  if (alarm && !game.over) {
    game.alarmIn -= dt;
    if (game.alarmIn <= 0) {
      game.alarmIn = relicEvery(game, alarm.everySec);
      game.freezeUntil = Math.max(game.freezeUntil, game.time + alarm.freezeSec);
      addEffect(game, { type: 'banner', text: '따르릉! 적이 얼었어요', life: 1.4 });
      addEffect(game, { type: 'ring', x: game.player.x, y: game.player.y, radius: 300, color: 'spark', life: 0.5 });
    }
  }
  if (!game.over) updateDamageRelics(game, dt);
  game.gridFresh = false;
  if ((game.pendingLevels > 0 || game.pendingRelics > 0) && !game.over) {
    game.choices = nextChoices(game);
    game.rerollLeft = rerollsPerLevel(game);
  }
  return game;
}

// 팽이 보물의 지금 위치(그리기용)
export function topSpinners(game) {
  if (!relic(game, 'top')) return [];
  return (game.tops ?? []).map((spinner) => ({ ...spinner, radius: relicReach(game, RELICS.top.radius) }));
}

// 팽이: 쿨타임마다 하나씩 날아가 화면 가장자리에서 튕기며 돌고, 닿는 적을 친다.
function updateTops(game, dt) {
  const top = relic(game, 'top');
  if (!top) {
    game.tops = [];
    return;
  }
  const { player } = game;
  game.tops ??= [];
  game.topIn = (game.topIn ?? 0.5) - dt;
  if (game.topIn <= 0) {
    game.topIn = relicEvery(game, top.everySec);
    if (game.tops.length >= top.max) game.tops.shift();
    const angle = game.random() * Math.PI * 2;
    game.tops.push({ id: game.nextId++, x: player.x, y: player.y, dx: Math.cos(angle), dy: Math.sin(angle), life: top.lifeSec });
  }
  const radius = relicReach(game, top.radius);
  const damage = relicDamage(game, top.damage);
  const halfW = (game.view?.halfW ?? 420) - radius;
  const halfH = (game.view?.halfH ?? 320) - radius;
  for (const spinner of game.tops) {
    spinner.life -= dt;
    spinner.x += spinner.dx * top.speed * attackTempoOf(game) * dt;
    spinner.y += spinner.dy * top.speed * attackTempoOf(game) * dt;
    if (spinner.x < player.x - halfW) { spinner.x = player.x - halfW; spinner.dx = Math.abs(spinner.dx); }
    if (spinner.x > player.x + halfW) { spinner.x = player.x + halfW; spinner.dx = -Math.abs(spinner.dx); }
    if (spinner.y < player.y - halfH) { spinner.y = player.y - halfH; spinner.dy = Math.abs(spinner.dy); }
    if (spinner.y > player.y + halfH) { spinner.y = player.y + halfH; spinner.dy = -Math.abs(spinner.dy); }
    for (const enemy of near(game, spinner.x, spinner.y, radius)) {
      if (enemy.dead || distance(enemy, spinner) > radius + enemy.radius) continue;
      enemy.topHits ??= {};
      if (game.time - (enemy.topHits[spinner.id] ?? -9) < top.hitEverySec) continue;
      enemy.topHits[spinner.id] = game.time;
      damageEnemy(game, enemy, damage, true, spinner);
    }
  }
  game.tops = game.tops.filter((spinner) => spinner.life > 0);
}

// 직접 피해를 주는 보물: 물파스, 전기장판, 방향제, 빨래집게, 멀티탭, 고무장갑, 팽이, 정수기
function updateDamageRelics(game, dt) {
  const { player } = game;
  const pas = relic(game, 'pas');
  if (pas) {
    game.pasIn = (game.pasIn ?? pas.everySec) - dt;
    if (game.pasIn <= 0) {
      game.pasIn = relicEvery(game, pas.everySec);
      const damage = relicDamage(game, pas.damage);
      for (const enemy of game.enemies) {
        if (!enemy.dead && distance(enemy, player) < relicReach(game, pas.radius) + enemy.radius) damageEnemy(game, enemy, damage, true);
      }
      addEffect(game, { type: 'nova', x: player.x, y: player.y, radius: relicReach(game, pas.radius), life: 0.45, color: 'mint' });
      addEffect(game, { type: 'burst', x: player.x, y: player.y, color: 'teal', count: 16, life: 0.5 });
    }
  }
  const heat = relic(game, 'heatpad');
  if (heat) {
    game.heatIn = (game.heatIn ?? heat.everySec) - dt;
    if (game.heatIn <= 0) {
      // 전기장판: 때마다 넓은 장판이 달아오르며 한꺼번에 지진다.
      game.heatIn = relicEvery(game, heat.everySec);
      const damage = relicDamage(game, heat.damage);
      const heatReach = relicReach(game, heat.radius);
      for (const enemy of near(game, player.x, player.y, heatReach)) {
        if (!enemy.dead && distance(enemy, player) < heatReach + enemy.radius) damageEnemy(game, enemy, damage);
      }
      game.heatPulse = game.time;
    }
  }
  const fresh = relic(game, 'freshener');
  if (fresh) {
    game.freshIn = (game.freshIn ?? fresh.everySec) - dt;
    if (game.freshIn <= 0) {
      game.freshIn = relicEvery(game, fresh.everySec);
      const damage = relicDamage(game, fresh.damage);
      for (const enemy of game.enemies) {
        if (!enemy.dead && distance(enemy, player) < relicReach(game, fresh.radius)) damageEnemy(game, enemy, damage);
      }
      addEffect(game, { type: 'mist', x: player.x, y: player.y, radius: fresh.radius, life: 0.9 });
    }
  }
  const pin = relic(game, 'clothespin');
  if (pin && game.pins.length > 0) {
    for (const spot of game.pins) {
      spot.life -= dt;
      const pinReach = relicReach(game, pin.radius);
      const victim = near(game, spot.x, spot.y, pinReach).find((enemy) => !enemy.dead && distance(enemy, spot) < pinReach * 0.5 + enemy.radius);
      if (!victim) continue;
      spot.life = 0;
      const damage = relicDamage(game, pin.damage);
      for (const enemy of game.enemies) {
        if (!enemy.dead && distance(enemy, spot) < pinReach + enemy.radius) damageEnemy(game, enemy, damage, true, spot);
      }
      addEffect(game, { type: 'snap', x: spot.x, y: spot.y, radius: pinReach, life: 0.3 });
    }
    game.pins = game.pins.filter((spot) => spot.life > 0);
  }
  const outlet = relic(game, 'outlet');
  if (outlet) {
    game.outletIn = (game.outletIn ?? outlet.everySec) - dt;
    if (game.outletIn <= 0) {
      // 멀티탭: 가까운 적 몇에게 하늘에서 벼락이 떨어진다.
      game.outletIn = relicEvery(game, outlet.everySec);
      const range = relicReach(game, outlet.range);
      const blast = relicReach(game, outlet.radius);
      const damage = relicDamage(game, outlet.damage);
      const targets = shuffle(near(game, player.x, player.y, range).filter((enemy) => !enemy.dead && distance(enemy, player) < range), game.random)
        .slice(0, outlet.strikes);
      for (const target of targets) {
        const spot = { x: target.x, y: target.y };
        for (const enemy of near(game, spot.x, spot.y, blast)) {
          if (!enemy.dead && distance(enemy, spot) < blast + enemy.radius) damageEnemy(game, enemy, damage, true, spot);
        }
        addEffect(game, { type: 'bolt', points: [{ x: spot.x + 30, y: spot.y - 260 }, { x: spot.x - 10, y: spot.y - 120 }, { x: spot.x + 8, y: spot.y - 50 }, spot],
          life: 0.25, mega: true });
        addEffect(game, { type: 'ring', x: spot.x, y: spot.y, radius: blast, color: 'spark', life: 0.3 });
      }
    }
  }
  const glove = relic(game, 'glove');
  if (glove) {
    game.gloveIn = (game.gloveIn ?? glove.everySec) - dt;
    if (game.gloveIn <= 0) {
      // 고무장갑: 바라보는 쪽으로 길게 충격파를 날리고 적을 둔화시킨다.
      game.gloveIn = relicEvery(game, glove.everySec);
      const angle = player.heading ?? (player.facing > 0 ? 0 : Math.PI);
      const length = relicReach(game, glove.length);
      const half = relicReach(game, glove.width) / 2;
      const damage = relicDamage(game, glove.damage);
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      for (const enemy of near(game, player.x + dx * length / 2, player.y + dy * length / 2, length / 2 + half)) {
        if (enemy.dead) continue;
        const along = (enemy.x - player.x) * dx + (enemy.y - player.y) * dy;
        const across = Math.abs(-(enemy.x - player.x) * dy + (enemy.y - player.y) * dx);
        if (along > -10 && along < length + enemy.radius && across < half + enemy.radius) damageEnemy(game, enemy, damage, glove.slows);
      }
      addEffect(game, { type: 'punch', x: player.x, y: player.y, angle, length, width: half * 2, life: 0.35 });
    }
  }
  updateTops(game, dt);
  const purifier = relic(game, 'purifier');
  if (purifier) {
    game.purifierIn = (game.purifierIn ?? purifier.everySec) - dt;
    if (game.purifierIn <= 0) {
      // 정수기: 얼음 조각을 사방으로 고르게 쏜다.
      game.purifierIn = relicEvery(game, purifier.everySec);
      const damage = relicDamage(game, purifier.damage);
      const reach = relicReach(game, 1);
      const turn = game.random() * Math.PI * 2;
      for (let shard = 0; shard < purifier.shards; shard += 1) {
        const angle = turn + (shard / purifier.shards) * Math.PI * 2;
        game.shots.push({ x: player.x, y: player.y, vx: Math.cos(angle) * purifier.speed, vy: Math.sin(angle) * purifier.speed,
          damage, pierce: purifier.pierce, life: purifier.lifeSec * reach, radius: 7, scale: 1, hit: new Set(), kind: 'ice', slows: true });
      }
      addEffect(game, { type: 'ring', x: player.x, y: player.y, radius: 50, color: 'water', life: 0.3 });
    }
  }
  // 과충전이 시작될 때 알려 준다.
  const charging = overcharged(game);
  if (charging && !game.charging) addEffect(game, { type: 'ring', x: player.x, y: player.y, radius: 90, color: 'spark', life: 0.4 });
  game.charging = charging;
}

export function formatTime(seconds) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
