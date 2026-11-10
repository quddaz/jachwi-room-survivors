import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { choose, createGame, damageEnemy, formatTime, rollChoices, statsOf, update } from '../src/engine.js';
import { rankBest } from '../src/leaderboard.js';
import { BOSS_EVERY_SEC, difficultyAt, MAX_LEVEL, PASSIVES, PLAYER, WEAPONS, xpToNext } from '../src/rules.js';

function seeded(seed) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function placeEnemy(game, kind, dx, dy, extra = {}) {
  const enemy = { id: game.nextId++, kind, x: game.player.x + dx, y: game.player.y + dy, hp: 10, maxHp: 10, speed: 0,
    radius: 10, damage: 5, xp: 1, boss: false, timer: 0, kx: 0, ky: 0, hitFlash: 0, ...extra };
  game.enemies.push(enemy);
  return enemy;
}

function run(game, seconds, input = { x: 0, y: 0 }) {
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) {
    if (game.choices) choose(game, 0);
    update(game, 1 / 60, input);
  }
}

describe('난이도', () => {
  it('시간이 갈수록 적의 체력, 공격력, 출현 수가 끝없이 늘어난다', () => {
    const times = [0, 60, 300, 600, 1200];
    for (const key of ['hp', 'damage', 'spawnPerSec']) {
      const values = times.map((time) => difficultyAt(time)[key]);
      values.slice(1).forEach((value, index) => assert.ok(value >= values[index], `${key} ${times[index + 1]}`));
    }
    assert.ok(difficultyAt(1200).hp > difficultyAt(600).hp);
  });

  it('90초마다 보스가 나오고 나올 때마다 더 세진다', () => {
    const game = createGame(seeded(3));
    game.time = BOSS_EVERY_SEC - 0.01;
    run(game, 0.05);
    const first = game.enemies.find((enemy) => enemy.boss);
    assert.equal(first.kind, 'kingRoach');
    game.enemies = [];
    game.time = BOSS_EVERY_SEC * 4 - 0.01;
    game.nextBossAt = BOSS_EVERY_SEC * 4;
    game.bossIndex = 3;
    run(game, 0.05);
    const fourth = game.enemies.find((enemy) => enemy.boss);
    assert.equal(fourth.kind, 'kingRoach');
    assert.ok(fourth.maxHp > first.maxHp * 2);
  });

  it('1분마다 바퀴벌레 떼가 사방에서 몰려온다', () => {
    const game = createGame(seeded(3));
    game.time = 59.99;
    run(game, 0.05);
    assert.ok(game.enemies.filter((enemy) => enemy.kind === 'roach').length >= 16);
  });
});

describe('전투', () => {
  it('살충제는 가까운 적에게 날아가 쓰러뜨리고 먼지를 남긴다', () => {
    const game = createGame(seeded(1));
    game.spawnCarry = -1000;
    const roach = placeEnemy(game, 'roach', 120, 0, { hp: 5 });
    run(game, 1);
    assert.ok(roach.dead);
    assert.equal(game.kills, 1);
  });

  it('쓰레기봉투는 쓰러지면 쓰레기 조각 두 개로 갈라진다', () => {
    const game = createGame(seeded(1));
    const bag = placeEnemy(game, 'trash', 300, 0);
    damageEnemy(game, bag, 999);
    assert.equal(game.enemies.filter((enemy) => enemy.kind === 'scrap').length, 2);
  });

  it('곰팡이가 쓰러진 자리는 밟으면 느려진다', () => {
    const game = createGame(seeded(1));
    game.spawnCarry = -1000;
    const mold = placeEnemy(game, 'mold', 0, 0);
    damageEnemy(game, mold, 999);
    const start = game.player.x;
    update(game, 0.1, { x: 1, y: 0 });
    const slowed = game.player.x - start;
    game.slimes = [];
    const before = game.player.x;
    update(game, 0.1, { x: 1, y: 0 });
    assert.ok(slowed < game.player.x - before);
  });

  it('여럿에게 둘러싸여도 잠깐 무적 덕분에 한 번에 한 대만 맞는다', () => {
    const game = createGame(seeded(1));
    game.spawnCarry = -1000;
    game.weapons = {};
    for (let index = 0; index < 8; index += 1) placeEnemy(game, 'roach', 3, 0, { hp: 1000, damage: 5 });
    update(game, 1 / 60);
    assert.equal(game.player.hp, PLAYER.maxHp - 5);
    update(game, 1 / 60);
    assert.equal(game.player.hp, PLAYER.maxHp - 5);
  });

  it('고무장갑이 받는 피해를 줄인다', () => {
    const game = createGame(seeded(1));
    game.spawnCarry = -1000;
    game.weapons = {};
    game.passives.gloves = 5;
    placeEnemy(game, 'roach', 3, 0, { hp: 1000, damage: 10 });
    update(game, 1 / 60);
    assert.equal(game.player.hp, PLAYER.maxHp - 7);
  });

  it('체력이 0이 되면 게임이 끝난다', () => {
    const game = createGame(seeded(1));
    game.player.hp = 1;
    game.weapons = {};
    placeEnemy(game, 'roach', 3, 0, { hp: 1000, damage: 50 });
    update(game, 1 / 60);
    assert.equal(game.over, true);
  });
});

