import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyBuild, createGame, damageEnemy, statsOf, update } from '../src/engine.js';

function quiet() {
  const game = createGame(() => 0.99);
  game.weapons = {};
  game.spawnCarry = -100000;
  return game;
}

function target(game, extra = {}) {
  const enemy = { id: game.nextId++, kind: 'roach', x: game.player.x + 300, y: game.player.y,
    hp: 10000, maxHp: 10000, speed: 100, radius: 10, damage: 0, xp: 1, timer: 0, kx: 0, ky: 0, ...extra };
  game.enemies.push(enemy);
  return enemy;
}

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);

describe('밀어내기 대신 타격 둔화', () => {
  it('맞는 순간 위치와 밀림 속도는 바뀌지 않고 둔화 중에도 오리 쪽으로 다가온다', () => {
    const game = quiet();
    const enemy = target(game);
    const start = enemy.x;
    damageEnemy(game, enemy, 1, true);
    assert.equal(enemy.x, start);
    assert.equal(enemy.kx, 0);
    assert.equal(enemy.ky, 0);
    update(game, 0.1);
    near(start - enemy.x, 7.5);
    assert.ok(enemy.vx < 0);
  });

  it('일반 적은 25%, 정예는 15% 느려지고 보스는 타격 둔화에 면역이다', () => {
    for (const [extra, distance] of [[{}, 7.5], [{ elite: true }, 8.5], [{ boss: true }, 10]]) {
      const game = quiet();
      const enemy = target(game, extra);
      const start = enemy.x;
      damageEnemy(game, enemy, 1, true);
      update(game, 0.1);
      near(start - enemy.x, distance);
      assert.equal(enemy.kx, 0);
      if (enemy.boss) assert.equal(enemy.hitSlowUntil, undefined);
    }
  });

  it('연속 100회 타격해도 둔화율은 중첩되지 않고 마지막 타격부터 0.35초만 유지한다', () => {
    const game = quiet();
    const enemy = target(game);
    const start = enemy.x;
    for (let hit = 0; hit < 100; hit += 1) {
      game.time = hit * 0.01;
      damageEnemy(game, enemy, 1, true);
    }
    near(enemy.hitSlowUntil, 0.99 + 0.35);
    update(game, 0.1);
    near(start - enemy.x, 7.5);
  });

  it('추가 타격 없이 0.35초가 지나면 원래 속도로 돌아온다', () => {
    const game = quiet();
    const enemy = target(game);
    const start = enemy.x;
    damageEnemy(game, enemy, 1, true);
    update(game, 0.36);
    near(start - enemy.x, 36);
  });

  it('장판·수건 둔화와 곱하지 않고 강한 효과만 쓰며 타격으로 기존 둔화를 연장하지 않는다', () => {
    const game = quiet();
    const enemy = target(game, { slowBy: 0.5, slowUntil: 1 });
    let start = enemy.x;
    damageEnemy(game, enemy, 1, true);
    update(game, 0.1);
    near(start - enemy.x, 5);
    game.time = 0.99;
    damageEnemy(game, enemy, 1, true);
    assert.equal(enemy.slowUntil, 1);
    start = enemy.x;
    update(game, 0.1);
    near(start - enemy.x, 7.5);
  });

  it('타격 둔화를 요청하지 않는 지속 피해는 둔화를 새로 만들지 않는다', () => {
    const game = quiet();
    const enemy = target(game);
    const start = enemy.x;
    damageEnemy(game, enemy, 1);
    update(game, 0.1);
    assert.equal(enemy.hitSlowUntil, undefined);
    near(start - enemy.x, 10);
  });

  it('고공속 독침 기관총을 계속 맞아도 적이 튕겨 나가지 않고 접근한다', () => {
    const game = quiet();
    applyBuild(game, { haste: 20, crit: 10 });
    game.weapons = { spray: 5, stapler: 5 };
    game.evolved = { spray: true, stapler: true };
    game.fusions = { poisongun: true };
    game.passives = { battery: 5, clover: 10 };
    game.relics = { mallet: true };
    const enemy = target(game, { hp: 1e9, maxHp: 1e9, speed: 80 });
    const start = enemy.x;
    for (let frame = 0; frame < 180; frame += 1) update(game, 1 / 60);
    assert.ok(enemy.hp < 1e9);
    assert.ok(start - enemy.x > 150);
    assert.equal(enemy.kx, 0);
    assert.equal(enemy.ky, 0);
    assert.ok(enemy.hitSlowUntil > game.time);
  });
});

