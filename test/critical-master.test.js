import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyBuild, createGame, damageEnemy, statsOf, update } from '../src/engine.js';

function quiet(points = 20) {
  const game = createGame(() => 0);
  applyBuild(game, { crit: points });
  game.weapons = {};
  game.spawnCarry = -1e6;
  game.nextBossAt = game.nextSwarmAt = game.nextXp = Infinity;
  return game;
}
function target(game, dx = 0, hp = 1e6) {
  const enemy = { id: game.nextId++, kind: 'roach', x: game.player.x + 300 + dx, y: game.player.y,
    hp, maxHp: hp, radius: 10, speed: 0, damage: 0, xp: 1, timer: 0, kx: 0, ky: 0 };
  game.enemies.push(enemy);
  return enemy;
}
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);

describe('급소 마스터 적중 폭발', () => {
  it('살아 있는 적에게도 매 치명타마다 피해의 30%를 주변에 주고 원래 적을 다시 때리지 않는다', () => {
    const game = quiet(), source = target(game), adjacent = target(game, 60), outside = target(game, 220);
    const damage = 100 * statsOf(game).critDamage;
    damageEnemy(game, source, 100);
    damageEnemy(game, source, 100);
    near(source.maxHp - source.hp, damage * 2);
    near(adjacent.maxHp - adjacent.hp, damage * 0.3 * 2);
    near(outside.hp, outside.maxHp);
    assert.equal(source.dead, undefined);
    assert.equal(adjacent.chillUntil, undefined);
  });
  it('폭발은 치명타·고정 피해·성냥·얼음틀을 다시 발동하지 않는다', () => {
    const game = quiet();
    game.passives = { clover: 10, precision: 5 };
    game.relics = { icetray: true, match: true, resonator: true };
    const source = target(game), adjacent = target(game, 60);
    damageEnemy(game, source, 100, false, game.player, 60);
    near(adjacent.maxHp - adjacent.hp, (100 * statsOf(game).critDamage + 60) * 0.3);
    assert.ok(source.burnUntil > 0);
    for (const key of ['burnUntil', 'chillUntil', 'resonatorHits']) assert.equal(adjacent[key], undefined);
  });
  it('폭발로 적을 처치해도 옆 적을 타고 재귀 폭발하지 않는다', () => {
    const game = quiet(), source = target(game), adjacent = target(game, 60, 1), next = target(game, 140);
    damageEnemy(game, source, 100);
    assert.ok(adjacent.dead);
    near(next.hp, next.maxHp);
    near(source.maxHp - source.hp, 100 * statsOf(game).critDamage);
  });
  it('일반 타격이나 치명 19점의 비처치 치명타는 적중 폭발을 일으키지 않는다', () => {
    for (const points of [19, 20]) {
      const game = quiet(points), source = target(game), adjacent = target(game, 60);
      if (points === 20) game.random = () => 0.99;
      damageEnemy(game, source, 100);
      near(adjacent.hp, adjacent.maxHp);
    }
  });
  it('치명 처치 시 기존 10점 처치 폭발과 20점 적중 폭발이 각각 한 번 적용된다', () => {
    const game = quiet(), source = target(game, 0, 1), adjacent = target(game, 60);
    const multiplier = statsOf(game).critDamage;
    damageEnemy(game, source, 100);
    near(adjacent.maxHp - adjacent.hp, 100 * multiplier * (0.4 * multiplier + 0.3));
  });
  it('지속 피해의 치명타도 폭발하지만 광역 기절을 만들지 않는다', () => {
    const game = quiet(), source = target(game), adjacent = target(game, 70);
    game.puddles.push({ x: source.x, y: source.y, dps: 100, radius: 20, life: 10 });
    update(game, 0.1);
    near(source.maxHp - source.hp, 10 * statsOf(game).critDamage);
    near(adjacent.maxHp - adjacent.hp, 10 * statsOf(game).critDamage * 0.3);
    assert.equal(source.chillUntil, undefined);
    assert.equal(adjacent.chillUntil, undefined);
  });
  it('고공속에도 피해는 전부 적용하고 같은 적의 겹치는 연출만 묶는다', () => {
    const game = quiet(), source = target(game), adjacent = target(game, 60);
    for (let n = 0; n < 100; n++) damageEnemy(game, source, 1);
    near(adjacent.maxHp - adjacent.hp, 100 * statsOf(game).critDamage * 0.3);
    assert.equal(game.effects.filter(e => e.type === 'ring' && e.sound === 'impact').length, 1);
    game.time = 0.11;
    damageEnemy(game, source, 1);
    assert.equal(game.effects.filter(e => e.type === 'ring' && e.sound === 'impact').length, 2);
  });
});