describe('성장과 아이템', () => {
  it('먼지를 모아 경험치가 차면 3개 중 하나를 골라 강화한다', () => {
    const game = createGame(seeded(2));
    game.spawnCarry = -1000;
    game.gems.push({ x: game.player.x + 5, y: game.player.y, value: xpToNext(1) });
    update(game, 1 / 60);
    assert.equal(game.level, 2);
    assert.equal(game.choices.length, 3);
    assert.equal(new Set(game.choices.map((choice) => choice.id)).size, 3);
    const picked = choose(game, 0);
    assert.equal(game.choices, null);
    const owned = picked.kind === 'weapon' ? game.weapons[picked.id] : game.passives[picked.id];
    assert.equal(owned, picked.level);
  });

  it('모든 무기와 패시브를 최대로 올리고 완성하면 라면으로 회복한다', () => {
    const game = createGame(seeded(2));
    game.weapons = Object.fromEntries(Object.keys(WEAPONS).map((id) => [id, MAX_LEVEL]));
    game.passives = Object.fromEntries(Object.keys(PASSIVES).map((id) => [id, MAX_LEVEL]));
    game.evolved = Object.fromEntries(Object.keys(WEAPONS).map((id) => [id, true]));
    assert.ok(rollChoices(game).every((choice) => choice.kind === 'heal'));
  });

  it('비타민은 최대 체력을 늘린 만큼 체력도 채운다', () => {
    const game = createGame(seeded(2));
    game.pendingLevels = 1;
    game.choices = [{ kind: 'passive', id: 'vitamin', level: 1 }];
    choose(game, 0);
    assert.equal(statsOf(game).maxHp, PLAYER.maxHp + PASSIVES.vitamin.maxHp[0]);
    assert.equal(game.player.hp, PLAYER.maxHp + PASSIVES.vitamin.maxHp[0]);
  });

  it('연막 살충제는 주변의 일반 적을 모두 쓰러뜨리고 보스는 남긴다', () => {
    const game = createGame(seeded(2));
    game.spawnCarry = -1000;
    for (let index = 0; index < 5; index += 1) placeEnemy(game, 'roach', 200 + index * 10, 100, { hp: 999 });
    placeEnemy(game, 'kingRoach', -200, 0, { hp: 999, boss: true, stats: { chargeEverySec: 99 } });
    game.drops.push({ type: 'bugBomb', x: game.player.x, y: game.player.y });
    update(game, 1 / 60);
    assert.deepEqual(game.enemies.map((enemy) => enemy.kind), ['kingRoach']);
  });

  it('보스를 잡으면 보물상자가 나오고 열면 두 번 강화한다', () => {
    const game = createGame(seeded(2));
    game.spawnCarry = -1000;
    const boss = placeEnemy(game, 'kingRoach', 400, 0, { boss: true, label: '왕바퀴', stats: { chargeEverySec: 99 } });
    damageEnemy(game, boss, 999);
    const chest = game.drops.find((drop) => drop.type === 'chest');
    chest.x = game.player.x;
    chest.y = game.player.y;
    update(game, 1 / 60);
    assert.equal(game.choices.length, 3);
    choose(game, 0);
    assert.notEqual(game.choices, null);
  });
});

