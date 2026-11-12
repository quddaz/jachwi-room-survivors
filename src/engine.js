import {
  ARENA, BOSS_EVERY_SEC, bossStatsOf, BUILD, buildEfficiency, difficultyAt, normalizeBuild, DROP_LIMIT, DROPS, ELITE, eliteFrom, ENEMIES, EVOLUTIONS, FUSIONS, MAX_FUSIONS, MAX_LEVEL, MAX_WEAPONS, MAX_RELICS, RELIC_LEVEL_SCALE, RELICS, passiveMaxLevel, PASSIVES, PLAYER, WEAPONS, xpToNext,
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
  return level === 0 ? 0 : PASSIVES[id][key][level - 1];
}

const relic = (game, id) => (game.relics[id] ? RELICS[id] : null);

// 체력 30% 이하인지(마지막 컵라면)
// 시작할 때 나눈 능력치에서 나오는 값. 파트마다 점수 × 포인트당 효과 × 효율 배율을 더한다.
function buildValue(game, key) {
  let sum = 0;
  for (const [tree, def] of Object.entries(BUILD)) {
    const points = game.build?.[tree] ?? 0;
    if (points && def.per[key]) sum += points * def.per[key] * buildEfficiency(points);
  }
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

// 때마다 발동하는 보물의 주기(보물 파트 10점이면 짧아진다)
function relicEvery(game, sec) {
  return sec * (1 - (perk(game, 'treasure', 10)?.relicHaste ?? 0));
}

// 가질 수 있는 보물 수
export function maxRelicsOf(game) {
  return MAX_RELICS + (perk(game, 'treasure', 20)?.maxRelics ?? 0);
}

// 공속 20점 과충전: 8초마다 3초 동안 공격 속도가 2배다.
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
    + buildValue(game, 'critChance');
}

function critChanceOf(game) {
  return relic(game, 'mallet') ? 0 : rawCritChance(game);
}

// 고무망치: 치명타 확률 5%마다 한 대 때리는 무기의 피해 +5
function flatDamageOf(game) {
  const mallet = relic(game, 'mallet');
  return mallet ? Math.floor(rawCritChance(game) / mallet.step + 1e-9) * mallet.flat : 0;
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
  return 1 + passiveValue(game, 'protein', 'might')
    + (game.player.moving ? relic(game, 'energy')?.might ?? 0 : 0)
    + (cornered(game) ? RELICS.lastcup.might : 0);
}

