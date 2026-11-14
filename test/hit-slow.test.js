import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyBuild, createGame, damageEnemy, update } from '../src/engine.js';

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
