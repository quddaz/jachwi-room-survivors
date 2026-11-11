import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  choose, createGame, damageEnemy, describeChoice, formatTime, reroll, rollChoices, startWithRelic, statSheet, statsOf, update,
} from '../src/engine.js';
import { fetchRanking, rankBest, SEASON, SEASONS, submitRecord } from '../src/leaderboard.js';
import { BOSS_EVERY_SEC, BOSSES, difficultyAt, FUSIONS, MAX_LEVEL, MAX_RELICS, RELICS, passiveMaxLevel, PASSIVES, PLAYER, WEAPONS, xpToNext } from '../src/rules.js';

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

  it('고무장갑이 받는 피해를 줄인다', () => {
    const game = createGame(seeded(1));
    game.spawnCarry = -1000;
    game.weapons = {};
    game.passives.gloves = 5;
    placeEnemy(game, 'roach', 3, 0, { hp: 1000, damage: 10 });
    update(game, 1 / 60);
    near(game.player.hp, PLAYER.maxHp - 7);
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
  it('단백질 셰이크와 운동화는 10레벨까지, 나머지는 5레벨까지 올린다', () => {
    assert.equal(passiveMaxLevel('protein'), 10);
    assert.equal(passiveMaxLevel('sneakers'), 10);
    assert.equal(passiveMaxLevel('gloves'), 5);
    const game = createGame(seeded(4));
    game.weapons = Object.fromEntries(Object.keys(WEAPONS).map((id) => [id, MAX_LEVEL]));
    game.evolved = Object.fromEntries(Object.keys(WEAPONS).map((id) => [id, true]));
    game.fusions = Object.fromEntries(Object.keys(FUSIONS).map((id) => [id, true]));
    game.passives = Object.fromEntries(Object.keys(PASSIVES).map((id) => [id, 5]));
    const offered = rollChoices(game).filter((choice) => choice.kind === 'passive').map((choice) => choice.id).sort();
    assert.deepEqual(offered, ['protein', 'sneakers']);
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

  it('상한 우유는 가까이 오면 터지고, 그 전에 잡으면 터지지 않는다', () => {
    const blown = quiet();
    placeEnemy(blown, 'milk', 60, 0, { hp: 1e6 });
    for (let step = 0; step < 90; step += 1) update(blown, 1 / 60);
    assert.ok(blown.player.hp < PLAYER.maxHp);
    assert.equal(blown.enemies.length, 0);

    const defused = quiet();
    const milk = placeEnemy(defused, 'milk', 60, 0, { hp: 10 });
    update(defused, 1 / 60);
    assert.equal(defused.hazards.length, 1);
    milk.x += 400; // 닿아서 다치는 것과 구분하려고 멀리 옮긴 뒤 잡는다
    damageEnemy(defused, milk, 999);
    for (let step = 0; step < 90; step += 1) update(defused, 1 / 60);
    assert.equal(defused.player.hp, PLAYER.maxHp);
    assert.equal(defused.hazards.length, 0);
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
    assert.deepEqual(describeChoice(game, { kind: 'passive', id: 'gloves', level: 1 }), ['받는 피해 -8%']);
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
    assert.equal(sheet['치명타 확률'], '10%');
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

  it('두꺼운 이불은 멈춰 있을 때만 피해를 80% 줄인다', () => {
    const still = quiet();
    still.relics.blanket = true;
    placeEnemy(still, 'roach', 3, 0, { hp: 1e9, damage: 10 });
    update(still, 1 / 60);
    near(still.player.hp, PLAYER.maxHp - 2);
    const moving = quiet();
    moving.relics.blanket = true;
    placeEnemy(moving, 'roach', 3, 0, { hp: 1e9, damage: 10 });
    update(moving, 1 / 60, { x: 0.01, y: 1 });
    assert.ok(moving.player.hp < PLAYER.maxHp - 8);
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

  it('고무망치는 치명타를 없애고, 치명타 확률 5%마다 피해 +5와 공격 속도 2배를 준다', () => {
    const game = quiet();
    game.relics = { mallet: true, dice: true };
    game.passives = { clover: 2 };
    const stats = statsOf(game);
    assert.equal(stats.critChance, 0);
    assert.equal(stats.flatDamage, 15);
    near(stats.cooldownScale, 0.5, 1e-9);
    game.random = () => 0;
    const enemy = dummy();
    damageEnemy(game, enemy, 10);
    assert.equal(enemy.hp, 990);
    assert.ok(describeChoice(game, { kind: 'weapon', id: 'broom', level: 1 }).includes(`피해 ${WEAPONS.broom.damage[0] + 15}`));
    assert.equal(Object.fromEntries(statSheet(game))['고정 피해'], '+15');
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
      assert.equal(SEASON, 2);
      assert.deepEqual(SEASONS, [2, 1]);
      await submitRecord({ crewName: '쿠다', survivedMs: 60_000, kills: 10, level: 3 });
      assert.equal(calls[0].body.season, 2);
      await fetchRanking();
      assert.ok(calls[1].url.includes('room_survivors_season_best') && calls[1].url.includes('season=eq.2'));
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
    startWithRelic(game);
    assert.ok(game.choices.every((choice) => choice.kind !== 'relic'));
    assert.equal(game.pendingLevels, 2);
    assert.equal(Object.keys(game.relics).length, 3);
  });
});