export function statsOf(game) {
  const coffee = game.time < game.coffeeUntil;
  const guard = !game.player.moving ? relic(game, 'blanket')?.guard ?? 0 : 0;
  return {
    speed: PLAYER.speed * (1 + passiveValue(game, 'sneakers', 'speed') + (relic(game, 'energy')?.speed ?? 0)
      + (relic(game, 'scooter')?.speed ?? 0)) * (coffee ? 1.25 : 1),
    armor: 1 - (1 - guard) * (1 - buildValue(game, 'armor'))
      * (1 - (perk(game, 'survival', 10)?.armor ?? 0)),
    pickupRadius: PLAYER.pickupRadius * (1 + passiveValue(game, 'vacuum', 'pickup') + (relic(game, 'magnet')?.pickup ?? 0)),
    maxHp: maxHpOf(game),
    regen: PLAYER.regen + passiveValue(game, 'vitamin', 'regen') + (relic(game, 'waterbottle')?.regen ?? 0)
      + (perk(game, 'survival', 5)?.regen ?? 0),
    cooldownScale: (1 - passiveValue(game, 'battery', 'haste')) * (coffee ? 0.7 : 1) * (cornered(game) ? 1 - RELICS.lastcup.haste : 1)
      * (1 - (relic(game, 'stopwatch')?.haste ?? 0)) / (1 + (relic(game, 'mallet')?.attackSpeed ?? 0)) / (1 + buildValue(game, 'attackSpeed'))
      / (1 + (perk(game, 'haste', 20)?.attackSpeed ?? 0)) / (game.time < (game.rushUntil ?? -1) ? 1 + BUILD.haste.perks[5].rush : 1)
      / (overcharged(game) ? 1 + BUILD.haste.perks[20].burst : 1),
    xpGain: 1 + passiveValue(game, 'candle', 'xpGain') + (relic(game, 'piggy')?.xpGain ?? 0),
    area: 1 + passiveValue(game, 'wipes', 'area') + (relic(game, 'bigpot')?.area ?? 0) + (perk(game, 'haste', 10)?.area ?? 0),
    might: mightOf(game),
    projectile: 1 + passiveValue(game, 'magnifier', 'size') + (relic(game, 'bigpot')?.projectile ?? 0)
      + (perk(game, 'haste', 10)?.projectile ?? 0),
    critChance: critChanceOf(game),
    critDamage: critDamageOf(game),
    flatDamage: flatDamageOf(game),
    relicPower: relicPowerOf(game),
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

// 오른쪽 아래 능력치 창. [이름, 값] 목록이다.
export function statSheet(game) {
  const stats = statsOf(game);
  return [
    ['최대 체력', number(stats.maxHp)],
    ['초당 회복', number(stats.regen)],
    ['공격력', percent(stats.might - 1)],
    ['이동 속도', percent(stats.speed / PLAYER.speed - 1)],
    ['쿨타임', percent(stats.cooldownScale - 1)],
    ['무기 범위', percent(stats.area - 1)],
    ['투사체 크기', percent(stats.projectile - 1)],
    ['받는 피해', percent(-stats.armor)],
    ['줍는 범위', percent(stats.pickupRadius / PLAYER.pickupRadius - 1)],
    ['경험치', percent(stats.xpGain - 1)],
    ['치명타 확률', `${Math.round(stats.critChance * 100)}%`],
    ['치명타 피해', `${Math.round(stats.critDamage * 100)}%`],
    ...(stats.flatDamage > 0 ? [['고정 피해', `+${stats.flatDamage}`]] : []),
    ...(stats.relicPower > 1 ? [['보물 피해', percent(stats.relicPower - 1)]] : []),
  ];
}

// 패시브 효과를 사람이 읽는 말로. [이름, 값을 글로 바꾸는 함수]
const PASSIVE_TEXT = {
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
  relicPower: ['보물 피해', percent],
};

// 무기 능력치 이름. lower는 줄어들수록 좋은 값이고, plain은 퍼센트 대신 개수로 보여 준다.
const WEAPON_TEXT = {
  damage: { name: '피해', might: true }, dps: { name: '초당 피해', might: true }, cooldown: { name: '쿨타임', lower: true, unit: '초' },
  radius: { name: '범위' }, range: { name: '사거리' }, width: { name: '굵기' }, size: { name: '크기' }, orbit: { name: '궤도' },
  speed: { name: '속도' }, length: { name: '길이' }, count: { name: '개수', plain: true }, pierce: { name: '관통', plain: true }, chains: { name: '연쇄', plain: true },
};

const EVOLUTION_TEXT = { damage: '피해', dps: '초당 피해', radius: '범위', range: '사거리', size: '크기', jump: '연쇄 거리' };

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
      const next = format(values[choice.level - 1]);
      return choice.level === 1 ? `${name} ${next}` : `${name} ${format(values[choice.level - 2])} → ${next}`;
    });
  }
  if (choice.kind === 'weapon') {
    const weapon = WEAPONS[choice.id];
    const might = statsOf(game).might;
    return Object.entries(weapon).filter(([key, values]) => Array.isArray(values) && WEAPON_TEXT[key]).flatMap(([key, values]) => {
      const text = WEAPON_TEXT[key];
      const scale = text.might ? might : 1;
      const flat = key === 'damage' ? flatDamageOf(game) : 0;
      const value = (level) => values[level - 1] * scale + flat;
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
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

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
  amount = Math.min(amount, statsOf(game).maxHp * PLAYER.maxHitShare);
  player.hp -= amount * (1 - statsOf(game).armor);
  player.hurtFlash = 0.15;
  player.invulnerable = PLAYER.invulnerableSec + (perk(game, 'survival', 10)?.guardSec ?? 0);
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
  if (player.hp <= 0 && perk(game, 'survival', 20) && !game.buildRevived) {
    // 생존 20점: 한 번 버틴다.
    game.buildRevived = true;
    player.hp = statsOf(game).maxHp * BUILD.survival.perks[20].revive;
    player.invulnerable = 3;
    game.shieldUntil = game.time + 3;
    addEffect(game, { type: 'levelup', x: player.x, y: player.y, life: 1.2, gold: true });
    addEffect(game, { type: 'banner', text: '불사조 오리! 다시 일어났어요', life: 2.4 });
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
    let speed = enemy.speed * (game.time < (enemy.slowUntil ?? 0) ? enemy.slowBy : 1);
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
function separate(enemies) {
  const cell = 48;
  const grid = new Map();
  enemies.forEach((enemy, index) => {
    const key = `${Math.floor(enemy.x / cell)},${Math.floor(enemy.y / cell)}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(index);
  });
  enemies.forEach((enemy, index) => {
    const cx = Math.floor(enemy.x / cell);
    const cy = Math.floor(enemy.y / cell);
    for (let ox = -1; ox <= 1; ox += 1) {
      for (let oy = -1; oy <= 1; oy += 1) {
        for (const otherIndex of grid.get(`${cx + ox},${cy + oy}`) ?? []) {
          if (otherIndex <= index) continue;
          const other = enemies[otherIndex];
          const dx = other.x - enemy.x;
          const dy = other.y - enemy.y;
          const minGap = (enemy.radius + other.radius) * 0.85;
          const gap = Math.hypot(dx, dy);
          if (gap > 0 && gap < minGap) {
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
  });
}

// 치명 10점: 치명타로 쓰러진 적이 터진다. 터진 피해로는 다시 터지지 않는다.
function critBlast(game, source, amount) {
  const blast = perk(game, 'crit', 10);
  if (!blast || game.critBlasting) return;
  game.critBlasting = true;
  for (const enemy of game.enemies) {
    if (enemy !== source && !enemy.dead && distance(enemy, source) < blast.blastRadius + enemy.radius) {
      damageEnemy(game, enemy, amount * blast.blastShare);
    }
  }
  game.critBlasting = false;
  addEffect(game, { type: 'ring', x: source.x, y: source.y, radius: blast.blastRadius, color: 'crit', life: 0.3 });
}

export function damageEnemy(game, enemy, amount, knockback = 0, from = game.player) {
  if (enemy.dead) return;
  // 치명타. 확률이 없으면 난수를 쓰지 않는다.
  // 치명 5점: 보스와 정예에게는 확률이 더 높다(고무망치가 있으면 치명타가 없으니 빼고).
  const weakSpot = (enemy.boss || enemy.elite) && !relic(game, 'mallet') ? perk(game, 'crit', 5)?.eliteCrit ?? 0 : 0;
  const chance = critChanceOf(game) + weakSpot;
  const crit = chance > 0 && game.random() < chance;
  if (crit) amount *= critDamageOf(game);
  if (crit && !enemy.boss && perk(game, 'crit', 20)) enemy.chillUntil = game.time + BUILD.crit.perks[20].stun;
  if (enemy.boss) amount *= 1 + (relic(game, 'lamp')?.bossDamage ?? 0);
  enemy.hp -= amount;
  // 얼음틀: 한 대씩 때리는 공격만 얼린다(매 순간 조금씩 닿는 공격은 빼고).
  const ice = relic(game, 'icetray');
  if (ice && !enemy.boss && amount >= 3 && game.random() < ice.chance) enemy.chillUntil = game.time + ice.freezeSec;
  enemy.hitFlash = 0.1;
  if (amount >= 6) {
    addEffect(game, { type: 'number', x: enemy.x + (game.random() - 0.5) * 14, y: enemy.y - enemy.radius, value: Math.round(amount),
      life: crit ? 0.8 : 0.6, crit });
    if (crit) addEffect(game, { type: 'burst', x: enemy.x, y: enemy.y - enemy.radius, color: 'crit', count: 6, life: 0.35 });
    addEffect(game, { type: 'burst', x: enemy.x, y: enemy.y, color: enemy.kind, count: 3, life: 0.3 });
  }
  if (knockback > 0 && !enemy.boss) {
    const gap = distance(enemy, from) || 1;
    // 정예는 무거워서 절반만 밀린다.
    const push = knockback * 8 * (enemy.elite ? 0.5 : 1);
    enemy.kx += ((enemy.x - from.x) / gap) * push;
    enemy.ky += ((enemy.y - from.y) / gap) * push;
  }
  if (enemy.hp <= 0) {
    killEnemy(game, enemy);
    if (crit) critBlast(game, enemy, amount);
  }
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
  const popcorn = relic(game, 'popcorn');
  // 팝콘 기계: 터진 팝콘이 또 터지는 건 두 번까지만 이어진다.
  if (popcorn && (game.popDepth ?? 0) < 2 && game.random() < popcorn.chance) {
    game.popDepth = (game.popDepth ?? 0) + 1;
    const damage = relicDamage(game, popcorn.damage);
    addEffect(game, { type: 'ring', x: enemy.x, y: enemy.y, radius: popcorn.radius, color: 'gold', life: 0.3 });
    addEffect(game, { type: 'burst', x: enemy.x, y: enemy.y, color: 'popcorn', count: 10, life: 0.4 });
    for (const other of game.enemies) {
      if (other !== enemy && !other.dead && distance(other, enemy) < popcorn.radius + other.radius) damageEnemy(game, other, damage, 10, enemy);
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

function weaponValue(game, id, key) {
  const scale = evolution(game, id)?.[key];
  const might = key === 'damage' || key === 'dps' ? mightOf(game) : 1;
  const steady = 1;
  // 고정 피해는 한 대씩 때리는 무기(damage)에만 붙는다. 계속 닿는 무기(dps)는 빼야 매 순간 더해지지 않는다.
  const flat = key === 'damage' ? flatDamageOf(game) : 0;
  const echo = key === 'damage' && game.echoing === id ? RELICS.twin.echoDamage : 1;
  return (WEAPONS[id][key][game.weapons[id] - 1] * might * steady
    * (typeof scale === 'number' && key !== 'count' && key !== 'chains' ? scale : 1) + flat) * echo;
}

function nearestEnemies(game, count, maxDistance = 560) {
  return game.enemies
    .filter((enemy) => !enemy.dead && distance(enemy, game.player) < maxDistance)
    .sort((a, b) => distance(a, game.player) - distance(b, game.player))
    .slice(0, count);
}

function ready(game, id, dt) {
  const cooldown = WEAPONS[id].cooldown[game.weapons[id] - 1] * statsOf(game).cooldownScale;
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
  if (!level) return [];
  const count = WEAPONS.coil.count[level - 1];
  const orbit = WEAPONS.coil.orbit[level - 1] * statsOf(game).area;
  const ringAt = (radius, total, spin) => Array.from({ length: total }, (_, index) => {
    const angle = game.time * spin + (index / total) * Math.PI * 2;
    return { x: game.player.x + Math.cos(angle) * radius, y: game.player.y + Math.sin(angle) * radius };
  });
  const outer = evolution(game, 'coil')?.outer;
  const fire = fusion(game, 'firering');
  const { spin } = WEAPONS.coil;
  return [...ringAt(orbit, count, spin), ...(outer ? ringAt(orbit * outer, count + 2, -spin * 0.75) : []),
    ...(fire ? ringAt(orbit * fire.outer, count + 5, 1.6) : [])];
}

// 회전 톱날의 지금 위치. 궤도가 넓어졌다 좁아졌다 하며 화면을 크게 돈다.
// 도탄 톱날의 지금 위치와 크기(그리기용)
export function sawBlades(game) {
  const saw = fusion(game, 'sawblade');
  if (!saw) return [];
  const { area, projectile } = statsOf(game);
  return (game.saws ?? []).map((blade) => ({ ...blade, radius: saw.radius * area * projectile }));
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
  const radius = saw.radius * area * projectile;
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
      for (const enemy of game.enemies) {
        if (enemy.dead || enemy.id === blade.last || taken.has(enemy.id)) continue;
        const gap = distance(enemy, from);
        if (gap < bestGap) {
          bestGap = gap;
          best = enemy;
        }
      }
      return best;
    };
    if (blade.target?.dead) blade.target = null;
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
    const step = Math.min(gap, saw.speed * dt);
    blade.vx = ((goal.x - blade.x) / gap) * saw.speed;
    blade.vy = ((goal.y - blade.y) / gap) * saw.speed;
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
    damageEnemy(game, victim, damage, 8, blade);
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
    damageEnemy(game, enemy, enemy.bleedDps * dt);
  }
}

function fireWeapons(game, dt) {
  const { player } = game;
  const { area, projectile } = statsOf(game);
  // 독침 기관총으로 합체하면 살충제는 따로 뿌리지 않는다.
  if (game.weapons.spray && !game.fusions.poisongun && ready(game, 'spray', dt)) {
    const count = weaponValue(game, 'spray', 'count');
    const targets = nearestEnemies(game, count);
    for (let index = 0; index < count; index += 1) {
      const target = targets[index % Math.max(1, targets.length)];
      const angle = target
        ? Math.atan2(target.y - player.y, target.x - player.x) + (targets.length < count ? (index - 1) * 0.25 : 0)
        : (player.facing > 0 ? 0 : Math.PI) + (index - 1) * 0.25;
      const { speed, lifeSec } = WEAPONS.spray;
      game.shots.push({ x: player.x, y: player.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        damage: weaponValue(game, 'spray', 'damage'), pierce: evolution(game, 'spray') ? 99 : weaponValue(game, 'spray', 'pierce'),
        life: lifeSec, radius: 7 * projectile, scale: projectile, hit: new Set(), mega: Boolean(evolution(game, 'spray')) });
    }
    const ringShots = evolution(game, 'spray')?.ring ?? 0;
    for (let index = 0; index < ringShots; index += 1) {
      const angle = (index / ringShots) * Math.PI * 2 + game.time;
      game.shots.push({ x: player.x, y: player.y, vx: Math.cos(angle) * WEAPONS.spray.speed, vy: Math.sin(angle) * WEAPONS.spray.speed,
        damage: weaponValue(game, 'spray', 'damage'), pierce: 99, life: WEAPONS.spray.lifeSec, radius: 7 * projectile,
        scale: projectile, hit: new Set(), mega: true });
    }
  }
  if (game.weapons.broom && ready(game, 'broom', dt)) {
    const radius = weaponValue(game, 'broom', 'radius') * area;
    const damage = weaponValue(game, 'broom', 'damage');
    for (const enemy of game.enemies) {
      if (distance(enemy, player) < radius + enemy.radius) damageEnemy(game, enemy, damage, WEAPONS.broom.knockback);
    }
    addEffect(game, { type: 'sweep', x: player.x, y: player.y, radius, life: 0.28, facing: player.facing,
      mega: Boolean(evolution(game, 'broom')) });
    if (evolution(game, 'broom') && !game.broomEcho) {
      game.broomEcho = true;
      game.cooldowns.broom = 0.3;
    } else if (game.broomEcho) {
      game.broomEcho = false;
    }
  }
  if (game.weapons.bleach && ready(game, 'bleach', dt)) {
    const candidates = nearestEnemies(game, 12, 380);
    for (let index = 0; index < weaponValue(game, 'bleach', 'count'); index += 1) {
      const target = candidates.length > 0 ? candidates[Math.floor(game.random() * candidates.length)]
        : { x: player.x + (game.random() - 0.5) * 200, y: player.y + (game.random() - 0.5) * 200 };
      addEffect(game, { type: 'ring', x: target.x, y: target.y, radius: weaponValue(game, 'bleach', 'radius') * area,
        color: 'teal', life: 0.3 });
      game.puddles.push({ x: target.x, y: target.y, radius: weaponValue(game, 'bleach', 'radius') * area,
        dps: weaponValue(game, 'bleach', 'dps'), life: evolution(game, 'bleach')?.lifeSec ?? WEAPONS.bleach.lifeSec,
        maxLife: WEAPONS.bleach.lifeSec, slow: evolution(game, 'bleach')?.slow });
    }
  }
  if (game.weapons.dehumidifier) {
    const radius = weaponValue(game, 'dehumidifier', 'radius') * area;
    const damage = weaponValue(game, 'dehumidifier', 'dps') * dt;
    for (const enemy of game.enemies) {
      if (distance(enemy, player) > radius + enemy.radius) continue;
      damageEnemy(game, enemy, damage);
      slow(game, enemy, evolution(game, 'dehumidifier')?.slow);
    }
  }
  // 파리채 폭격기로 합체하면 파리채는 종이비행기를 따라서만 내려친다.
  if (game.weapons.swatter && !game.fusions.bomber && ready(game, 'swatter', dt)) {
    const targets = game.enemies
      .filter((enemy) => !enemy.dead && distance(enemy, player) < 420)
      .sort((a, b) => b.hp - a.hp)
      .slice(0, evolution(game, 'swatter')?.targets ?? 1);
    const radius = weaponValue(game, 'swatter', 'radius') * area;
    const damage = weaponValue(game, 'swatter', 'damage');
    for (const target of targets) {
      const center = { x: target.x, y: target.y };
      for (const enemy of game.enemies) {
        if (distance(enemy, center) < radius + enemy.radius) damageEnemy(game, enemy, damage, 20, center);
      }
      addEffect(game, { type: 'swat', x: center.x, y: center.y, radius, life: 0.35, mega: Boolean(evolution(game, 'swatter')) });
    }
    if (targets.length === 0) game.cooldowns.swatter = 0.2;
  }
  if (game.weapons.slipper && ready(game, 'slipper', dt)) {
    const storm = evolution(game, 'slipper');
    const count = storm ? storm.count : weaponValue(game, 'slipper', 'count');
    const target = nearestEnemies(game, 1)[0];
    const baseAngle = target ? Math.atan2(target.y - player.y, target.x - player.x) : (player.facing > 0 ? 0 : Math.PI);
    for (let index = 0; index < count; index += 1) {
      const angle = storm ? baseAngle + (index / count) * Math.PI * 2 : baseAngle + (index - (count - 1) / 2) * 0.6;
      const { speed, rangeSec } = WEAPONS.slipper;
      game.slippers.push({ x: player.x, y: player.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        damage: weaponValue(game, 'slipper', 'damage'), outFor: rangeSec, returning: false, radius: 10 * projectile,
        scale: projectile,
        spin: 0, hit: new Set() });
    }
  }
  if (game.weapons.coil) {
    const fire = fusion(game, 'firering');
    const damage = weaponValue(game, 'coil', 'damage') * (fire?.damage ?? 1);
    if (fire) {
      game.novaIn = (game.novaIn ?? fire.novaEverySec) - dt;
      if (game.novaIn <= 0) {
        game.novaIn = fire.novaEverySec * statsOf(game).cooldownScale;
        const radius = fire.novaRadius * area;
        const burn = weaponValue(game, 'dryer', 'dps') * fire.nova;
        for (const enemy of game.enemies) {
          if (!enemy.dead && distance(enemy, player) < radius + enemy.radius) damageEnemy(game, enemy, burn, 30);
        }
        addEffect(game, { type: 'nova', x: player.x, y: player.y, radius, life: 0.55 });
        game.shake = Math.max(game.shake, 0.15);
      }
    }
    for (const orb of coilOrbs(game)) {
      for (const enemy of game.enemies) {
        if (enemy.dead || distance(enemy, orb) > 11 * projectile + enemy.radius) continue;
        if (game.time - (enemy.coilHitAt ?? -9) < WEAPONS.coil.hitEverySec) continue;
        enemy.coilHitAt = game.time;
        damageEnemy(game, enemy, damage, 8, orb);
      }
    }
  }
  if (game.weapons.zapper && ready(game, 'zapper', dt)) {
    const damage = weaponValue(game, 'zapper', 'damage');
    const points = [{ x: player.x, y: player.y }];
    const hit = new Set();
    let from = player;
    let reach = 300;
    const chains = evolution(game, 'zapper')?.chains ?? weaponValue(game, 'zapper', 'chains');
    for (let jump = 0; jump < chains; jump += 1) {
      let next = null;
      let best = reach;
      for (const enemy of game.enemies) {
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
      damageEnemy(game, next, damage);
      from = next;
      reach = WEAPONS.zapper.jump * area * (evolution(game, 'zapper')?.jump ?? 1);
    }
    if (points.length > 1) addEffect(game, { type: 'bolt', points, life: 0.22, mega: Boolean(evolution(game, 'zapper')) });
    else game.cooldowns.zapper = 0.2;
  }
  if (game.weapons.detergent && ready(game, 'detergent', dt)) {
    const count = weaponValue(game, 'detergent', 'count') * (evolution(game, 'detergent') ? 2 : 1);
    const { speed, lifeSec } = WEAPONS.detergent;
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2 + game.random() * 0.8;
      const pace = speed * (0.7 + game.random() * 0.6);
      game.shots.push({ x: player.x, y: player.y, vx: Math.cos(angle) * pace, vy: Math.sin(angle) * pace,
        damage: weaponValue(game, 'detergent', 'damage'), pierce: 0, life: lifeSec, radius: 9 * projectile, scale: projectile,
        hit: new Set(), kind: 'bubble',
        pop: weaponValue(game, 'detergent', 'radius') * area, mega: Boolean(evolution(game, 'detergent')), seed: game.nextId++ });
    }
  }
  if (game.weapons.roller && ready(game, 'roller', dt)) {
    const { speed, lifeSec } = WEAPONS.roller;
    const forward = player.heading ?? (player.facing > 0 ? 0 : Math.PI);
    for (const angle of evolution(game, 'roller') ? [forward, forward + Math.PI] : [forward]) {
      game.shots.push({ x: player.x, y: player.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        damage: weaponValue(game, 'roller', 'damage'), pierce: 999, life: lifeSec, radius: weaponValue(game, 'roller', 'size') * area * projectile,
        hit: new Set(), kind: 'roller', knockback: 14, mega: Boolean(evolution(game, 'roller')) });
    }
  }
  if (game.weapons.dryer) {
    const range = weaponValue(game, 'dryer', 'range') * area;
    // 물티슈가 바람이 퍼지는 폭도 넓힌다.
    const spread = Math.min(1.3, (evolution(game, 'dryer')?.wide ?? WEAPONS.dryer.spread) * area);
    const damage = weaponValue(game, 'dryer', 'dps') * dt;
    const target = nearestEnemies(game, 1, range + 40)[0];
    const wanted = target ? Math.atan2(target.y - player.y, target.x - player.x) : (player.facing > 0 ? 0 : Math.PI);
    const current = game.dryerAngle ?? wanted;
    const turn = Math.atan2(Math.sin(wanted - current), Math.cos(wanted - current));
    game.dryerAngle = current + clamp(turn, -6 * dt, 6 * dt);
    game.dryerOn = Boolean(target);
    game.dryerRange = range;
    game.dryerSpread = spread;
    if (target) {
      for (const enemy of game.enemies) {
        if (enemy.dead || distance(enemy, player) > range + enemy.radius) continue;
        const toEnemy = Math.atan2(enemy.y - player.y, enemy.x - player.x);
        const diff = Math.abs(Math.atan2(Math.sin(toEnemy - game.dryerAngle), Math.cos(toEnemy - game.dryerAngle)));
        if (diff < spread) damageEnemy(game, enemy, damage);
      }
    }
  }
  if (game.weapons.fan && ready(game, 'fan', dt)) {
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
      if (diff < cone || evolution(game, 'fan')) damageEnemy(game, enemy, damage, WEAPONS.fan.knockback);
    }
    addEffect(game, { type: 'gust', x: player.x, y: player.y, angle, range, cone, life: 0.35,
      mega: Boolean(evolution(game, 'fan')) });
  }
  const spin = fusion(game, 'spinlaser');
  if (game.weapons.laser && spin) {
    // 합체하면 쏘고 꺼지는 대신 줄기가 켜진 채로 돈다.
    const width = weaponValue(game, 'laser', 'width') * area * projectile;
    const damage = weaponValue(game, 'laser', 'damage') * spin.dps * dt;
    game.spinAngle = (game.spinAngle ?? 0) + spin.turn * dt;
    game.spinLaser = { count: spin.count, length: spin.length, width };
    for (let index = 0; index < spin.count; index += 1) {
      const angle = game.spinAngle + (index / spin.count) * Math.PI * 2;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      for (const enemy of game.enemies) {
        if (enemy.dead) continue;
        const rx = enemy.x - player.x;
        const ry = enemy.y - player.y;
        const along = rx * dx + ry * dy;
        if (along < -enemy.radius || along > spin.length) continue;
        if (Math.abs(rx * dy - ry * dx) < width / 2 + enemy.radius) damageEnemy(game, enemy, damage);
      }
    }
  } else if (game.weapons.laser && ready(game, 'laser', dt)) {
    const show = evolution(game, 'laser');
    const count = show ? show.count : weaponValue(game, 'laser', 'count');
    const width = weaponValue(game, 'laser', 'width') * area * projectile;
    const damage = weaponValue(game, 'laser', 'damage');
    const { length } = WEAPONS.laser;
    const base = game.random() * Math.PI * 2;
    for (let index = 0; index < count; index += 1) {
      // 완성형은 고르게 펼치고, 그 전에는 줄기마다 아무 방향이나 고른다.
      const angle = show ? base + (index / count) * Math.PI * 2 : index === 0 ? base : game.random() * Math.PI * 2;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      for (const enemy of game.enemies) {
        if (enemy.dead) continue;
        const rx = enemy.x - player.x;
        const ry = enemy.y - player.y;
        const along = rx * dx + ry * dy;
        if (along < -enemy.radius || along > length) continue;
        if (Math.abs(rx * dy - ry * dx) < width / 2 + enemy.radius) damageEnemy(game, enemy, damage, 4);
      }
      addEffect(game, { type: 'laser', x: player.x, y: player.y, angle, length, width, life: 0.34, mega: Boolean(show) });
    }
    game.shake = Math.max(game.shake, 0.08);
  }
  if (game.weapons.stapler && ready(game, 'stapler', dt)) {
    const nailer = evolution(game, 'stapler');
    const forward = player.heading ?? (player.facing > 0 ? 0 : Math.PI);
    const { speed, lifeSec, spread } = WEAPONS.stapler;
    const venom = fusion(game, 'poisongun');
    const sides = venom ? Array.from({ length: venom.shots }, (_, index) => index - (venom.shots - 1) / 2) : nailer ? [-1, 1] : [0];
    for (const side of sides) {
      const angle = forward + (venom ? side * venom.spread : 0) + (game.random() - 0.5) * 2 * spread;
      game.shots.push({
        x: player.x + Math.cos(forward) * 12 - Math.sin(forward) * side * 7,
        y: player.y + Math.sin(forward) * 12 + Math.cos(forward) * side * 7,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, damage: weaponValue(game, 'stapler', 'damage') * (venom?.damage ?? 1),
        pierce: venom ? venom.pierce : nailer ? nailer.pierce : 0, life: lifeSec, radius: 5 * projectile, scale: projectile,
        homing: venom?.homing, speed,
        poison: venom ? weaponValue(game, 'spray', 'damage') * venom.poison : 0,
        hit: new Set(), kind: 'staple', knockback: 3,
        mega: Boolean(nailer),
      });
    }
    game.staplerAt = game.time;
  }
  if (game.fusions.dryoven) {
    for (const enemy of game.enemies) {
      enemy.burning = !enemy.dead && (enemy.burnUntil ?? 0) > game.time;
      if (enemy.burning) damageEnemy(game, enemy, enemy.burnDps * dt);
    }
  }
  if (game.fusions.poisongun) {
    for (const enemy of game.enemies) {
      enemy.poisoned = !enemy.dead && (enemy.poisonUntil ?? 0) > game.time;
      if (enemy.poisoned) damageEnemy(game, enemy, enemy.poisonDps * dt);
    }
  }
  if (game.weapons.ball) {
    const big = evolution(game, 'ball');
    const count = big ? big.count : weaponValue(game, 'ball', 'count');
    while (game.balls.length < count) {
      const angle = game.random() * Math.PI * 2;
      game.balls.push({ id: game.nextId++, x: player.x, y: player.y, dx: Math.cos(angle), dy: Math.sin(angle), bounce: 0 });
    }
    game.balls.length = count;
    const speed = weaponValue(game, 'ball', 'speed');
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
      ball.x += ball.dx * speed * dt;
      ball.y += ball.dy * speed * dt;
      const before = ball.dx * 2 + ball.dy;
      if (ball.x < player.x - halfW) { ball.x = player.x - halfW; ball.dx = Math.abs(ball.dx); }
      if (ball.x > player.x + halfW) { ball.x = player.x + halfW; ball.dx = -Math.abs(ball.dx); }
      if (ball.y < player.y - halfH) { ball.y = player.y - halfH; ball.dy = Math.abs(ball.dy); }
      if (ball.y > player.y + halfH) { ball.y = player.y + halfH; ball.dy = -Math.abs(ball.dy); }
      if (before !== ball.dx * 2 + ball.dy) {
        ball.bounce = 0.12;
        addEffect(game, { type: 'burst', x: ball.x, y: ball.y, color: big ? 'gold' : 'ball', count: 5, life: 0.3 });
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
            damageEnemy(game, enemy, zap);
          }
          if (blast) addEffect(game, { type: 'ring', x: ball.x, y: ball.y, radius: reach, color: 'spark', life: 0.3 });
        }
      }
      for (const enemy of game.enemies) {
        if (enemy.dead || distance(enemy, ball) > radius + enemy.radius) continue;
        enemy.ballHitAt ??= {};
        if (game.time - (enemy.ballHitAt[ball.id] ?? -9) < WEAPONS.ball.hitEverySec) continue;
        enemy.ballHitAt[ball.id] = game.time;
        damageEnemy(game, enemy, damage, 12, ball);
      }
    }
  }
  if (game.weapons.robot) {
    const squad = evolution(game, 'robot');
    const count = squad ? squad.count : weaponValue(game, 'robot', 'count');
    while (game.robots.length < count) {
      game.robots.push({ id: game.nextId++, x: player.x, y: player.y, angle: 0 });
    }
    game.robots.length = count;
    const sanitizer = fusion(game, 'bleachbot');
    const speed = weaponValue(game, 'robot', 'speed') * (sanitizer?.speed ?? 1);
    const damage = weaponValue(game, 'robot', 'damage') * (sanitizer?.damage ?? 1);
    const reach = WEAPONS.robot.radius * area;
    game.robots.forEach((robot, index) => {
      // 오리 근처의 적 가운데 자기와 가장 가까운 적을 쫓고, 없으면 오리 곁을 맴돈다.
      let target = null;
      let best = Infinity;
      for (const enemy of game.enemies) {
        if (enemy.dead || distance(enemy, player) > 300) continue;
        // 여러 대가 한 마리에 몰리지 않게 대마다 선호가 조금씩 다르다.
        const gap = distance(enemy, robot) + ((enemy.id + index) % count) * 60;
        if (gap < best) {
          best = gap;
          target = enemy;
        }
      }
      const idle = game.time * 1.6 + (index / count) * Math.PI * 2;
      const goal = target ?? { x: player.x + Math.cos(idle) * 56, y: player.y + Math.sin(idle) * 56 };
      const gap = distance(goal, robot);
      if (distance(robot, player) > 620) {
        robot.x = player.x;
        robot.y = player.y;
      } else if (gap > 2) {
        const step = Math.min(gap, speed * dt);
        robot.x += ((goal.x - robot.x) / gap) * step;
        robot.y += ((goal.y - robot.y) / gap) * step;
        robot.angle = Math.atan2(goal.y - robot.y, goal.x - robot.x);
      }
      robot.busy = Boolean(target);
      if (sanitizer) {
        robot.dropIn = (robot.dropIn ?? 0) - dt;
        if (robot.dropIn <= 0) {
          robot.dropIn = sanitizer.dropEverySec;
          game.puddles.push({ x: robot.x, y: robot.y, radius: sanitizer.radius * area,
            dps: weaponValue(game, 'bleach', 'dps') * sanitizer.dps, life: sanitizer.lifeSec, maxLife: sanitizer.lifeSec,
            slow: sanitizer.slow });
        }
      }
      for (const enemy of game.enemies) {
        if (enemy.dead || distance(enemy, robot) > reach + enemy.radius) continue;
        if (game.time - (enemy.robotHitAt ?? -9) < WEAPONS.robot.hitEverySec) continue;
        enemy.robotHitAt = game.time;
        damageEnemy(game, enemy, damage, 3, robot);
      }
    });
  }
  if (game.weapons.towel && ready(game, 'towel', dt)) {
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
          damageEnemy(game, enemy, damage, WEAPONS.towel.knockback);
          if (!enemy.boss) {
            enemy.slowUntil = Math.max(enemy.slowUntil ?? 0, game.time + WEAPONS.towel.slowSec);
            enemy.slowBy = WEAPONS.towel.slow;
          }
        }
      }
      addEffect(game, { type: 'towel', x: player.x, y: player.y, dir, length, height, life: 0.25, mega: Boolean(beach) });
    }
  }
  if (game.weapons.paperplane && ready(game, 'paperplane', dt)) {
    const crane = evolution(game, 'paperplane');
    const count = crane ? crane.count : weaponValue(game, 'paperplane', 'count');
    const { speed, turn, lifeSec } = WEAPONS.paperplane;
    const forward = player.heading ?? (player.facing > 0 ? 0 : Math.PI);
    for (let index = 0; index < count; index += 1) {
      const angle = forward + (index - (count - 1) / 2) * 0.5;
      game.shots.push({ x: player.x, y: player.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        damage: weaponValue(game, 'paperplane', 'damage'), pierce: crane ? crane.pierce : 0, life: lifeSec, radius: 8 * projectile,
        bomb: fusion(game, 'bomber') ? { damage: weaponValue(game, 'swatter', 'damage') * FUSIONS.bomber.damage, radius: FUSIONS.bomber.radius * area } : null,
        scale: projectile, hit: new Set(), kind: 'plane', homing: turn, speed, knockback: 4, mega: Boolean(crane) });
    }
  }
  if (game.weapons.mousetrap) {
    const sticky = evolution(game, 'mousetrap');
    if (ready(game, 'mousetrap', dt)) {
      const { lifeSec, maxTraps } = WEAPONS.mousetrap;
      for (let index = 0; index < weaponValue(game, 'mousetrap', 'count'); index += 1) {
        const angle = game.random() * Math.PI * 2;
        const reach = 40 + game.random() * 110;
        game.traps.push({ x: player.x + Math.cos(angle) * reach, y: player.y + Math.sin(angle) * reach, armIn: 0.4, life: lifeSec,
          radius: weaponValue(game, 'mousetrap', 'radius') * area, damage: weaponValue(game, 'mousetrap', 'damage'), mega: Boolean(sticky) });
      }
      if (game.traps.length > maxTraps) game.traps.splice(0, game.traps.length - maxTraps);
    }
    for (const trap of game.traps) {
      trap.armIn -= dt;
      trap.life -= dt;
      if (trap.armIn > 0) continue;
      if (!game.enemies.some((enemy) => !enemy.dead && distance(enemy, trap) < trap.radius + enemy.radius * 0.6)) continue;
      // 탁! 덫 둘레의 적을 모두 문다.
      for (const enemy of game.enemies) {
        if (!enemy.dead && distance(enemy, trap) < trap.radius * 1.5 + enemy.radius) damageEnemy(game, enemy, trap.damage, 4, trap);
      }
      addEffect(game, { type: 'slam', x: trap.x, y: trap.y, radius: trap.radius * 1.5, life: 0.3 });
      const foam = fusion(game, 'foammine');
      if (foam) {
        // 거품 지뢰: 닫힌 덫에서 거품이 사방으로 터져 나간다.
        for (let index = 0; index < foam.bubbles; index += 1) {
          const angle = (index / foam.bubbles) * Math.PI * 2;
          game.shots.push({ x: trap.x, y: trap.y, vx: Math.cos(angle) * 140, vy: Math.sin(angle) * 140,
            damage: weaponValue(game, 'detergent', 'damage'), pierce: 0, life: 1.4, radius: 9 * projectile, scale: projectile, hit: new Set(),
            kind: 'bubble', pop: weaponValue(game, 'detergent', 'radius') * area, mega: true, seed: game.nextId++ });
        }
      }
      addEffect(game, { type: 'burst', x: trap.x, y: trap.y, color: 'trap', count: 8, life: 0.35 });
      trap.life = 0;
    }
    game.traps = game.traps.filter((trap) => trap.life > 0);
  }
  if (game.weapons.microwave) {
    if (ready(game, 'microwave', dt)) {
      const max = weaponValue(game, 'microwave', 'radius') * area;
      const oven = Boolean(fusion(game, 'dryoven'));
      // 건조 오븐이면 조금 늦게 출발하는 두 번째 파동이 따라간다(r이 음수인 동안은 보이지 않는다).
      for (const start of oven ? [8, -max * 0.45] : [8]) {
        game.waves.push({ x: player.x, y: player.y, r: start, max, speed: max / WEAPONS.microwave.growSec,
          damage: weaponValue(game, 'microwave', 'damage'), hit: new Set(), mega: Boolean(evolution(game, 'microwave')), oven });
      }
    }
    for (const wave of game.waves) {
      wave.r += wave.speed * dt;
      for (const enemy of game.enemies) {
        if (enemy.dead || wave.hit.has(enemy.id)) continue;
        const gap = distance(enemy, wave);
        if (gap - enemy.radius < wave.r && gap + enemy.radius > wave.r - 20) {
          wave.hit.add(enemy.id);
          damageEnemy(game, enemy, wave.damage, 6, wave);
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
  if (game.weapons.shower) {
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
      for (const enemy of game.enemies) {
        if (!enemy.dead && distance(enemy, splash) < splash.radius + enemy.radius) damageEnemy(game, enemy, splash.damage, 4, splash);
      }
      addEffect(game, { type: 'ring', x: splash.x, y: splash.y, radius: splash.radius, color: 'water', life: 0.3 });
      const shock = fusion(game, 'shockshower');
      if (shock) {
        // 감전 샤워: 젖은 자리에서 가까운 적 셋에게 전기가 튄다.
        const struck = game.enemies
          .filter((enemy) => !enemy.dead && distance(enemy, splash) < shock.range * area)
          .sort((a, b) => distance(a, splash) - distance(b, splash))
          .slice(0, shock.targets);
        for (const enemy of struck) {
          addEffect(game, { type: 'bolt', points: [{ x: splash.x, y: splash.y }, { x: enemy.x, y: enemy.y }], life: 0.18, mega: true });
          damageEnemy(game, enemy, weaponValue(game, 'zapper', 'damage') * shock.damage);
        }
      }
      addEffect(game, { type: 'burst', x: splash.x, y: splash.y, color: 'water', count: 8, life: 0.35 });
    }
    game.splashes = game.splashes.filter((splash) => splash.delay > 0);
  }
  const mop = fusion(game, 'mopstorm');
  if (mop) {
    game.mopIn = (game.mopIn ?? mop.everySec) - dt;
    if (game.mopIn <= 0) {
      // 물걸레 회오리: 주위를 한 바퀴 휘감고, 맞은 적을 오리 쪽으로 끌어당긴다.
      game.mopIn = mop.everySec * statsOf(game).cooldownScale;
      const radius = weaponValue(game, 'towel', 'length') * area;
      const damage = weaponValue(game, 'towel', 'damage') * mop.damage;
      for (const enemy of game.enemies) {
        const gap = distance(enemy, player);
        if (enemy.dead || gap > radius + enemy.radius) continue;
        damageEnemy(game, enemy, damage);
        if (!enemy.boss && gap > 30) {
          enemy.kx -= ((enemy.x - player.x) / gap) * mop.pull * 8;
          enemy.ky -= ((enemy.y - player.y) / gap) * mop.pull * 8;
        }
      }
      addEffect(game, { type: 'sweep', x: player.x, y: player.y, radius, life: 0.35, facing: player.facing, mega: true });
      addEffect(game, { type: 'ring', x: player.x, y: player.y, radius, color: 'water', life: 0.35 });
    }
  }
  updateSaws(game, dt);
}

function updateProjectiles(game, dt) {
  for (const shot of game.shots) {
    if (shot.homing) {
      // 종이비행기: 가장 가까운 적 쪽으로 조금씩 방향을 튼다.
      let target = null;
      let best = 420;
      for (const enemy of game.enemies) {
        if (enemy.dead || shot.hit.has(enemy.id)) continue;
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
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    for (const enemy of game.enemies) {
      if (shot.life <= 0) break;
      if (enemy.dead || shot.hit.has(enemy.id) || distance(shot, enemy) > shot.radius + enemy.radius) continue;
      shot.hit.add(enemy.id);
      if (shot.pop) {
        for (const other of game.enemies) {
          if (!other.dead && distance(other, shot) < shot.pop + other.radius) damageEnemy(game, other, shot.damage, 4, shot);
        }
        addEffect(game, { type: 'ring', x: shot.x, y: shot.y, radius: shot.pop, color: 'bubble', life: 0.3 });
        addEffect(game, { type: 'burst', x: shot.x, y: shot.y, color: 'bubble', count: 6, life: 0.35 });
        shot.life = 0;
        break;
      }
      damageEnemy(game, enemy, shot.damage, shot.knockback ?? 6, shot);
      if (shot.bomb) {
        // 파리채 폭격기: 비행기가 맞힌 자리를 파리채가 함께 내려친다.
        for (const other of game.enemies) {
          if (other !== enemy && !other.dead && distance(other, enemy) < shot.bomb.radius + other.radius) damageEnemy(game, other, shot.bomb.damage, 10, enemy);
        }
        damageEnemy(game, enemy, shot.bomb.damage, 10, shot);
        addEffect(game, { type: 'swat', x: enemy.x, y: enemy.y, radius: shot.bomb.radius, life: 0.3, mega: true });
      }
      if (shot.poison) {
        enemy.poisonUntil = game.time + FUSIONS.poisongun.poisonSec;
        enemy.poisonDps = shot.poison;
      }
      if (shot.hit.size > shot.pierce) shot.life = 0;
    }
  }
  game.shots = game.shots.filter((shot) => shot.life > 0);

  for (const slipper of game.slippers) {
    slipper.spin += dt * 14;
    if (!slipper.returning) {
      slipper.outFor -= dt;
      if (slipper.outFor <= 0) {
        slipper.returning = true;
        slipper.hit.clear();
      }
    } else {
      const gap = distance(slipper, game.player) || 1;
      const speed = WEAPONS.slipper.speed * 1.15;
      slipper.vx = ((game.player.x - slipper.x) / gap) * speed;
      slipper.vy = ((game.player.y - slipper.y) / gap) * speed;
      if (gap < 18) slipper.done = true;
    }
    slipper.x += slipper.vx * dt;
    slipper.y += slipper.vy * dt;
    for (const enemy of game.enemies) {
      if (enemy.dead || slipper.hit.has(enemy.id) || distance(slipper, enemy) > slipper.radius + enemy.radius) continue;
      slipper.hit.add(enemy.id);
      damageEnemy(game, enemy, slipper.damage, 10, slipper);
    }
  }
  game.slippers = game.slippers.filter((slipper) => !slipper.done);

  for (const puddle of game.puddles) {
    puddle.life -= dt;
    for (const enemy of game.enemies) {
      if (distance(enemy, puddle) > puddle.radius + enemy.radius * 0.5) continue;
      damageEnemy(game, enemy, puddle.dps * dt);
      slow(game, enemy, puddle.slow);
    }
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
  for (const enemy of game.enemies) {
    if (!enemy.dead && !enemy.frozen && distance(enemy, game.player) < enemy.radius + PLAYER.radius) {
      strongest = Math.max(strongest, enemy.damage);
    }
  }
  if (strongest > 0 && damagePlayer(game, strongest)) {
    const scrubber = relic(game, 'scrubber');
    if (scrubber) {
      // 철수세미: 받은 피해를 주변 적에게 몇 배로 돌려준다.
      for (const enemy of game.enemies) {
        if (!enemy.dead && distance(enemy, game.player) < scrubber.radius + enemy.radius) {
          damageEnemy(game, enemy, strongest * scrubber.reflect * relicPowerOf(game), 30);
        }
      }
      addEffect(game, { type: 'ring', x: game.player.x, y: game.player.y, radius: scrubber.radius, color: 'spark', life: 0.3 });
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
  addEffect(game, { type: 'pickup', x: drop.x, y: drop.y, life: 0.4 });
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
      && (!PASSIVES[id].requires || game.passives[PASSIVES[id].requires]))
      .map((id) => ({ kind: 'passive', id, level: (game.passives[id] ?? 0) + 1, ...PASSIVES[id] })),
  ];
  const evolvable = Object.keys(WEAPONS).filter((id) => game.weapons[id] === MAX_LEVEL && !game.evolved[id])
    .map((id) => ({ kind: 'evolve', id, level: MAX_LEVEL + 1, ...EVOLUTIONS[id] }));
  // 두 완성형을 모두 갖추면 합체가 가장 먼저 나온다.
  const fusionRoom = Object.keys(game.fusions).length < MAX_FUSIONS;
  const fusable = Object.entries(FUSIONS)
    .filter(([id, recipe]) => fusionRoom && !game.fusions[id] && recipe.from.every((weapon) => game.evolved[weapon]))
    .map(([id, recipe]) => ({ kind: 'fusion', id, level: MAX_LEVEL + 2, ...recipe }));
  const special = [...shuffle(fusable, game.random), ...shuffle(evolvable, game.random)].slice(0, 1);
  const choices = [...special, ...shuffle(pool, game.random)].slice(0, 3)
    .map(({ kind, id, level, label, description }) => ({ kind, id, level, label, description }));
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
const weaponsFull = (game) => Object.keys(game.weapons).length >= MAX_WEAPONS;
const inFusion = (game, id) => Object.keys(game.fusions).some((fusionId) => FUSIONS[fusionId].from.includes(id));

// 무기를 내려놓는다. 그 무기가 남긴 공, 로봇, 슬리퍼, 쥐덫도 함께 치운다.
function dropWeapon(game, id) {
  delete game.weapons[id];
  delete game.evolved[id];
  delete game.cooldowns[id];
  if (id === 'ball') game.balls = [];
  if (id === 'robot') game.robots = [];
  if (id === 'slipper') game.slippers = [];
  if (id === 'mousetrap') game.traps = [];
  if (id === 'dryer') game.dryerOn = false;
}

// 아직 없는 보물 가운데 셋. 보물이 가득 찼으면 바꿀 수 있게 하고, 바꾸지 않는 카드를 하나 더 둔다.
export function rollRelics(game) {
  const offers = shuffle(Object.keys(RELICS).filter((id) => !game.relics[id]), game.random).slice(0, 3 + (perk(game, 'treasure', 20)?.offers ?? 0))
    .map((id) => ({ kind: 'relic', id, level: 0, label: RELICS[id].label, description: RELICS[id].description, details: RELICS[id].stats }));
  if (offers.length === 0) return [];
  return relicsFull(game) ? [...offers, { ...KEEP_RELICS }] : offers;
}

function gainRelic(game, id) {
  game.relics[id] = true;
  if (id === 'alarm') game.alarmIn = RELICS.alarm.everySec;
  if (id === 'firecracker') game.fireIn = RELICS.firecracker.everySec;
  if (id === 'pas') game.pasIn = RELICS.pas.everySec;
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

export function update(game, dt, input = { x: 0, y: 0 }) {
  if (game.over || game.choices) return game;
  game.time += dt;
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
        if (!enemy.dead && distance(enemy, game.player) < firecracker.radius + enemy.radius) damageEnemy(game, enemy, damage, 40);
      }
      addEffect(game, { type: 'nova', x: game.player.x, y: game.player.y, radius: firecracker.radius, life: 0.6 });
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
  if ((game.pendingLevels > 0 || game.pendingRelics > 0) && !game.over) {
    game.choices = nextChoices(game);
    game.rerollLeft = rerollsPerLevel(game);
  }
  return game;
}

// 직접 피해를 주는 보물: 물파스, 전기장판, 방향제, 빨래집게
function updateDamageRelics(game, dt) {
  const { player } = game;
  const pas = relic(game, 'pas');
  if (pas) {
    game.pasIn = (game.pasIn ?? pas.everySec) - dt;
    if (game.pasIn <= 0) {
      game.pasIn = relicEvery(game, pas.everySec);
      const damage = relicDamage(game, pas.damage);
      for (const enemy of game.enemies) {
        if (!enemy.dead && distance(enemy, player) < pas.radius + enemy.radius) damageEnemy(game, enemy, damage, 20);
      }
      addEffect(game, { type: 'nova', x: player.x, y: player.y, radius: pas.radius, life: 0.45, color: 'mint' });
      addEffect(game, { type: 'burst', x: player.x, y: player.y, color: 'teal', count: 16, life: 0.5 });
    }
  }
  const heat = relic(game, 'heatpad');
  if (heat) {
    const damage = relicDamage(game, heat.dps) * dt;
    for (const enemy of game.enemies) {
      if (!enemy.dead && distance(enemy, player) < heat.radius + enemy.radius) damageEnemy(game, enemy, damage);
    }
  }
  const fresh = relic(game, 'freshener');
  if (fresh) {
    game.freshIn = (game.freshIn ?? fresh.everySec) - dt;
    if (game.freshIn <= 0) {
      game.freshIn = relicEvery(game, fresh.everySec);
      const damage = relicDamage(game, fresh.damage);
      for (const enemy of game.enemies) {
        if (!enemy.dead && distance(enemy, player) < fresh.radius) damageEnemy(game, enemy, damage);
      }
      addEffect(game, { type: 'mist', x: player.x, y: player.y, radius: fresh.radius, life: 0.9 });
    }
  }
  const pin = relic(game, 'clothespin');
  if (pin && game.pins.length > 0) {
    for (const spot of game.pins) {
      spot.life -= dt;
      const victim = game.enemies.find((enemy) => !enemy.dead && distance(enemy, spot) < pin.radius * 0.5 + enemy.radius);
      if (!victim) continue;
      spot.life = 0;
      const damage = relicDamage(game, pin.damage);
      for (const enemy of game.enemies) {
        if (!enemy.dead && distance(enemy, spot) < pin.radius + enemy.radius) damageEnemy(game, enemy, damage, 6, spot);
      }
      addEffect(game, { type: 'snap', x: spot.x, y: spot.y, radius: pin.radius, life: 0.3 });
    }
    game.pins = game.pins.filter((spot) => spot.life > 0);
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
