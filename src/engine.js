import {
  ARENA, BOSS_EVERY_SEC, bossStatsOf, difficultyAt, DROPS, ENEMIES, MAX_LEVEL, PASSIVES, PLAYER, WEAPONS, xpToNext,
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
    enemyShots: [],
    puddles: [],
    slimes: [],
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
  };
}

function passiveValue(game, id, key) {
  const level = game.passives[id] ?? 0;
  return level === 0 ? 0 : PASSIVES[id][key][level - 1];
}

export function statsOf(game) {
  const coffee = game.time < game.coffeeUntil;
  return {
    speed: PLAYER.speed * (1 + passiveValue(game, 'sneakers', 'speed')) * (coffee ? 1.25 : 1),
    armor: passiveValue(game, 'gloves', 'armor'),
    pickupRadius: PLAYER.pickupRadius * (1 + passiveValue(game, 'vacuum', 'pickup')),
    maxHp: PLAYER.maxHp + passiveValue(game, 'vitamin', 'maxHp'),
    regen: passiveValue(game, 'vitamin', 'regen'),
    cooldownScale: (1 - passiveValue(game, 'battery', 'haste')) * (coffee ? 0.7 : 1),
    xpGain: 1 + passiveValue(game, 'candle', 'xpGain'),
    area: 1 + passiveValue(game, 'wipes', 'area'),
    luck: 1 + passiveValue(game, 'clover', 'luck'),
  };
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function addEffect(game, effect) {
  game.effects.push({ age: 0, ...effect });
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
  const reach = minDistance + game.random() * (maxDistance - minDistance);
  return { x: game.player.x + Math.cos(angle) * reach, y: game.player.y + Math.sin(angle) * reach };
}

function pickKind(game) {
  const available = Object.entries(ENEMIES).filter(([, enemy]) => enemy.weight > 0 && game.time >= enemy.from);
  const total = available.reduce((sum, [, enemy]) => sum + enemy.weight, 0);
  let roll = game.random() * total;
  for (const [kind, enemy] of available) {
    roll -= enemy.weight;
    if (roll <= 0) return kind;
  }
  return available[0][0];
}

function spawn(game, dt) {
  const difficulty = difficultyAt(game.time);
  game.spawnCarry += difficulty.spawnPerSec * dt;
  while (game.spawnCarry >= 1) {
    game.spawnCarry -= 1;
    if (game.enemies.length >= difficulty.maxEnemies) continue;
    const point = spawnPoint(game);
    spawnEnemy(game, pickKind(game), point.x, point.y);
  }
  // 1분마다 바퀴벌레 떼가 사방에서 몰려온다.
  if (game.time >= game.nextSwarmAt) {
    const count = 16 + Math.floor(game.time / 60) * 8;
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
  }
  player.onSlime = onSlime;
  player.hurtFlash = Math.max(0, player.hurtFlash - dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);
}

// 맞으면 잠깐 무적이 되어, 적이 여럿 붙어 있어도 한 번에 한 대씩만 맞는다.
function damagePlayer(game, amount) {
  const { player } = game;
  if (player.invulnerable > 0 || game.time < game.shieldUntil) return false;
  player.hp -= amount * (1 - statsOf(game).armor);
  player.hurtFlash = 0.15;
  player.invulnerable = PLAYER.invulnerableSec;
  if (player.hp <= 0) {
    player.hp = 0;
    game.over = true;
  }
  return true;
}

function shootRadial(game, enemy, count, speed, damage) {
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + enemy.timer;
    game.enemyShots.push({ x: enemy.x, y: enemy.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      damage, radius: 6, life: 4 });
  }
}

