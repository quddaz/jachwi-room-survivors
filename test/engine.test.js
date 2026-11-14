import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyBuild, sawBlades, topSpinners, choose, createGame, rollRelics, damageEnemy, describeChoice, formatTime, reroll, rollChoices, startWithRelic, statSheet, statsOf, update,
} from '../src/engine.js';
import { fetchRanking, rankBest, SEASON, SEASONS, submitRecord } from '../src/leaderboard.js';
import { BOSS_EVERY_SEC, BOSS_SPEED, bossStatsOf, BOSSES, BUILD, buildEfficiency, difficultyAt, normalizeBuild, DROP_LIMIT, ELITE, eliteFrom, ENEMIES, FUSIONS, MAX_FUSIONS, MAX_LEVEL, MAX_RELICS, MAX_WEAPONS, RELICS, passiveMaxLevel, PASSIVES, PLAYER, WEAPONS, xpToNext } from '../src/rules.js';

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

// 기본 회복(1초에 1)이 있어서, 한두 프레임 뒤의 체력은 정확히 같지 않고 아주 조금 더 많다.
function near(actual, expected, tolerance = 0.1) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} is not near ${expected}`);
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
    // 보스를 한 바퀴 다 돌고 나면 처음 보스가 더 세져서 다시 나온다.
    game.time = BOSS_EVERY_SEC * (BOSSES.length + 1) - 0.01;
    game.nextBossAt = BOSS_EVERY_SEC * (BOSSES.length + 1);
    game.bossIndex = BOSSES.length;
    run(game, 0.05);
    const again = game.enemies.find((enemy) => enemy.boss);
    assert.equal(again.kind, 'kingRoach');
    assert.ok(again.maxHp > first.maxHp * 2);
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
    near(game.player.hp, PLAYER.maxHp - 5);
    update(game, 1 / 60);
    near(game.player.hp, PLAYER.maxHp - 5);
  });

  it('아무것도 없어도 1초에 체력이 1씩 찬다', () => {
    const game = createGame(seeded(1));
    game.spawnCarry = -1000;
    game.weapons = {};
    game.player.hp = 50;
    run(game, 3);
    near(game.player.hp, 53, 0.05);
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
    game.passives = Object.fromEntries(Object.keys(PASSIVES).map((id) => [id, passiveMaxLevel(id)]));
    game.evolved = Object.fromEntries(Object.keys(WEAPONS).map((id) => [id, true]));
    game.fusions = Object.fromEntries(Object.keys(FUSIONS).map((id) => [id, true]));
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

  it('보스를 잡으면 보물 상자가 나오고 열면 보물을 하나 고른다', () => {
    const game = createGame(seeded(2));
    game.spawnCarry = -1000;
    const boss = placeEnemy(game, 'kingRoach', 400, 0, { boss: true, label: '왕바퀴', stats: { chargeEverySec: 99 } });
    damageEnemy(game, boss, 999);
    const chest = game.drops.find((drop) => drop.type === 'chest');
    chest.x = game.player.x;
    chest.y = game.player.y;
    update(game, 1 / 60);
    assert.equal(game.choices.length, 3);
    assert.ok(game.choices.every((choice) => choice.kind === 'relic'));
    const picked = choose(game, 0);
    assert.ok(game.relics[picked.id]);
    assert.equal(game.pendingLevels, 0);
    assert.equal(game.choices, null);
  });
});

describe('추가 아이템', () => {
  it('모기향 불씨는 닿은 적을 태운다', () => {
    const game = createGame(seeded(4));
    game.spawnCarry = -1000;
    game.weapons = { coil: 1 };
    const roach = placeEnemy(game, 'roach', WEAPONS.coil.orbit[0], 0, { hp: 5 });
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
    assert.ok(game.player.hp >= hp); // 맞지 않았다(기본 회복만 찼다)
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
    assert.ok(game.player.hp >= hp); // 아직 떨어지지 않았다
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

describe('새 무기', () => {
  function armed(weapon, level = 1) {
    const game = createGame(seeded(5));
    game.spawnCarry = -1000;
    game.weapons = { [weapon]: level };
    return game;
  }

  it('레이저 포인터는 줄기 위에 있는 적을 모두 꿰뚫고, 줄기 밖의 적은 건드리지 않는다', () => {
    const game = armed('laser');
    game.random = () => 0; // 0도, 오른쪽으로 쏜다
    const onLine = [80, 300, 700].map((x) => placeEnemy(game, 'trash', x, 0, { hp: 1000 }));
    const offLine = [placeEnemy(game, 'trash', 200, 120, { hp: 1000 }), placeEnemy(game, 'trash', -200, 0, { hp: 1000 })];
    update(game, 1 / 60);
    assert.ok(onLine.every((enemy) => enemy.hp === 1000 - WEAPONS.laser.damage[0]));
    assert.ok(offLine.every((enemy) => enemy.hp === 1000));
  });

  it('스테이플러는 바라보는 쪽으로만 심을 난사한다', () => {
    const game = armed('stapler');
    const front = placeEnemy(game, 'trash', -150, 0, { hp: 1000 });
    const behind = placeEnemy(game, 'trash', 150, 0, { hp: 1000 });
    game.player.heading = Math.PI;
    for (let step = 0; step < 90; step += 1) update(game, 1 / 60);
    assert.ok(front.hp < 1000 - WEAPONS.stapler.damage[0] * 3);
    assert.equal(behind.hp, 1000);
  });

  it('탱탱볼은 화면 밖으로 나가지 않고 가장자리에서 튕긴다', () => {
    const game = armed('ball', MAX_LEVEL);
    game.view = { halfW: 200, halfH: 150 };
    let bounced = false;
    for (let step = 0; step < 600; step += 1) {
      const before = game.balls.map((ball) => [ball.dx, ball.dy]);
      update(game, 1 / 60);
      bounced ||= game.balls.some((ball, index) => before[index] && (before[index][0] !== ball.dx || before[index][1] !== ball.dy));
      for (const ball of game.balls) {
        assert.ok(Math.abs(ball.x - game.player.x) <= 200 && Math.abs(ball.y - game.player.y) <= 150);
      }
    }
    assert.equal(game.balls.length, WEAPONS.ball.count[MAX_LEVEL - 1]);
    assert.ok(bounced);
  });

  it('로봇청소기는 가까운 적을 찾아가 들이받는다', () => {
    const game = armed('robot');
    const enemy = placeEnemy(game, 'trash', 180, 60, { hp: 1000 });
    for (let step = 0; step < 180; step += 1) update(game, 1 / 60);
    assert.ok(enemy.hp < 1000);
  });

  it('새 무기도 모두 완성형이 있다', () => {
    const game = createGame(seeded(2));
    game.weapons = Object.fromEntries(Object.keys(WEAPONS).map((id) => [id, MAX_LEVEL]));
    game.evolved = Object.fromEntries(Object.keys(WEAPONS).map((id) => [id, true]));
    game.spawnCarry = -1000;
    for (let index = 0; index < 12; index += 1) placeEnemy(game, 'roach', 90 + index * 20, (index % 3) * 40 - 40, { hp: 5000 });
    for (let step = 0; step < 300; step += 1) update(game, 1 / 60);
    assert.equal(game.balls.length, 5);
    assert.equal(game.robots.length, 3);
  });
});

describe('패시브 확장', () => {
  it('단백질 셰이크, 운동화, 네잎클로버는 10레벨까지, 나머지는 5레벨까지 올린다', () => {
    assert.equal(passiveMaxLevel('protein'), 10);
    assert.equal(passiveMaxLevel('sneakers'), 10);
    assert.equal(passiveMaxLevel('clover'), 10);
    assert.equal(passiveMaxLevel('hotsauce'), 5);
    assert.equal(passiveMaxLevel('battery'), 5);
    const game = createGame(seeded(4));
    game.weapons = Object.fromEntries(Object.keys(WEAPONS).map((id) => [id, MAX_LEVEL]));
    game.evolved = Object.fromEntries(Object.keys(WEAPONS).map((id) => [id, true]));
    game.fusions = Object.fromEntries(Object.keys(FUSIONS).map((id) => [id, true]));
    game.passives = Object.fromEntries(Object.keys(PASSIVES).map((id) => [id, 5]));
    const offered = rollChoices(game).filter((choice) => choice.kind === 'passive').map((choice) => choice.id).sort();
    assert.deepEqual(offered, ['clover', 'protein', 'sneakers']);
    game.passives.sneakers = 10;
    assert.equal(statsOf(game).speed, PLAYER.speed * (1 + PASSIVES.sneakers.speed[9]));
  });

  it('돋보기는 날아가는 것들을 키운다', () => {
    const plain = createGame(seeded(4));
    const grown = createGame(seeded(4));
    grown.passives = { magnifier: 5 };
    for (const game of [plain, grown]) {
      game.spawnCarry = -1000;
      placeEnemy(game, 'trash', 300, 0, { hp: 1000 });
      update(game, 1 / 60);
    }
    assert.equal(grown.shots[0].radius, plain.shots[0].radius * (1 + PASSIVES.magnifier.size[4]));
  });
});

describe('합체 무기', () => {
  it('두 완성형을 모두 갖춰야 합체가 선택지에 나오고, 고르면 다시 나오지 않는다', () => {
    const game = createGame(seeded(6));
    game.weapons = { ball: MAX_LEVEL, zapper: MAX_LEVEL };
    game.evolved = { ball: true };
    assert.ok(!rollChoices(game).some((choice) => choice.kind === 'fusion'));
    game.evolved.zapper = true;
    game.pendingLevels = 1;
    game.choices = rollChoices(game);
    assert.equal(game.choices[0].kind, 'fusion');
    assert.equal(game.choices[0].id, 'thunderball');
    choose(game, 0);
    assert.ok(game.fusions.thunderball);
    assert.ok(!rollChoices(game).some((choice) => choice.kind === 'fusion'));
  });

  it('합체 무기는 모두 실제 무기 둘로 만들고, 켜 두면 원래보다 훨씬 많이 잡는다', () => {
    for (const recipe of Object.values(FUSIONS)) assert.ok(recipe.from.length === 2 && recipe.from.every((id) => WEAPONS[id]));
    const damageWith = (fused) => {
      const game = createGame(seeded(9));
      game.spawnCarry = -100000;
      game.view = { halfW: 300, halfH: 220 };
      game.weapons = Object.fromEntries(Object.keys(WEAPONS).map((id) => [id, MAX_LEVEL]));
      game.evolved = Object.fromEntries(Object.keys(WEAPONS).map((id) => [id, true]));
      if (fused) game.fusions = Object.fromEntries(Object.keys(FUSIONS).map((id) => [id, true]));
      const enemies = [];
      for (let index = 0; index < 40; index += 1) {
        const angle = (index / 40) * Math.PI * 2;
        enemies.push(placeEnemy(game, 'trash', Math.cos(angle) * (120 + (index % 4) * 50), Math.sin(angle) * (120 + (index % 4) * 50),
          { hp: 1e9, boss: true }));
      }
      for (let step = 0; step < 600; step += 1) update(game, 1 / 60);
      return enemies.reduce((sum, enemy) => sum + (1e9 - enemy.hp), 0);
    };
    assert.ok(damageWith(true) > damageWith(false) * 1.4);
  });
});

describe('새 적', () => {
  function quiet() {
    const game = createGame(seeded(8));
    game.spawnCarry = -100000;
    game.weapons = {};
    return game;
  }

  it('거미는 웅크렸다가 걷는 속도보다 훨씬 빠르게 뛰어든다', () => {
    const game = quiet();
    const spider = placeEnemy(game, 'spider', 250, 0, { speed: 50, hp: 1e6 });
    let fastest = 0;
    for (let step = 0; step < 240; step += 1) {
      const before = spider.x;
      update(game, 1 / 60);
      fastest = Math.max(fastest, Math.abs(spider.x - before) * 60);
    }
    assert.ok(fastest > 50 * 3);
  });

  it('상한 우유는 가까이 오면 터지고, 부풀다가 잡혀도 그대로 터진다', () => {
    const blown = quiet();
    placeEnemy(blown, 'milk', 60, 0, { hp: 1e6 });
    for (let step = 0; step < 90; step += 1) update(blown, 1 / 60);
    assert.ok(blown.player.hp < PLAYER.maxHp);
    assert.equal(blown.enemies.length, 0);

    const defused = quiet();
    const milk = placeEnemy(defused, 'milk', 60, 0, { hp: 10 });
    update(defused, 1 / 60);
    assert.equal(defused.hazards.length, 1);
    damageEnemy(defused, milk, 999);
    for (let step = 0; step < 90; step += 1) update(defused, 1 / 60);
    assert.ok(defused.player.hp < PLAYER.maxHp);
    assert.equal(defused.hazards.length, 0);
  });

  it('상한 우유는 멀리서 잡아도 그 자리에서 잠시 뒤 터진다', () => {
    const game = quiet();
    const milk = placeEnemy(game, 'milk', 300, 0, { hp: 10 });
    const neighbor = placeEnemy(game, 'trash', 330, 0, { hp: 1e6, speed: 0 });
    damageEnemy(game, milk, 999);
    assert.equal(game.hazards.length, 1);
    assert.equal(game.hazards[0].delay, ENEMIES.milk.deathFuseSec);
    for (let step = 0; step < 60; step += 1) update(game, 1 / 60);
    assert.equal(game.hazards.length, 0);
    assert.equal(game.player.hp, PLAYER.maxHp);
    assert.ok(neighbor.hp <= 1e6);
  });

  it('나방은 멀리서 세 갈래로 쏜다', () => {
    const game = quiet();
    placeEnemy(game, 'moth', 240, 0, { speed: 0, hp: 1e6, timer: 10 });
    update(game, 1 / 60);
    assert.equal(game.enemyShots.length, 3);
  });

  it('모기는 곧장 오지 않고 좌우로 흔들린다', () => {
    const game = quiet();
    const mosquito = placeEnemy(game, 'mosquito', 400, 0, { speed: 100, hp: 1e6 });
    let drift = 0;
    for (let step = 0; step < 60; step += 1) {
      update(game, 1 / 60);
      drift = Math.max(drift, Math.abs(mosquito.y - game.player.y));
    }
    assert.ok(drift > 4);
  });
});

describe('대왕 파리', () => {
  it('네 번째 보스로 나와 날파리를 다섯 마리씩 불러낸다', () => {
    assert.equal(BOSSES[3].kind, 'kingFly');
    const game = createGame(seeded(8));
    game.spawnCarry = -100000;
    game.weapons = {};
    const stats = BOSSES[3];
    placeEnemy(game, 'kingFly', 300, 0, { boss: true, hp: 1e6, speed: 0, radius: 30, stats, label: stats.label });
    for (let step = 0; step < Math.ceil(stats.summonEverySec * 60) + 2; step += 1) update(game, 1 / 60);
    assert.equal(game.enemies.filter((enemy) => enemy.kind === 'fly').length, 5);
  });
});

describe('나방 출현', () => {
  it('나방은 드물게 나오고, 한 번에 여섯 마리를 넘지 않는다', () => {
    const game = createGame(seeded(12));
    game.weapons = {};
    game.player.hp = 1e9;
    game.time = 600;
    game.nextBossAt = Infinity;
    game.nextSwarmAt = Infinity;
    let most = 0;
    for (let step = 0; step < 60 * 20; step += 1) {
      update(game, 1 / 60);
      game.player.hp = 1e9;
      most = Math.max(most, game.enemies.filter((enemy) => enemy.kind === 'moth').length);
    }
    assert.ok(most <= 6);
  });
});

describe('레벨업 다시 뽑기와 수치 표시', () => {
  it('레벨업마다 한 번만 다시 뽑을 수 있고, 다음 레벨업에 다시 생긴다', () => {
    const game = createGame(seeded(21));
    game.spawnCarry = -1000;
    game.pendingLevels = 2;
    update(game, 1 / 60);
    const first = game.choices.map((choice) => choice.id).join();
    assert.ok(reroll(game));
    assert.equal(game.rerollLeft, 0);
    assert.ok(!reroll(game));
    assert.notEqual(game.choices.map((choice) => choice.id).join(), first);
    choose(game, 0);
    assert.ok(game.choices);
    assert.equal(game.rerollLeft, 1);
  });

  it('카드에 정확한 수치를 적는다', () => {
    const game = createGame(seeded(1));
    assert.deepEqual(describeChoice(game, { kind: 'passive', id: 'protein', level: 1 }), ['공격력 +10%']);
    assert.deepEqual(describeChoice(game, { kind: 'passive', id: 'protein', level: 2 }), ['공격력 +10% → +20%']);
    const broom = describeChoice(game, { kind: 'weapon', id: 'broom', level: 2 });
    const [before, after] = [WEAPONS.broom.damage[0], WEAPONS.broom.damage[1]];
    assert.ok(broom.includes(`피해 +${Math.round((after / before - 1) * 100)}% (${before} → ${after})`));
    assert.ok(broom.some((line) => line.startsWith('쿨타임 -')));
    assert.ok(rollChoices(game).every((choice) => Array.isArray(choice.details) && choice.details.length > 0));
  });

  it('능력치 창은 패시브를 반영한다', () => {
    const game = createGame(seeded(1));
    game.passives = { protein: 3, sneakers: 1, clover: 2, hotsauce: 1 };
    const sheet = Object.fromEntries(statSheet(game));
    assert.equal(sheet['공격력'], '+30%');
    assert.equal(sheet['이동 속도'], '+10%');
    assert.equal(sheet['치명타 확률'], '12%');
    assert.equal(sheet['치명타 피해'], '175%');
  });
});

describe('치명타', () => {
  it('네잎클로버가 없으면 치명타가 없고, 핫소스도 나오지 않는다', () => {
    const game = createGame(seeded(1));
    assert.equal(statsOf(game).critChance, 0);
    const enemy = { id: 1, kind: 'roach', x: 0, y: 0, hp: 1000, radius: 10, kx: 0, ky: 0 };
    game.random = () => 0;
    damageEnemy(game, enemy, 10);
    assert.equal(enemy.hp, 990);
    for (let seed = 1; seed < 40; seed += 1) {
      const other = createGame(seeded(seed));
      assert.ok(!rollChoices(other).some((choice) => choice.id === 'hotsauce'));
    }
  });

  it('치명타가 나면 기본 150%에 핫소스만큼 더 아프다', () => {
    const game = createGame(seeded(1));
    game.passives = { clover: 1, hotsauce: 2 };
    const enemy = { id: 1, kind: 'roach', x: 0, y: 0, hp: 1000, radius: 10, kx: 0, ky: 0 };
    game.random = () => 0;
    damageEnemy(game, enemy, 10);
    assert.equal(enemy.hp, 1000 - 10 * (PLAYER.critDamage + PASSIVES.hotsauce.critDamage[1]));
    game.random = () => 0.99;
    damageEnemy(game, enemy, 10);
    assert.equal(enemy.hp, 1000 - 10 * 2 - 10);
  });
});

describe('범위 조정', () => {
  it('모기향은 더 넓게, 더 빨리 돈다', () => {
    assert.ok(WEAPONS.coil.orbit[0] >= 85 && WEAPONS.coil.spin > 2.8);
  });

  it('선풍기는 옆으로도 넓게 날린다', () => {
    const game = createGame(seeded(4));
    game.spawnCarry = -1000;
    game.weapons = { fan: 1 };
    const front = placeEnemy(game, 'trash', 100, 0, { hp: 1000 });
    // 정면에서 50도쯤 비껴 있는 적도 닿는다.
    const side = placeEnemy(game, 'trash', Math.cos(0.87) * 180, Math.sin(0.87) * 180, { hp: 1000 });
    update(game, 1 / 60);
    assert.ok(front.hp < 1000 && side.hp < 1000);
  });
});

describe('보물', () => {
  function quiet(seed = 31) {
    const game = createGame(seeded(seed));
    game.spawnCarry = -100000;
    game.weapons = {};
    return game;
  }

  it('게임을 시작하면 보물 셋 가운데 하나를 고르고, 고른 보물은 다시 나오지 않는다', () => {
    const game = quiet();
    startWithRelic(game);
    assert.equal(game.choices.length, 3);
    assert.ok(game.choices.every((choice) => choice.kind === 'relic' && choice.details.length > 0));
    const picked = choose(game, 1);
    assert.equal(game.choices, null);
    for (let roll = 0; roll < 20; roll += 1) {
      startWithRelic(game);
      assert.ok(!game.choices.some((choice) => choice.id === picked.id));
      game.choices = null;
      game.pendingRelics = 0;
    }
  });

  it('보물이 스무 개가 넘고, 다 가졌으면 상자가 레벨업 두 번이 된다', () => {
    assert.ok(Object.keys(RELICS).length >= 20);
    const game = quiet();
    game.relics = Object.fromEntries(Object.keys(RELICS).map((id) => [id, true]));
    startWithRelic(game);
    assert.ok(game.choices.every((choice) => choice.kind !== 'relic'));
    assert.equal(game.pendingLevels, 2);
  });

  it('쌍둥이 노즐은 살충제를 두 번씩 쏜다', () => {
    const count = (twin) => {
      const game = quiet();
      game.weapons = { spray: 1 };
      if (twin) game.relics.twin = true;
      placeEnemy(game, 'trash', 300, 0, { hp: 1e9 });
      let fired = 0;
      for (let step = 0; step < 60 * 5; step += 1) {
        const before = game.shots.length;
        update(game, 1 / 60);
        fired += Math.max(0, game.shots.length - before);
      }
      return fired;
    };
    assert.ok(count(true) >= count(false) * 1.8);
  });

  it('두꺼운 이불은 멈춰 있을 때만 피해를 60% 줄인다', () => {
    const still = quiet();
    still.relics.blanket = true;
    placeEnemy(still, 'roach', 3, 0, { hp: 1e9, damage: 10 });
    update(still, 1 / 60);
    near(still.player.hp, PLAYER.maxHp - 4);
    const moving = quiet();
    moving.relics.blanket = true;
    placeEnemy(moving, 'roach', 3, 0, { hp: 1e9, damage: 10 });
    update(moving, 1 / 60, { x: 0.01, y: 1 });
    near(moving.player.hp, PLAYER.maxHp - 10);
  });

  it('구급상자는 한 번만 살려 준다', () => {
    const game = quiet();
    game.relics.firstaid = true;
    game.player.hp = 1;
    placeEnemy(game, 'roach', 3, 0, { hp: 1e9, damage: 50 });
    update(game, 1 / 60);
    assert.equal(game.over, false);
    assert.ok(game.player.hp >= PLAYER.maxHp * 0.5 - 1);
    game.player.hp = 1;
    game.player.invulnerable = 0;
    game.shieldUntil = -1;
    update(game, 1 / 60);
    assert.equal(game.over, true);
  });

  it('철수세미는 부딪힌 적에게 피해를 돌려준다', () => {
    const game = quiet();
    game.relics.scrubber = true;
    const roach = placeEnemy(game, 'roach', 3, 0, { hp: 1000, damage: 10 });
    update(game, 1 / 60);
    assert.equal(roach.hp, 1000 - 10 * RELICS.scrubber.reflect);
  });

  it('알람시계는 때마다 적을 얼린다', () => {
    const game = quiet();
    game.relics.alarm = true;
    game.alarmIn = 0.05;
    const roach = placeEnemy(game, 'roach', 300, 0, { hp: 1e9, speed: 60 });
    for (let step = 0; step < 6; step += 1) update(game, 1 / 60);
    const x = roach.x;
    for (let step = 0; step < 60; step += 1) update(game, 1 / 60);
    assert.equal(roach.x, x);
  });

  it('행운의 고양이는 다시 뽑기를 두 번 준다', () => {
    const game = quiet();
    game.relics.neko = true;
    game.pendingLevels = 1;
    update(game, 1 / 60);
    assert.ok(reroll(game) && reroll(game));
    assert.ok(!reroll(game));
    assert.equal(statsOf(game).critChance, 0.1);
  });

  it('에너지 드링크와 마지막 컵라면은 조건이 맞을 때만 공격력을 올린다', () => {
    const game = quiet();
    game.relics = { energy: true, lastcup: true };
    game.player.moving = false;
    assert.equal(statsOf(game).might, 1);
    game.player.moving = true;
    assert.equal(statsOf(game).might, 1.3);
    game.player.hp = PLAYER.maxHp * 0.2;
    assert.ok(Math.abs(statsOf(game).might - 1.9) < 1e-9);
  });
});

describe('물티슈 바람 폭', () => {
  it('물티슈가 있으면 선풍기 바람이 옆으로 더 넓게 닿는다', () => {
    const hits = (wipes) => {
      const game = createGame(seeded(4));
      game.spawnCarry = -1000;
      game.weapons = { fan: 1 };
      if (wipes) game.passives = { wipes: 5 };
      placeEnemy(game, 'trash', 100, 0, { hp: 1000 });
      const side = placeEnemy(game, 'trash', Math.cos(1.2) * 150, Math.sin(1.2) * 150, { hp: 1000 });
      update(game, 1 / 60);
      return side.hp < 1000;
    };
    assert.equal(hits(false), false);
    assert.equal(hits(true), true);
  });
});

describe('보물 2', () => {
  function quiet(seed = 41) {
    const game = createGame(seeded(seed));
    game.spawnCarry = -100000;
    game.weapons = {};
    return game;
  }
  const dummy = (extra = {}) => ({ id: 1, kind: 'roach', x: 0, y: 0, hp: 1000, radius: 10, kx: 0, ky: 0, ...extra });

  it('능력치형 보물은 바로 능력치에 붙는다', () => {
    const game = quiet();
    game.relics = { bigpot: true, stopwatch: true, dice: true, waterbottle: true, scooter: true };
    const stats = statsOf(game);
    assert.equal(stats.area, 1.25);
    assert.equal(stats.projectile, 1.25);
    near(stats.cooldownScale, 0.85, 1e-9);
    near(stats.critChance, 0.05, 1e-9);
    near(stats.critDamage, PLAYER.critDamage + 0.75, 1e-9);
    assert.equal(stats.maxHp, PLAYER.maxHp + 50);
    assert.equal(stats.regen, PLAYER.regen + 1);
    near(stats.speed, PLAYER.speed * 1.25, 1e-9);
  });

  it('형광등은 보스에게만 40% 더 때린다', () => {
    const game = quiet();
    game.relics.lamp = true;
    const boss = dummy({ boss: true });
    const normal = dummy({ id: 2 });
    damageEnemy(game, boss, 10);
    damageEnemy(game, normal, 10);
    assert.equal(boss.hp, 986);
    assert.equal(normal.hp, 990);
  });

  it('우산은 날아온 피해만 줄인다', () => {
    const game = quiet();
    game.relics.umbrella = true;
    game.enemyShots.push({ x: game.player.x, y: game.player.y, vx: 0, vy: 0, damage: 10, radius: 6, life: 5, kind: 'rust', age: 0 });
    update(game, 1 / 60);
    near(game.player.hp, PLAYER.maxHp - 4);
  });

  it('얼음틀은 맞은 적을 얼린다', () => {
    const game = quiet();
    game.relics.icetray = true;
    game.random = () => 0;
    const roach = placeEnemy(game, 'roach', 300, 0, { hp: 1000, speed: 60 });
    damageEnemy(game, roach, 10);
    update(game, 1 / 60);
    assert.equal(roach.frozen, true);
  });

  it('팝콘 기계는 쓰러진 적 주변에 피해를 준다', () => {
    const game = quiet();
    game.relics.popcorn = true;
    game.random = () => 0;
    const target = placeEnemy(game, 'roach', 300, 0, { hp: 1 });
    const near1 = placeEnemy(game, 'roach', 330, 0, { hp: 1000 });
    damageEnemy(game, target, 5);
    assert.equal(near1.hp, 1000 - RELICS.popcorn.damage);
  });

  it('폭죽은 때가 되면 주변 적에게 크게 터진다', () => {
    const game = quiet();
    game.relics.firecracker = true;
    game.fireIn = 0.01;
    const roach = placeEnemy(game, 'trash', 200, 0, { hp: 1000 });
    update(game, 1 / 60);
    assert.equal(roach.hp, 1000 - RELICS.firecracker.damage);
  });

  it('고무망치는 치명타를 없애고, 치명타 확률 5%마다 피해 +20과 공격 속도 2배를 준다', () => {
    const game = quiet();
    game.relics = { mallet: true, dice: true };
    game.passives = { clover: 2 };
    const stats = statsOf(game);
    assert.equal(stats.critChance, 0);
    assert.equal(stats.flatDamage, 60);
    near(stats.cooldownScale, 0.5, 1e-9);
    game.random = () => 0;
    const enemy = dummy();
    damageEnemy(game, enemy, 10);
    assert.equal(enemy.hp, 990);
    assert.ok(describeChoice(game, { kind: 'weapon', id: 'broom', level: 1 }).includes(`피해 ${WEAPONS.broom.damage[0] + 60}`));
    assert.equal(Object.fromEntries(statSheet(game))['고정 피해'], '+60');
  });
});

describe('시즌', () => {
  it('새 기록은 지금 시즌으로 보내고, 순위는 고른 시즌만 불러온다', async () => {
    const calls = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (url, options = {}) => {
      calls.push({ url: String(url), body: options.body ? JSON.parse(options.body) : null });
      return { ok: true, json: async () => [] };
    };
    try {
      assert.equal(SEASON, 3);
      assert.deepEqual(SEASONS, [3, 2, 1]);
      await submitRecord({ crewName: '쿠다', survivedMs: 60_000, kills: 10, level: 3 });
      assert.equal(calls[0].body.season, 3);
      await fetchRanking();
      assert.ok(calls[1].url.includes('room_survivors_season_best') && calls[1].url.includes('season=eq.3'));
      await fetchRanking(1);
      assert.ok(calls[2].url.includes('season=eq.1'));
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe('보물 개수 제한', () => {
  it('보물은 최대 3개이고, 다 채운 뒤의 상자는 레벨업 두 번이 된다', () => {
    assert.equal(MAX_RELICS, 3);
    const game = createGame(seeded(51));
    game.spawnCarry = -100000;
    for (let pick = 0; pick < MAX_RELICS; pick += 1) {
      startWithRelic(game);
      assert.ok(game.choices.every((choice) => choice.kind === 'relic'));
      choose(game, 0);
    }
    assert.equal(Object.keys(game.relics).length, 3);
    // 가득 찬 뒤의 상자: 새 보물 셋과 '그대로 두기'
    startWithRelic(game);
    assert.equal(game.choices.length, 4);
    assert.equal(game.choices[3].kind, 'relic-keep');
    choose(game, 3);
    assert.equal(game.pendingLevels, 2);
    assert.equal(Object.keys(game.relics).length, 3);
  });

  it('가득 차도 보물을 바꿀 수 있다', () => {
    const game = createGame(seeded(52));
    game.spawnCarry = -100000;
    game.relics = { waterbottle: true, magnet: true, dice: true };
    game.player.hp = statsOf(game).maxHp;
    startWithRelic(game);
    const incoming = game.choices[0].id;
    choose(game, 0);
    assert.ok(game.choices.every((choice, index) => (index < 3 ? choice.kind === 'relic-swap' : choice.kind === 'relic-keep')));
    assert.ok(!reroll(game));
    const dropped = game.choices.find((choice) => choice.id === 'waterbottle');
    choose(game, game.choices.indexOf(dropped));
    assert.ok(game.relics[incoming] && !game.relics.waterbottle);
    assert.equal(Object.keys(game.relics).length, 3);
    assert.equal(game.pendingRelics, 0);
    assert.ok(game.player.hp <= statsOf(game).maxHp);
  });
});

describe('정예와 한 방 피해 상한', () => {
  it('정예는 8분부터 일반 적이 나오는 순서대로 30초마다 한 종류씩 풀린다', () => {
    assert.equal(eliteFrom('roach'), 480);
    assert.equal(eliteFrom('trash'), 510);
    assert.equal(eliteFrom('moth'), 480 + 9 * 30);
    assert.equal(eliteFrom('scrap'), Infinity);
  });

  it('풀린 정예는 체력, 공격력, 크기, 경험치가 더 크다', () => {
    const make = (time) => {
      const game = createGame(() => 0);
      game.time = time;
      game.nextSwarmAt = Infinity;
      game.nextBossAt = Infinity;
      game.spawnCarry = 1;
      update(game, 1 / 60);
      return game;
    };
    const before = make(470).enemies.find((enemy) => enemy.kind === 'roach');
    assert.ok(before && !before.elite);
    const game = make(490);
    const elite = game.enemies.find((enemy) => enemy.kind === 'roach');
    assert.ok(elite.elite);
    assert.equal(elite.radius, ENEMIES.roach.radius * ELITE.radius);
    assert.equal(elite.xp, ENEMIES.roach.xp * ELITE.xp);
    assert.ok(elite.maxHp > before.maxHp * 3.5);
    assert.ok(game.effects.some((effect) => effect.type === 'banner' && effect.text === '정예 바퀴벌레 등장!'));
  });

  it('아무리 센 공격도 한 번에 최대 체력의 40%까지만 깎는다(14분부터는 상한이 커진다)', () => {
    const game = createGame(seeded(1));
    game.spawnCarry = -1000;
    game.weapons = {};
    placeEnemy(game, 'roach', 3, 0, { hp: 1e9, damage: 9999 });
    update(game, 1 / 60);
    near(game.player.hp, PLAYER.maxHp * (1 - PLAYER.maxHitShare));
    assert.equal(game.over, false);
    near(difficultyAt(14 * 60).hitShare, PLAYER.maxHitShare, 1e-9);
    near(difficultyAt(19 * 60).hitShare, PLAYER.maxHitShare + 0.4, 1e-9);
  });
});

describe('쌍둥이 노즐 너프', () => {
  it('두 번째 발사는 피해가 절반이다', () => {
    const game = createGame(seeded(61));
    game.spawnCarry = -100000;
    game.weapons = { spray: 1 };
    game.relics.twin = true;
    placeEnemy(game, 'trash', 300, 0, { hp: 1e9 });
    const damages = [];
    for (let step = 0; step < 60; step += 1) {
      const before = game.shots.length;
      update(game, 1 / 60);
      game.shots.slice(before).forEach((shot) => damages.push(shot.damage));
    }
    assert.ok(damages.includes(WEAPONS.spray.damage[0]));
    assert.ok(damages.includes(WEAPONS.spray.damage[0] * RELICS.twin.echoDamage));
  });
});

describe('새 무기 2', () => {
  function armed(weapon, level = 1) {
    const game = createGame(seeded(71));
    game.spawnCarry = -100000;
    game.weapons = { [weapon]: level };
    return game;
  }
  const run2 = (game, seconds) => { for (let step = 0; step < seconds * 60; step += 1) update(game, 1 / 60); };

  it('젖은 수건은 바라보는 쪽 적을 때리고, 2레벨부터 등 뒤도 때린다', () => {
    const one = armed('towel', 1);
    const front = placeEnemy(one, 'trash', 80, 0, { hp: 1e6 });
    const back = placeEnemy(one, 'trash', -80, 0, { hp: 1e6 });
    run2(one, 0.1);
    assert.ok(front.hp < 1e6);
    assert.equal(back.hp, 1e6);
    assert.ok(front.slowUntil > one.time);
    const two = armed('towel', 2);
    const back2 = placeEnemy(two, 'trash', -80, 0, { hp: 1e6 });
    run2(two, 0.1);
    assert.ok(back2.hp < 1e6);
  });

  it('종이비행기는 옆에 있는 적도 쫓아가 맞힌다', () => {
    const game = armed('paperplane');
    game.player.heading = 0;
    const side = placeEnemy(game, 'trash', 0, 200, { hp: 1e6 });
    run2(game, 2);
    assert.ok(side.hp < 1e6);
  });

  it('쥐덫은 적이 밟으면 닫히며 피해를 준다', () => {
    const game = armed('mousetrap');
    run2(game, 0.05);
    assert.equal(game.traps.length, 1);
    const trap = game.traps[0];
    const roach = placeEnemy(game, 'trash', trap.x - game.player.x, trap.y - game.player.y, { hp: 1e6 });
    run2(game, 0.6);
    assert.ok(roach.hp <= 1e6 - WEAPONS.mousetrap.damage[0]);
    assert.equal(game.traps.length, 0);
  });

  it('전자레인지 파동은 퍼지면서 한 적을 한 번만 때린다', () => {
    const game = armed('microwave');
    const near = placeEnemy(game, 'trash', 60, 0, { hp: 1e6 });
    const far = placeEnemy(game, 'trash', 130, 0, { hp: 1e6 });
    run2(game, 0.8);
    assert.equal(near.hp, 1e6 - WEAPONS.microwave.damage[0]);
    assert.equal(far.hp, 1e6 - WEAPONS.microwave.damage[0]);
  });

  it('샤워기는 근처 적 머리 위에 물줄기를 떨어뜨린다', () => {
    const game = armed('shower');
    const roach = placeEnemy(game, 'trash', 150, 40, { hp: 1e6 });
    run2(game, 0.6);
    assert.ok(roach.hp < 1e6);
  });
});

describe('새 적 2', () => {
  function quiet() {
    const game = createGame(seeded(72));
    game.spawnCarry = -100000;
    game.weapons = {};
    return game;
  }

  it('개미는 다섯 마리씩 무리 지어 나온다', () => {
    // 3분 50초에는 개미가 가중치 목록의 맨 끝이라, 난수 0.999면 개미를 고른다.
    const game = createGame(() => 0.999);
    game.time = 230;
    game.nextSwarmAt = Infinity;
    game.nextBossAt = Infinity;
    game.spawnCarry = 1;
    update(game, 1 / 60);
    assert.equal(game.enemies.filter((enemy) => enemy.kind === 'ant').length, 5);
  });

  it('민달팽이는 지나간 자리에 점액을 남긴다', () => {
    const game = quiet();
    placeEnemy(game, 'slug', 300, 0, { hp: 1e6, speed: 20 });
    for (let step = 0; step < 120; step += 1) update(game, 1 / 60);
    assert.ok(game.slimes.length >= 2);
  });

  it('양말은 가까이 있으면 닿지 않아도 냄새로 아프게 한다', () => {
    const game = quiet();
    placeEnemy(game, 'sock', 60, 0, { hp: 1e6, speed: 0, timer: 5 });
    update(game, 1 / 60);
    assert.ok(game.player.hp < PLAYER.maxHp);
  });

  it('먼지 토끼는 멀리 있으면 오리 근처로 순간 이동한다', () => {
    const game = quiet();
    const bunny = placeEnemy(game, 'dustbunny', 600, 0, { hp: 1e6, speed: 0, timer: 10 });
    update(game, 1 / 60);
    assert.ok(Math.hypot(bunny.x - game.player.x, bunny.y - game.player.y) < 160);
  });

  it('비둘기는 겨눈 뒤 걷는 속도보다 훨씬 빠르게 내리꽂는다', () => {
    const game = quiet();
    const pigeon = placeEnemy(game, 'pigeon', 300, 0, { hp: 1e6, speed: 60, timer: 10 });
    let fastest = 0;
    let aimed = false;
    for (let step = 0; step < 90; step += 1) {
      const before = pigeon.x;
      update(game, 1 / 60);
      aimed ||= pigeon.aiming;
      fastest = Math.max(fastest, Math.abs(pigeon.x - before) * 60);
    }
    assert.ok(aimed);
    assert.ok(fastest > 60 * 4);
  });
});

describe('합체 무기 2', () => {
  function fused(fusionId, weapons) {
    const game = createGame(seeded(81));
    game.spawnCarry = -100000;
    game.weapons = Object.fromEntries(weapons.map((id) => [id, MAX_LEVEL]));
    game.evolved = Object.fromEntries(weapons.map((id) => [id, true]));
    game.fusions = { [fusionId]: true };
    return game;
  }
  const run3 = (game, seconds) => { for (let step = 0; step < seconds * 60; step += 1) update(game, 1 / 60); };

  it('새 합체 다섯 개도 모두 실제 무기 둘로 만든다', () => {
    for (const id of ['mopstorm', 'bomber', 'foammine', 'dryoven', 'shockshower']) {
      assert.ok(FUSIONS[id].from.every((weapon) => WEAPONS[weapon]));
    }
  });

  it('물걸레 회오리는 주위 적을 때리고 오리 쪽으로 끌어당긴다', () => {
    const game = fused('mopstorm', ['towel', 'broom']);
    game.weapons = {};
    game.weapons.towel = MAX_LEVEL;
    game.cooldowns.towel = 999;
    game.mopIn = 0.01;
    const enemy = placeEnemy(game, 'trash', 0, 150, { hp: 1e6 });
    update(game, 1 / 60);
    assert.ok(enemy.hp < 1e6);
    assert.ok(enemy.ky < 0);
  });

  it('파리채 폭격기는 비행기가 맞힌 적 옆의 적도 때린다', () => {
    const game = fused('bomber', ['paperplane', 'swatter']);
    game.weapons = { paperplane: MAX_LEVEL, swatter: MAX_LEVEL };
    game.cooldowns.swatter = 999;
    game.player.heading = 0;
    placeEnemy(game, 'trash', 150, 0, { hp: 1e6 });
    const beside = placeEnemy(game, 'trash', 150, 40, { hp: 1e6, radius: 4 });
    run3(game, 1.5);
    assert.ok(beside.hp < 1e6);
  });

  it('거품 지뢰는 덫이 닫힐 때 거품을 내보낸다', () => {
    const game = fused('foammine', ['mousetrap', 'detergent']);
    game.weapons = { mousetrap: MAX_LEVEL, detergent: MAX_LEVEL };
    game.cooldowns.detergent = 999;
    run3(game, 0.05);
    const trap = game.traps[0];
    placeEnemy(game, 'trash', trap.x - game.player.x, trap.y - game.player.y, { hp: 1e6 });
    // 덫이 닫히는 순간 나온 거품은 바로 그 적에 닿아 터지므로, 터진 거품 고리로 확인한다.
    for (let step = 0; step < 60 && game.traps.includes(trap); step += 1) update(game, 1 / 60);
    assert.ok(game.effects.filter((effect) => effect.type === 'ring' && effect.color === 'bubble').length >= FUSIONS.foammine.bubbles - 1);
  });

  it('건조 오븐 파동은 맞은 적을 느리게 하고 태운다', () => {
    const game = fused('dryoven', ['microwave', 'dehumidifier']);
    game.weapons = { microwave: MAX_LEVEL };
    const enemy = placeEnemy(game, 'trash', 100, 0, { hp: 1e6 });
    run3(game, 0.4);
    assert.ok(enemy.burning);
    assert.ok(enemy.slowUntil > game.time);
  });

  it('감전 샤워는 물줄기 자리에서 떨어진 적에게도 전기를 튀긴다', () => {
    const game = fused('shockshower', ['shower', 'zapper']);
    game.weapons = { shower: MAX_LEVEL, zapper: MAX_LEVEL };
    game.cooldowns.zapper = 999;
    const target = placeEnemy(game, 'trash', 150, 0, { hp: 1e6 });
    const side = placeEnemy(game, 'trash', 150, 120, { hp: 1e6 });
    game.splashes.push({ x: target.x, y: target.y, delay: 0.01, total: 0.01, radius: 30, damage: 1, mega: false });
    game.cooldowns.shower = 999;
    update(game, 1 / 60);
    assert.ok(side.hp < 1e6);
  });
});

describe('합체 개수 제한', () => {
  it('합체는 한 판에 2개까지만 선택지에 나온다', () => {
    assert.equal(MAX_FUSIONS, 2);
    const game = createGame(seeded(91));
    game.weapons = Object.fromEntries(Object.keys(WEAPONS).map((id) => [id, MAX_LEVEL]));
    game.evolved = Object.fromEntries(Object.keys(WEAPONS).map((id) => [id, true]));
    game.fusions = { thunderball: true };
    assert.equal(rollChoices(game)[0].kind, 'fusion');
    game.fusions.sawblade = true;
    for (let roll = 0; roll < 20; roll += 1) assert.ok(!rollChoices(game).some((choice) => choice.kind === 'fusion'));
  });
});

describe('아이템 개수 제한', () => {
  it('같은 종류의 아이템은 맵에 2개까지만 떨어져 있다', () => {
    assert.equal(DROP_LIMIT, 2);
    const game = createGame(() => 0);
    game.spawnCarry = -100000;
    game.weapons = {};
    for (let index = 0; index < 6; index += 1) {
      const enemy = placeEnemy(game, 'roach', 2000, index * 40, { hp: 1 });
      damageEnemy(game, enemy, 10);
    }
    const counts = {};
    game.drops.forEach((drop) => { counts[drop.type] = (counts[drop.type] ?? 0) + 1; });
    assert.ok(Object.values(counts).every((count) => count <= 2));
    assert.equal(counts.ramen, 2);
    assert.ok(game.drops.length > 2);
  });
});

describe('새 보스', () => {
  function boss(kind, extra = {}) {
    const game = createGame(seeded(95));
    game.spawnCarry = -100000;
    game.weapons = {};
    const stats = BOSSES.find((entry) => entry.kind === kind);
    const enemy = placeEnemy(game, kind, 250, 0, { boss: true, hp: 1e6, maxHp: 1e6, speed: 0, radius: stats.radius, stats, label: stats.label, ...extra });
    return { game, enemy, stats };
  }

  it('보스는 일곱 종류이고, 새 셋은 7분 30초부터 차례로 나온다', () => {
    assert.deepEqual(BOSSES.slice(4).map((entry) => entry.kind), ['washer', 'riceCooker', 'moldQueen']);
    assert.ok(BOSSES.every((entry) => entry.description));
  });

  it('세탁기 괴물은 탈수하며 두 줄 탄막을 뿜고 오리를 빨아들인다', () => {
    const { game, stats } = boss('washer', { timer: 99 });
    const before = game.player.x;
    for (let step = 0; step < 60; step += 1) update(game, 1 / 60);
    assert.ok(game.enemyShots.length >= 6);
    assert.ok(game.player.x > before + stats.pull * 0.5);
  });

  it('전기밥솥의 증기 줄기는 띠 안에 있을 때만 맞는다', () => {
    const { game } = boss('riceCooker', { timer: 99 });
    update(game, 1 / 60);
    assert.equal(game.hazards.filter((hazard) => hazard.line).length, 3);
    game.player.y += 200; // 띠 밖으로 피한다
    for (let step = 0; step < 70; step += 1) update(game, 1 / 60);
    near(game.player.hp, PLAYER.maxHp, 0.01);
    const second = boss('riceCooker', { timer: 99 });
    for (let step = 0; step < 70; step += 1) update(second.game, 1 / 60);
    assert.ok(second.game.player.hp < PLAYER.maxHp - 5);
  });

  it('곰팡이 여왕은 오리 둘레에 포자 고리를 떨어뜨리고 곰팡이를 부른다', () => {
    const { game, stats } = boss('moldQueen', { timer: 99, sporeIn: 0.01 });
    update(game, 1 / 60);
    assert.equal(game.hazards.filter((hazard) => hazard.spore).length, stats.sporeCount + 1);
    assert.equal(game.enemies.filter((enemy) => enemy.kind === 'mold').length, stats.summonCount);
  });
});

describe('능력치 투자', () => {
  it('기본 수치 효율은 5·10·20점에 조금씩 올라 20점이면 1.4배다', () => {
    [[0, 1], [4, 1], [5, 1.1], [9, 1.1], [10, 1.2], [19, 1.2], [20, 1.4]].forEach(([points, value]) => near(buildEfficiency(points), value, 1e-9));
  });

  it('배분은 파트당 20, 합계 30을 넘지 못한다', () => {
    assert.deepEqual(normalizeBuild({ crit: 25, haste: 20, survival: -3, treasure: 'x' }), { crit: 20, haste: 10, survival: 0, treasure: 0 });
    assert.deepEqual(normalizeBuild({ crit: 5.7, treasure: 3 }), { crit: 5, haste: 0, survival: 0, treasure: 3 });
  });

  it('기본 수치는 작게 오르고, 체력은 늘어난 최대치로 시작한다', () => {
    const game = createGame(seeded(97));
    applyBuild(game, { survival: 4 });
    const stats = statsOf(game);
    assert.equal(stats.maxHp, PLAYER.maxHp + 4);
    assert.equal(game.player.hp, stats.maxHp);
    near(stats.armor, 4 * 0.0025, 1e-9);
    near(stats.regen, PLAYER.regen, 1e-9);
  });

  it('생존 5점은 초당 회복 +1, 10점은 받는 피해 -10%와 무적 시간을 더한다', () => {
    const game = createGame(seeded(97));
    applyBuild(game, { survival: 10 });
    const stats = statsOf(game);
    near(stats.regen, PLAYER.regen + 1, 1e-9);
    near(stats.armor, 1 - (1 - 10 * 0.0025 * 1.2) * 0.9, 1e-9);
    game.spawnCarry = -1000;
    game.weapons = {};
    placeEnemy(game, 'roach', 3, 0, { hp: 1e9, damage: 5 });
    update(game, 1 / 60);
    assert.ok(game.player.invulnerable > PLAYER.invulnerableSec);
  });

  it('공속 5점은 레벨업 뒤 잠깐 공격 속도가 오르고, 10점은 크기와 범위를 키운다', () => {
    const game = createGame(seeded(97));
    applyBuild(game, { haste: 10 });
    const before = statsOf(game).cooldownScale;
    game.xp = game.nextXp;
    game.gems.push({ x: game.player.x, y: game.player.y, value: 0 });
    update(game, 1 / 60);
    near(statsOf(game).cooldownScale, before / 1.4, 1e-6);
    near(statsOf(game).projectile, 1.2, 1e-9);
    near(statsOf(game).area, 1.1, 1e-9);
  });

  it('공속 20점은 상시 공속 10%와 8초마다 3초 동안 공속 1.5배를 준다', () => {
    const game = createGame(seeded(97));
    applyBuild(game, { haste: 20 });
    game.time = 1;
    const calm = statsOf(game).cooldownScale;
    game.time = 6;
    near(statsOf(game).cooldownScale, calm / 1.5, 1e-9);
    near(calm, 1 / (1 + 20 * 0.005 * 1.4) / 1.1, 1e-9);
  });

  it('치명 5점은 정예에게만 치명타 확률을 더한다', () => {
    const game = createGame(seeded(97));
    applyBuild(game, { crit: 5 });
    game.random = () => 0.05;
    const roach = { id: 1, kind: 'roach', x: 0, y: 0, hp: 1000, radius: 10, kx: 0, ky: 0 };
    const elite = { ...roach, id: 2, elite: true };
    damageEnemy(game, roach, 10);
    damageEnemy(game, elite, 10);
    assert.equal(roach.hp, 990);
    assert.ok(elite.hp < 990);
  });

  it('치명 10점은 치명타로 쓰러진 적이 터져 옆의 적도 다친다', () => {
    const game = createGame(seeded(97));
    applyBuild(game, { crit: 10 });
    game.random = () => 0;
    const target = placeEnemy(game, 'roach', 100, 0, { hp: 1 });
    const near1 = placeEnemy(game, 'trash', 130, 0, { hp: 1e6 });
    damageEnemy(game, target, 100);
    assert.ok(near1.hp < 1e6);
  });

  it('치명 20점의 치명타는 적을 기절시키고 더 아프다', () => {
    const game = createGame(seeded(97));
    applyBuild(game, { crit: 20 });
    game.random = () => 0;
    near(statsOf(game).critDamage, PLAYER.critDamage + 20 * 0.015 * 1.4 + 0.5, 1e-9);
    const enemy = { id: 1, kind: 'roach', x: 0, y: 0, hp: 1000, radius: 10, kx: 0, ky: 0 };
    damageEnemy(game, enemy, 10);
    assert.ok(enemy.chillUntil > game.time);
  });

  it('생존 20점은 한 번 부활한다', () => {
    const game = createGame(seeded(97));
    applyBuild(game, { survival: 20 });
    game.spawnCarry = -1000;
    game.weapons = {};
    game.player.hp = 1;
    placeEnemy(game, 'roach', 3, 0, { hp: 1e9, damage: 500 });
    update(game, 1 / 60);
    assert.equal(game.over, false);
    assert.ok(game.player.hp > 1);
  });

  it('보물 파트는 보물 피해를 올리고, 5점이면 시작 보물을 두 번 고른다', () => {
    const plain = createGame(seeded(97));
    const game = createGame(seeded(97));
    applyBuild(game, { treasure: 10 });
    near(statsOf(game).relicPower, 1 + 10 * 0.02 * 1.2 + 0.3, 1e-9);
    startWithRelic(game);
    choose(game, 0);
    assert.ok(game.choices && game.choices.every((choice) => choice.kind === 'relic'));
    for (const target of [plain, game]) {
      target.relics = { firecracker: true };
      target.choices = null;
      target.pendingRelics = 0;
      target.spawnCarry = -1000;
      target.fireIn = 0.001;
    }
    const a = placeEnemy(plain, 'trash', 40, 0, { hp: 1e6 });
    const b = placeEnemy(game, 'trash', 40, 0, { hp: 1e6 });
    plain.random = () => 0.99;
    game.random = () => 0.99;
    update(plain, 1 / 60);
    update(game, 1 / 60);
    near((1e6 - b.hp) / (1e6 - a.hp), 1 + 10 * 0.02 * 1.2 + 0.3, 1e-6);
    // 1점당 주기 -1%, 10점 주기 -30%
    near(game.fireIn / plain.fireIn, (1 - 10 * 0.01 * 1.2) * 0.7, 1e-3);
  });

  it('보물 파트 20점이면 보물을 6개까지 가지고, 공격 보물과 보물 패시브가 나온다', () => {
    const plain = createGame(seeded(97));
    const game = createGame(seeded(97));
    applyBuild(game, { treasure: 20 });
    const attack = Object.keys(RELICS).filter((id) => RELICS[id].treasureOnly);
    assert.ok(attack.length >= 9);
    for (let index = 0; index < 40; index += 1) {
      assert.ok(rollRelics(plain).every((choice) => !RELICS[choice.id].treasureOnly));
      assert.ok(rollChoices(plain).every((choice) => choice.kind !== 'passive' || !PASSIVES[choice.id].treasureOnly));
    }
    const offered = new Set();
    for (let index = 0; index < 60; index += 1) rollRelics(game).forEach((choice) => offered.add(choice.id));
    assert.ok(attack.some((id) => offered.has(id)));
    game.relics = { waterbottle: true, magnet: true, dice: true, lamp: true, pas: true };
    assert.equal(rollRelics(game).length, 4);
    assert.ok(rollRelics(game).every((choice) => choice.kind === 'relic'));
    game.relics.top = true;
    assert.equal(rollRelics(game).at(-1).kind, 'relic-keep');
  });

});

describe('무기 개수 제한과 교체', () => {
  const full = () => {
    const game = createGame(seeded(11));
    const owned = Object.keys(WEAPONS).slice(0, MAX_WEAPONS);
    game.weapons = Object.fromEntries(owned.map((id) => [id, 3]));
    const fresh = Object.keys(WEAPONS).find((id) => !game.weapons[id]);
    game.pendingLevels = 1;
    game.choices = [{ kind: 'weapon', id: fresh, level: 1, label: WEAPONS[fresh].label }, { kind: 'heal', id: 'ramen-1', level: 0, label: '라면' }];
    return { game, owned, fresh };
  };

  it('무기가 가득 차도 새 무기를 고르면 내려놓을 무기를 묻는다', () => {
    const { game, owned } = full();
    choose(game, 0);
    assert.ok(game.choices.filter((choice) => choice.kind === 'weapon-swap').length === owned.length);
    assert.equal(game.choices.at(-1).kind, 'weapon-cancel');
    assert.equal(reroll(game), false);
  });

  it('내려놓으면 그 무기가 빠지고 새 무기가 1레벨로 들어온다', () => {
    const { game, owned, fresh } = full();
    game.evolved[owned[0]] = true;
    choose(game, 0);
    choose(game, game.choices.findIndex((choice) => choice.id === owned[0]));
    assert.equal(game.weapons[owned[0]], undefined);
    assert.equal(game.evolved[owned[0]], undefined);
    assert.equal(game.weapons[fresh], 1);
    assert.equal(Object.keys(game.weapons).length, MAX_WEAPONS);
    assert.equal(game.pendingLevels, 0);
  });

  it('그대로 두기를 고르면 아까 카드로 돌아간다', () => {
    const { game } = full();
    const before = game.choices;
    choose(game, 0);
    choose(game, game.choices.length - 1);
    assert.equal(game.choices, before);
    assert.equal(game.pendingLevels, 1);
  });

  it('합체에 쓰인 무기는 내려놓을 수 없다', () => {
    const { game } = full();
    game.weapons = Object.fromEntries(Object.keys(WEAPONS).filter((id) => id !== game.choices[0].id && id !== 'ball' && id !== 'zapper')
      .slice(0, MAX_WEAPONS - 2).map((id) => [id, 3]));
    Object.assign(game.weapons, { ball: MAX_LEVEL, zapper: MAX_LEVEL });
    game.fusions = { thunderball: true };
    assert.equal(Object.keys(game.weapons).length, MAX_WEAPONS);
    choose(game, 0);
    const offered = game.choices.map((choice) => choice.id);
    assert.ok(!offered.includes('ball') && !offered.includes('zapper'));
  });
});

describe('조합 밸런스와 피해 보물', () => {
  const calm = () => {
    const game = createGame(seeded(21));
    game.spawnCarry = -1000;
    game.weapons = {};
    game.random = () => 0.99;
    return game;
  };

  it('파리채 폭격기를 만들면 파리채는 혼자 내려치지 않는다', () => {
    const game = calm();
    game.weapons = { swatter: MAX_LEVEL };
    game.fusions = { bomber: true };
    const enemy = placeEnemy(game, 'trash', 100, 0, { hp: 1e6 });
    update(game, 1 / 60);
    assert.equal(enemy.hp, 1e6);
    delete game.fusions.bomber;
    update(game, 1 / 60);
    assert.ok(enemy.hp < 1e6);
  });

  it('독침 기관총을 만들면 살충제는 쉬고, 스테이플러가 적을 쫓는 독침 다섯 발을 쏜다', () => {
    const game = calm();
    game.weapons = { spray: MAX_LEVEL, stapler: MAX_LEVEL };
    game.fusions = { poisongun: true };
    placeEnemy(game, 'trash', 200, 0, { hp: 1e6 });
    update(game, 1 / 60);
    const shots = game.shots;
    assert.equal(shots.length, FUSIONS.poisongun.shots);
    assert.ok(shots.every((shot) => shot.kind === 'staple' && shot.homing && shot.poison > 0));
  });

  it('6분이 지나면 적이 더 가파르게 세진다', () => {
    const early = difficultyAt(6 * 60);
    const later = difficultyAt(8 * 60);
    assert.ok(later.hp / early.hp > 1.9);
    assert.ok(later.damage - early.damage > 1.2);
  });

  it('물파스는 때마다 주변을 터뜨리고, 레벨이 높을수록 세다', () => {
    const low = calm();
    const high = calm();
    high.level = 26;
    for (const game of [low, high]) {
      game.relics = { pas: true };
      game.pasIn = 0.001;
    }
    const a = placeEnemy(low, 'trash', 60, 0, { hp: 1e6 });
    const b = placeEnemy(high, 'trash', 60, 0, { hp: 1e6 });
    update(low, 1 / 60);
    update(high, 1 / 60);
    near(1e6 - a.hp, RELICS.pas.damage, 1e-6);
    near((1e6 - b.hp) / (1e6 - a.hp), 2, 1e-6);
  });

  it('전기장판은 때마다 넓은 주변을 지지고, 방향제는 화면의 적을 모두 때린다', () => {
    const game = calm();
    game.relics = { heatpad: true, freshener: true };
    game.freshIn = 0.001;
    game.heatIn = 0.001;
    const nearby = placeEnemy(game, 'trash', 160, 0, { hp: 1e6 });
    const far = placeEnemy(game, 'trash', 500, 0, { hp: 1e6 });
    update(game, 1 / 60);
    assert.ok(nearby.hp < far.hp);
    near(1e6 - far.hp, RELICS.freshener.damage, 1e-6);
  });

  it('빨래집게는 쓰러진 자리에 집게를 남기고, 적이 밟으면 문다', () => {
    const game = calm();
    game.relics = { clothespin: true };
    game.random = () => 0;
    const victim = placeEnemy(game, 'roach', 300, 0, { hp: 1 });
    damageEnemy(game, victim, 5);
    assert.equal(game.pins.length, 1);
    const walker = placeEnemy(game, 'trash', 300, 0, { hp: 1e6 });
    update(game, 1 / 60);
    assert.equal(game.pins.length, 0);
    assert.ok(walker.hp < 1e6);
  });

  it('광택제는 보물 피해를 올린다', () => {
    const game = calm();
    game.passives = { polish: 5 };
    near(statsOf(game).relicPower, 1 + PASSIVES.polish.relicPower[4], 1e-9);
  });
});

describe('도탄 톱날', () => {
  it('톱날이 적에서 적으로 튕기며 베고, 베인 적은 계속 피해를 입는다', () => {
    const game = createGame(seeded(33));
    game.spawnCarry = -1000;
    game.weapons = { slipper: MAX_LEVEL, roller: MAX_LEVEL };
    game.cooldowns = { slipper: 99, roller: 99 };
    game.fusions = { sawblade: true };
    game.random = () => 0.99;
    const first = placeEnemy(game, 'trash', 120, 0, { hp: 1e6 });
    const second = placeEnemy(game, 'trash', 240, 60, { hp: 1e6 });
    for (let frame = 0; frame < 60; frame += 1) update(game, 1 / 60);
    assert.ok(first.hp < 1e6 && second.hp < 1e6);
    assert.ok(first.bleedUntil > game.time - 3);
    assert.equal(sawBlades(game).length, FUSIONS.sawblade.count);
  });
});

describe('난이도와 보물 범위·쿨타임', () => {
  it('14분부터 벽처럼 세져서 20분 무렵에는 체력이 14분의 몇 배다', () => {
    assert.ok(difficultyAt(20 * 60).hp / difficultyAt(14 * 60).hp > 3);
    assert.ok(difficultyAt(20 * 60).damage - difficultyAt(14 * 60).damage > 10);
  });

  it('보스는 일반 보스 수치보다 빠르게 쫓아온다', () => {
    assert.equal(bossStatsOf(0, 90).speed, BOSSES[0].speed * BOSS_SPEED);
  });

  it('보물은 범위와 쿨타임 영향을 받는다', () => {
    const plain = createGame(seeded(5));
    const boosted = createGame(seeded(5));
    boosted.passives = { wipes: 5, battery: 5 };
    for (const game of [plain, boosted]) {
      game.spawnCarry = -1000;
      game.weapons = {};
      game.random = () => 0.99;
      game.relics = { pas: true };
      game.pasIn = 0.001;
    }
    const reach = RELICS.pas.radius * (1 + PASSIVES.wipes.area[4]) - 5;
    const a = placeEnemy(plain, 'trash', reach, 0, { hp: 1e6, speed: 0 });
    const b = placeEnemy(boosted, 'trash', reach, 0, { hp: 1e6, speed: 0 });
    update(plain, 1 / 60);
    update(boosted, 1 / 60);
    assert.equal(a.hp, 1e6);
    assert.ok(b.hp < 1e6);
    assert.ok(boosted.pasIn < plain.pasIn);
  });
});

describe('딜 보물 2와 보물 전용 패시브', () => {
  const calm = () => {
    const game = createGame(seeded(41));
    game.spawnCarry = -1000;
    game.weapons = {};
    game.random = () => 0.99;
    return game;
  };

  it('멀티탭은 가까운 적들에게 벼락을 떨어뜨린다', () => {
    const game = calm();
    game.random = () => 0.5;
    game.relics = { outlet: true };
    game.outletIn = 0.001;
    const targets = [100, 200, 300].map((dx) => placeEnemy(game, 'trash', dx, 0, { hp: 1e6, speed: 0 }));
    update(game, 1 / 60);
    assert.ok(targets.every((enemy) => enemy.hp < 1e6));
  });

  it('고무장갑은 바라보는 쪽만 후려친다', () => {
    const game = calm();
    game.relics = { glove: true };
    game.gloveIn = 0.001;
    game.player.heading = 0;
    const front = placeEnemy(game, 'trash', 200, 0, { hp: 1e6, speed: 0 });
    const back = placeEnemy(game, 'trash', -200, 0, { hp: 1e6, speed: 0 });
    update(game, 1 / 60);
    assert.ok(front.hp < 1e6);
    assert.equal(back.hp, 1e6);
  });

  it('성냥은 한 대씩 맞힌 적에게 불을 붙인다', () => {
    const game = calm();
    game.relics = { match: true };
    game.random = () => 0.01;
    const enemy = placeEnemy(game, 'trash', 300, 0, { hp: 1e6, speed: 0 });
    damageEnemy(game, enemy, 10);
    assert.ok(enemy.burnUntil > game.time);
    const before = enemy.hp;
    game.random = () => 0.99;
    update(game, 1 / 60);
    assert.ok(enemy.hp < before);
  });

  it('팽이는 쿨타임마다 하나씩 날아가 튕기며 돌고, 쿨타임이 짧을수록 많이 돈다', () => {
    const slow = calm();
    const fast = calm();
    fast.passives = { windup: 5 };
    for (const game of [slow, fast]) {
      game.relics = { top: true };
      for (let frame = 0; frame < 60 * 4; frame += 1) update(game, 1 / 60);
    }
    assert.ok(topSpinners(fast).length > topSpinners(slow).length);
    const game = calm();
    game.relics = { top: true };
    game.topIn = 0.001;
    update(game, 1 / 60);
    const [spinner] = topSpinners(game);
    const enemy = placeEnemy(game, 'trash', spinner.x - game.player.x + spinner.dx * 6, spinner.y - game.player.y + spinner.dy * 6, { hp: 1e6, speed: 0 });
    update(game, 1 / 60);
    assert.ok(enemy.hp < 1e6);
  });

  it('정수기는 얼음 조각을 사방으로 쏜다', () => {
    const game = calm();
    game.relics = { purifier: true };
    game.purifierIn = 0.001;
    update(game, 1 / 60);
    assert.equal(game.shots.filter((shot) => shot.kind === 'ice').length, RELICS.purifier.shards);
  });

  it('태엽 열쇠는 보물을 더 자주 발동하게 한다', () => {
    const plain = calm();
    const tuned = calm();
    tuned.passives = { windup: 5 };
    for (const game of [plain, tuned]) {
      game.relics = { pas: true };
      game.pasIn = 0.001;
    }
    update(plain, 1 / 60);
    update(tuned, 1 / 60);
    near(tuned.pasIn / plain.pasIn, 1 - PASSIVES.windup.relicHaste[4], 1e-3);
    assert.equal(Object.fromEntries(statSheet(tuned))['보물 발동 주기'], '-40%');
  });

});

describe('보물 20점 무기 칸', () => {
  it('보물 파트 20점이면 무기는 5칸이라 여섯 번째 새 무기는 교체를 묻는다', () => {
    const game = createGame(seeded(61));
    applyBuild(game, { treasure: 20 });
    game.weapons = { spray: 1, broom: 1, bleach: 1, coil: 1, ball: 1 };
    game.pendingLevels = 1;
    game.choices = [{ kind: 'weapon', id: 'swatter', level: 1, label: WEAPONS.swatter.label }];
    choose(game, 0);
    assert.equal(game.choices[0].kind, 'weapon-swap');
    assert.equal(game.choices.filter((choice) => choice.kind === 'weapon-swap').length, 5);
  });
});