describe('추가 아이템', () => {
  it('모기향 불씨는 닿은 적을 태운다', () => {
    const game = createGame(seeded(4));
    game.spawnCarry = -1000;
    game.weapons = { coil: 1 };
    const roach = placeEnemy(game, 'roach', 62, 0, { hp: 5 });
    run(game, 2.5);
    assert.ok(roach.dead);
  });

  it('전기 파리채는 가까운 적에서 다음 적으로 튄다', () => {
    const game = createGame(seeded(4));
    game.spawnCarry = -1000;
    game.weapons = { zapper: 1 };
    const targets = [100, 180, 260].map((x) => placeEnemy(game, 'trash', x, 0, { hp: 1000 }));
    update(game, 1 / 60);
    assert.ok(targets.every((enemy) => enemy.hp < 1000));
  });

  it('선풍기는 앞쪽 적만 멀리 밀어낸다', () => {
    const game = createGame(seeded(4));
    game.spawnCarry = -1000;
    game.weapons = { fan: 1 };
    const front = placeEnemy(game, 'trash', 80, 0, { hp: 1000 });
    const behind = placeEnemy(game, 'trash', -120, 0, { hp: 1000 });
    update(game, 1 / 60);
    assert.ok(front.kx > 0);
    assert.equal(behind.hp, 1000);
  });

  it('얼음팩은 일반 적을 얼려 다가오지도 때리지도 못하게 한다', () => {
    const game = createGame(seeded(4));
    game.spawnCarry = -1000;
    game.weapons = {};
    const roach = placeEnemy(game, 'roach', 3, 0, { hp: 1000, speed: 50 });
    game.drops.push({ type: 'icepack', x: game.player.x, y: game.player.y });
    update(game, 1 / 60);
    const hp = game.player.hp;
    run(game, 1);
    assert.equal(roach.frozen, true);
    assert.equal(game.player.hp, hp);
  });

  it('택배 상자를 주우면 5초 동안 피해를 받지 않는다', () => {
    const game = createGame(seeded(4));
    game.spawnCarry = -1000;
    game.weapons = {};
    game.drops.push({ type: 'box', x: game.player.x, y: game.player.y });
    update(game, 1 / 60);
    placeEnemy(game, 'roach', 3, 0, { hp: 1000, damage: 30 });
    run(game, 2);
    assert.equal(game.player.hp, PLAYER.maxHp);
  });

  it('향초는 경험치를 더 주고 물티슈는 범위를 넓힌다', () => {
    const game = createGame(seeded(4));
    game.passives = { candle: 5, wipes: 5 };
    assert.equal(statsOf(game).xpGain, 1.5);
    assert.equal(statsOf(game).area, 1.4);
  });
});

describe('표시와 순위', () => {
  it('버틴 시간을 분:초로 보여 준다', () => {
    assert.equal(formatTime(0), '0:00');
    assert.equal(formatTime(125.9), '2:05');
    assert.equal(formatTime(3723), '62:03');
  });

  it('크루마다 가장 오래 버틴 기록만 남기고 같으면 많이 잡은 순으로 줄 세운다', () => {
    const ranking = rankBest([
      { crewName: '쿠다', survivedMs: 120_000, kills: 300, createdAt: '2026-11-10T01:00:00Z' },
      { crewName: '쿠다', survivedMs: 240_000, kills: 500, createdAt: '2026-11-10T02:00:00Z' },
      { crewName: '포비', survivedMs: 240_000, kills: 800, createdAt: '2026-11-10T03:00:00Z' },
      { crewName: '네오', survivedMs: 60_000, kills: 100, createdAt: '2026-11-10T01:00:00Z' },
    ]);
    assert.deepEqual(ranking.map((entry) => entry.crewName), ['포비', '쿠다', '네오']);
    assert.equal(ranking[1].survivedMs, 240_000);
  });
});