function moveEnemies(game, dt) {
  const { player } = game;
  const difficulty = difficultyAt(game.time);
  const frozen = game.time < game.freezeUntil;
  for (const enemy of game.enemies) {
    enemy.frozen = frozen && !enemy.boss;
    if (enemy.frozen) {
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      continue;
    }
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const gap = Math.hypot(dx, dy) || 1;
    let direction = 1;
    let speed = enemy.speed;
    enemy.timer += dt;

    if (enemy.kind === 'rust') {
      const base = ENEMIES.rust;
      if (gap < base.range * 0.7) direction = -0.6;
      else if (gap < base.range) direction = 0;
      if (enemy.timer >= base.shootEverySec && gap < base.range + 80) {
        enemy.timer = 0;
        game.enemyShots.push({ x: enemy.x, y: enemy.y, vx: (dx / gap) * base.shotSpeed, vy: (dy / gap) * base.shotSpeed,
          damage: base.shotDamage * difficulty.damage, radius: 6, life: 3 });
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
        enemy.x += enemy.dashX * enemy.speed * 3.4 * dt;
        enemy.y += enemy.dashY * enemy.speed * 3.4 * dt;
        continue;
      }
    }
    if (enemy.kind === 'rustBoiler' && enemy.timer >= enemy.stats.burstEverySec) {
      enemy.timer = 0;
      shootRadial(game, enemy, enemy.stats.burstCount, enemy.stats.shotSpeed, enemy.stats.shotDamage * difficulty.damage);
    }

    enemy.vx = (dx / gap) * speed * direction + enemy.kx;
    enemy.vy = (dy / gap) * speed * direction + enemy.ky;
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

export function damageEnemy(game, enemy, amount, knockback = 0, from = game.player) {
  if (enemy.dead) return;
  enemy.hp -= amount;
  enemy.hitFlash = 0.1;
  if (knockback > 0 && !enemy.boss) {
    const gap = distance(enemy, from) || 1;
    enemy.kx += ((enemy.x - from.x) / gap) * knockback * 8;
    enemy.ky += ((enemy.y - from.y) / gap) * knockback * 8;
  }
  if (enemy.hp <= 0) killEnemy(game, enemy);
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
  dropGem(game, enemy.x, enemy.y, enemy.xp);
  addEffect(game, { type: 'pop', x: enemy.x, y: enemy.y, radius: enemy.radius, life: 0.3 });
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
  const { luck } = statsOf(game);
  for (const [type, drop] of Object.entries(DROPS)) {
    if (game.random() < drop.chance * luck) {
      game.drops.push({ type, x: enemy.x, y: enemy.y });
      break;
    }
  }
}

function weaponValue(game, id, key) {
  return WEAPONS[id][key][game.weapons[id] - 1];
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
  game.cooldowns[id] = cooldown;
  return true;
}

export function coilOrbs(game) {
  const level = game.weapons.coil;
  if (!level) return [];
  const count = WEAPONS.coil.count[level - 1];
  const orbit = WEAPONS.coil.orbit[level - 1] * statsOf(game).area;
  return Array.from({ length: count }, (_, index) => {
    const angle = game.time * 2.8 + (index / count) * Math.PI * 2;
    return { x: game.player.x + Math.cos(angle) * orbit, y: game.player.y + Math.sin(angle) * orbit };
  });
}

function fireWeapons(game, dt) {
  const { player } = game;
  const { area } = statsOf(game);
  if (game.weapons.spray && ready(game, 'spray', dt)) {
    const count = weaponValue(game, 'spray', 'count');
    const targets = nearestEnemies(game, count);
    for (let index = 0; index < count; index += 1) {
      const target = targets[index % Math.max(1, targets.length)];
      const angle = target
        ? Math.atan2(target.y - player.y, target.x - player.x) + (targets.length < count ? (index - 1) * 0.25 : 0)
        : (player.facing > 0 ? 0 : Math.PI) + (index - 1) * 0.25;
      const { speed, lifeSec } = WEAPONS.spray;
      game.shots.push({ x: player.x, y: player.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        damage: weaponValue(game, 'spray', 'damage'), pierce: weaponValue(game, 'spray', 'pierce'), life: lifeSec,
        radius: 7, hit: new Set() });
    }
  }
  if (game.weapons.broom && ready(game, 'broom', dt)) {
    const radius = weaponValue(game, 'broom', 'radius') * area;
    const damage = weaponValue(game, 'broom', 'damage');
    for (const enemy of game.enemies) {
      if (distance(enemy, player) < radius + enemy.radius) damageEnemy(game, enemy, damage, WEAPONS.broom.knockback);
    }
    addEffect(game, { type: 'sweep', x: player.x, y: player.y, radius, life: 0.28, facing: player.facing });
  }
  if (game.weapons.bleach && ready(game, 'bleach', dt)) {
    const candidates = nearestEnemies(game, 12, 380);
    for (let index = 0; index < weaponValue(game, 'bleach', 'count'); index += 1) {
      const target = candidates.length > 0 ? candidates[Math.floor(game.random() * candidates.length)]
        : { x: player.x + (game.random() - 0.5) * 200, y: player.y + (game.random() - 0.5) * 200 };
      game.puddles.push({ x: target.x, y: target.y, radius: weaponValue(game, 'bleach', 'radius') * area,
        dps: weaponValue(game, 'bleach', 'dps'), life: WEAPONS.bleach.lifeSec, maxLife: WEAPONS.bleach.lifeSec });
    }
  }
  if (game.weapons.dehumidifier) {
    const radius = weaponValue(game, 'dehumidifier', 'radius') * area;
    const damage = weaponValue(game, 'dehumidifier', 'dps') * dt;
    for (const enemy of game.enemies) {
      if (distance(enemy, player) < radius + enemy.radius) damageEnemy(game, enemy, damage);
    }
  }
  if (game.weapons.swatter && ready(game, 'swatter', dt)) {
    const target = game.enemies
      .filter((enemy) => !enemy.dead && distance(enemy, player) < 420)
      .sort((a, b) => b.hp - a.hp)[0];
    if (target) {
      const radius = weaponValue(game, 'swatter', 'radius') * area;
      const damage = weaponValue(game, 'swatter', 'damage');
      const center = { x: target.x, y: target.y };
      for (const enemy of game.enemies) {
        if (distance(enemy, center) < radius + enemy.radius) damageEnemy(game, enemy, damage, 20, center);
      }
      addEffect(game, { type: 'swat', x: center.x, y: center.y, radius, life: 0.35 });
    } else {
      game.cooldowns.swatter = 0.2;
    }
  }
  if (game.weapons.slipper && ready(game, 'slipper', dt)) {
    const count = weaponValue(game, 'slipper', 'count');
    const target = nearestEnemies(game, 1)[0];
    const baseAngle = target ? Math.atan2(target.y - player.y, target.x - player.x) : (player.facing > 0 ? 0 : Math.PI);
    for (let index = 0; index < count; index += 1) {
      const angle = baseAngle + (index - (count - 1) / 2) * 0.6;
      const { speed, rangeSec } = WEAPONS.slipper;
      game.slippers.push({ x: player.x, y: player.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        damage: weaponValue(game, 'slipper', 'damage'), outFor: rangeSec, returning: false, radius: 10,
        spin: 0, hit: new Set() });
    }
  }
  if (game.weapons.coil) {
    const damage = weaponValue(game, 'coil', 'damage');
    for (const orb of coilOrbs(game)) {
      for (const enemy of game.enemies) {
        if (enemy.dead || distance(enemy, orb) > 11 + enemy.radius) continue;
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
    for (let jump = 0; jump < weaponValue(game, 'zapper', 'chains'); jump += 1) {
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
      reach = WEAPONS.zapper.jump * area;
    }
    if (points.length > 1) addEffect(game, { type: 'bolt', points, life: 0.22 });
    else game.cooldowns.zapper = 0.2;
  }
  if (game.weapons.fan && ready(game, 'fan', dt)) {
    const range = weaponValue(game, 'fan', 'range') * area;
    const damage = weaponValue(game, 'fan', 'damage');
    const target = nearestEnemies(game, 1, range)[0];
    const angle = target ? Math.atan2(target.y - player.y, target.x - player.x) : (player.facing > 0 ? 0 : Math.PI);
    for (const enemy of game.enemies) {
      const gap = distance(enemy, player);
      if (enemy.dead || gap > range + enemy.radius) continue;
      const toEnemy = Math.atan2(enemy.y - player.y, enemy.x - player.x);
      const diff = Math.abs(Math.atan2(Math.sin(toEnemy - angle), Math.cos(toEnemy - angle)));
      if (diff < 0.75) damageEnemy(game, enemy, damage, WEAPONS.fan.knockback);
    }
    addEffect(game, { type: 'gust', x: player.x, y: player.y, angle, range, life: 0.35 });
  }
}

function updateProjectiles(game, dt) {
  for (const shot of game.shots) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    for (const enemy of game.enemies) {
      if (shot.life <= 0) break;
      if (enemy.dead || shot.hit.has(enemy.id) || distance(shot, enemy) > shot.radius + enemy.radius) continue;
      shot.hit.add(enemy.id);
      damageEnemy(game, enemy, shot.damage, 6, shot);
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
      if (distance(enemy, puddle) < puddle.radius + enemy.radius * 0.5) damageEnemy(game, enemy, puddle.dps * dt);
    }
  }
  game.puddles = game.puddles.filter((puddle) => puddle.life > 0);
  game.slimes.forEach((slime) => { slime.life -= dt; });
  game.slimes = game.slimes.filter((slime) => slime.life > 0);

  for (const shot of game.enemyShots) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    if (shot.life > 0 && distance(shot, game.player) < shot.radius + PLAYER.radius && damagePlayer(game, shot.damage)) {
      shot.life = 0;
    }
  }
  game.enemyShots = game.enemyShots.filter((shot) => shot.life > 0);
}

function contactDamage(game) {
  let strongest = 0;
  for (const enemy of game.enemies) {
    if (!enemy.dead && !enemy.frozen && distance(enemy, game.player) < enemy.radius + PLAYER.radius) {
      strongest = Math.max(strongest, enemy.damage);
    }
  }
  if (strongest > 0) damagePlayer(game, strongest);
}

function applyDrop(game, drop) {
  const { player } = game;
  const stats = statsOf(game);
  if (drop.type === 'ramen') player.hp = Math.min(stats.maxHp, player.hp + 30);
  if (drop.type === 'vacuumBag') game.gems.forEach((gem) => { gem.pulled = true; });
  if (drop.type === 'coffee') game.coffeeUntil = game.time + 10;
  if (drop.type === 'bugBomb') {
    for (const enemy of game.enemies) {
      if (!enemy.boss && distance(enemy, player) < 560) killEnemy(game, enemy);
    }
    addEffect(game, { type: 'bomb', x: player.x, y: player.y, radius: 560, life: 0.6 });
  }
  if (drop.type === 'chicken') player.hp = stats.maxHp;
  if (drop.type === 'icepack') game.freezeUntil = game.time + 4;
  if (drop.type === 'box') game.shieldUntil = game.time + 5;
  if (drop.type === 'chest') game.pendingLevels += 2;
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
    ...Object.keys(PASSIVES).filter((id) => (game.passives[id] ?? 0) < MAX_LEVEL)
      .map((id) => ({ kind: 'passive', id, level: (game.passives[id] ?? 0) + 1, ...PASSIVES[id] })),
  ];
  const choices = shuffle(pool, game.random).slice(0, 3)
    .map(({ kind, id, level, label, description }) => ({ kind, id, level, label, description }));
  while (choices.length < 3) {
    choices.push({ kind: 'heal', id: `ramen-${choices.length}`, level: 0, label: '라면 한 그릇', description: '체력 40 회복' });
  }
  return choices;
}

export function choose(game, index) {
  const choice = game.choices?.[index];
  if (!choice) return null;
  const before = statsOf(game).maxHp;
  if (choice.kind === 'weapon') game.weapons[choice.id] = choice.level;
  if (choice.kind === 'passive') game.passives[choice.id] = choice.level;
  const stats = statsOf(game);
  if (choice.kind === 'heal') game.player.hp = Math.min(stats.maxHp, game.player.hp + 40);
  if (stats.maxHp > before) game.player.hp += stats.maxHp - before;
  game.pendingLevels -= 1;
  game.choices = game.pendingLevels > 0 ? rollChoices(game) : null;
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
  game.effects.forEach((effect) => { effect.age += dt; });
  game.effects = game.effects.filter((effect) => effect.age < effect.life);
  if (game.pendingLevels > 0 && !game.over) game.choices = rollChoices(game);
  return game;
}

export function formatTime(seconds) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