describe('연타 기절·빙결의 무한 정지 방지', () => {
  function criticalGame() {
    const game = quiet();
    applyBuild(game, { crit: 20 });
    game.passives.clover = 10;
    game.random = () => 0;
    return game;
  }

  it('치명타를 계속 맞아도 첫 기절이 연장되지 않고 해제 뒤 1.2초간 움직인다', () => {
    const game = criticalGame();
    const enemy = target(game, { x: game.player.x + 700, hp: 1e9, maxHp: 1e9 });
    const start = enemy.x;
    damageEnemy(game, enemy, 10, true);
    near(enemy.chillUntil, 0.8);
    near(enemy.hitFreezeReadyAt, 2);
    for (let frame = 0; frame < 120; frame++) {
      damageEnemy(game, enemy, 10, true);
      update(game, 1 / 60);
      near(enemy.chillUntil, 0.8);
    }
    assert.ok(start - enemy.x >= 89);
    assert.equal(enemy.frozen, false);
    game.time = enemy.hitFreezeReadyAt;
    damageEnemy(game, enemy, 10, true);
    near(enemy.chillUntil, game.time + 0.8);
  });

  it('얼음틀과 치명 기절이 함께 발동하면 긴 쪽을 쓰고 회복 시간도 공유한다', () => {
    const game = criticalGame();
    game.relics.icetray = true;
    const enemy = target(game);
    damageEnemy(game, enemy, 10);
    near(enemy.chillUntil, 1.5);
    near(enemy.hitFreezeReadyAt, 2.7);
    game.time = 1.6;
    damageEnemy(game, enemy, 10);
    update(game, 0.1);
    assert.equal(enemy.frozen, false);
    near(enemy.chillUntil, 1.5);
    game.time = 2.7;
    damageEnemy(game, enemy, 10);
    near(enemy.chillUntil, 4.2);
  });

  it('얼음틀이 매 타격 발동해도 1.5초 뒤 풀리고 연타 중 접근한다', () => {
    const game = quiet();
    game.relics.icetray = true;
    game.random = () => 0;
    const enemy = target(game, { x: game.player.x + 700, hp: 1e9, maxHp: 1e9 });
    const start = enemy.x;
    for (let frame = 0; frame < 360; frame++) {
      damageEnemy(game, enemy, 10, true);
      update(game, 1 / 60);
    }
    assert.ok(start - enemy.x > 150);
  });

  it('고치명 메가 레이저에 계속 닿아도 빔 안에서 몬스터가 다시 움직인다', () => {
    const game = criticalGame();
    game.weapons = { laser: 5, fan: 5 };
    game.evolved = { laser: true, fan: true };
    game.fusions.spinlaser = true;
    const enemy = target(game, { x: game.player.x + 500, hp: 1e9, maxHp: 1e9 });
    const start = enemy.x;
    for (let frame = 0; frame < 222; frame++) update(game, 1 / 60);
    assert.ok(enemy.hp < enemy.maxHp);
    assert.ok(start - enemy.x > 130);
  });

  it('알람시계·얼음팩의 전체 빙결은 타격 면역 중에도 정상 작동한다', () => {
    const game = criticalGame();
    const enemy = target(game);
    damageEnemy(game, enemy, 10);
    game.time = 1;
    game.freezeUntil = 5;
    update(game, 0.1);
    assert.equal(enemy.frozen, true);
    game.time = 5;
    update(game, 0.1);
    assert.equal(enemy.frozen, false);
  });

  it('보스는 치명 기절과 얼음틀 빙결에 면역이다', () => {
    const game = criticalGame();
    game.relics.icetray = true;
    const enemy = target(game, { boss: true });
    const start = enemy.x;
    damageEnemy(game, enemy, 10, true);
    update(game, 0.1);
    assert.equal(enemy.chillUntil, undefined);
    assert.equal(enemy.hitFreezeReadyAt, undefined);
    near(start - enemy.x, 10);
  });
});

describe('지속 피해의 치명타와 타격 효과 분리', () => {
  const sources = {
    제습기: game => { game.weapons.dehumidifier = 5; game.evolved.dehumidifier = true; },
    드라이기: game => { game.weapons.dryer = 5; game.evolved.dryer = true; },
    장판: (game, enemy) => { game.puddles.push({ x: enemy.x, y: enemy.y, dps: 100, radius: 80, life: 10 }); },
    독: (game, enemy) => { game.fusions.poisongun = true; enemy.poisonUntil = 10; enemy.poisonDps = 100; },
    화상: (game, enemy) => { enemy.burnUntil = 10; enemy.burnDps = 100; },
    출혈: (game, enemy) => {
      game.weapons = { roller: 5, slipper: 5 };
      game.fusions.sawblade = true;
      enemy.x = game.player.x + 1000;
      enemy.bleedUntil = 10;
      enemy.bleedDps = 100;
    },
    '메가 레이저 지속 빔': game => {
      game.weapons = { laser: 5, fan: 5 };
      game.evolved = { laser: true, fan: true };
      game.fusions.spinlaser = true;
      game.megaLaser = { phase: 'fire', remaining: 3, x: game.player.x, y: game.player.y, angle: 0, width: 240, length: 1100 };
    },
  };
  for (const [name, configure] of Object.entries(sources)) {
    it(`${name}: 치명타 피해는 늘지만 기절·빙결·성냥을 발동하지 않는다`, () => {
      const sample = critical => {
        const game = quiet();
        applyBuild(game, { crit: 20 });
        game.passives.clover = 10;
        game.relics = { icetray: true, match: true };
        game.random = () => critical ? 0 : 0.99;
        const enemy = target(game, { x: game.player.x + 100, hp: 1e8, maxHp: 1e8 });
        configure(game, enemy);
        const start = enemy.x;
        for (let frame = 0; frame < 12; frame++) update(game, 1 / 60);
        assert.equal(enemy.chillUntil, undefined);
        assert.equal(enemy.hitFreezeReadyAt, undefined);
        assert.equal(enemy.frozen, false);
        assert.equal(enemy.burnUntil, name === '화상' ? 10 : undefined);
        assert.ok(start - enemy.x > 10);
        return { damage: enemy.maxHp - enemy.hp, critDamage: statsOf(game).critDamage };
      };
      const normal = sample(false), critical = sample(true);
      assert.ok(normal.damage > 0);
      assert.ok(Math.abs(critical.damage - normal.damage * critical.critDamage) < 0.0001);
    });
  }
});