describe('완성형 무기', () => {
  it('5레벨 무기는 선택지에 완성형으로 나오고 고르면 바뀐다', () => {
    const game = createGame(seeded(3));
    game.weapons = { broom: MAX_LEVEL };
    game.pendingLevels = 1;
    game.choices = rollChoices(game);
    assert.equal(game.choices[0].kind, 'evolve');
    assert.equal(game.choices[0].id, 'broom');
    choose(game, 0);
    assert.equal(game.evolved.broom, true);
    assert.ok(!rollChoices(game).some((choice) => choice.kind === 'evolve'));
  });

  it('완성형 선풍기는 등 뒤의 적도 날린다', () => {
    const game = createGame(seeded(5));
    game.weapons = { fan: MAX_LEVEL };
    game.evolved.fan = true;
    const front = placeEnemy(game, 'trash', 60, 0, { hp: 500, maxHp: 500 });
    const back = placeEnemy(game, 'trash', -60, 0, { hp: 500, maxHp: 500 });
    update(game, 1 / 60);
    assert.ok(front.hp < 500);
    assert.ok(back.hp < 500);
  });
});

describe('보스 패턴', () => {
  it('쓰레기 산은 떨어질 자리를 먼저 보여 주고 나서 피해를 준다', () => {
    const game = createGame(seeded(9));
    placeEnemy(game, 'garbageGiant', 300, 0, { boss: true, hp: 9999, maxHp: 9999, timer: 99,
      stats: { lobEverySec: 3.5, lobCount: 1, lobDelaySec: 1, lobRadius: 36, lobDamage: 10 } });
    update(game, 1 / 60);
    assert.equal(game.hazards.length, 1);
    const hp = game.player.hp;
    for (let step = 0; step < 30; step += 1) update(game, 1 / 60);
    assert.equal(game.player.hp, hp);
    for (let step = 0; step < 40; step += 1) update(game, 1 / 60);
    assert.ok(game.player.hp < hp);
    assert.equal(game.hazards.length, 0);
  });

  it('녹슨 보일러는 탄막을 쏜다', () => {
    const game = createGame(seeded(9));
    placeEnemy(game, 'rustBoiler', 300, 0, { boss: true, hp: 9999, maxHp: 9999,
      stats: { patternSec: 3.2, burstCount: 16, shotSpeed: 125, shotDamage: 9 } });
    for (let step = 0; step < 30; step += 1) update(game, 1 / 60);
    assert.equal(game.enemyShots.length, 16);
  });
});

describe('추가 무기와 공격력', () => {
  it('단백질 셰이크는 무기 피해를 올린다', () => {
    const hit = (passives) => {
      const game = createGame(seeded(4));
      game.spawnCarry = -1000;
      game.weapons = { broom: 1 };
      game.passives = passives;
      const enemy = placeEnemy(game, 'trash', 30, 0, { hp: 1000 });
      update(game, 1 / 60);
      return 1000 - enemy.hp;
    };
    assert.ok(Math.abs(hit({ protein: MAX_LEVEL }) - hit({}) * 1.5) < 1e-6);
  });

  it('세제 거품은 닿으면 터져 주변 적도 함께 맞는다', () => {
    const game = createGame(seeded(4));
    game.spawnCarry = -1000;
    game.weapons = {};
    const near = placeEnemy(game, 'trash', 40, 0, { hp: 1000 });
    const beside = placeEnemy(game, 'trash', 60, 10, { hp: 1000 });
    game.shots.push({ x: game.player.x, y: game.player.y, vx: 200, vy: 0, damage: 10, pierce: 0, life: 2, radius: 9,
      hit: new Set(), kind: 'bubble', pop: 40 });
    for (let step = 0; step < 20; step += 1) update(game, 1 / 60);
    assert.equal(near.hp, 990);
    assert.equal(beside.hp, 990);
    assert.equal(game.shots.length, 0);
  });

  it('돌돌이는 가는 길의 적을 모두 뚫는다', () => {
    const game = createGame(seeded(4));
    game.spawnCarry = -1000;
    game.weapons = { roller: 1 };
    const targets = [60, 120, 180].map((x) => placeEnemy(game, 'trash', x, 0, { hp: 1000 }));
    for (let step = 0; step < 60; step += 1) update(game, 1 / 60);
    assert.ok(targets.every((enemy) => enemy.hp < 1000));
  });
});
