import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createGame, damageEnemy, update } from '../src/engine.js';
import { ELEMENT_EFFECTS } from '../src/rules.js';

function quiet(random = () => 0.99) {
  const game = createGame(random);
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

function hit(game, enemy, elements, amount = 100) {
  game.hitElement = elements;
  damageEnemy(game, enemy, amount);
  game.hitElement = null;
}

const near = (actual, expected, gap = 1e-6) => assert.ok(Math.abs(actual - expected) < gap, `${actual} != ${expected}`);

describe('속성 효과', () => {
  it('화염 타격은 화상을 남겨 맞은 피해의 25%를 초당 더 입힌다', () => {
    const game = quiet();
    const enemy = target(game);
    hit(game, enemy, ['fire']);
    near(enemy.burnDps, 100 * ELEMENT_EFFECTS.fire.burn);
    const hp = enemy.hp;
    for (let frame = 0; frame < 60; frame += 1) update(game, 1 / 60);
    near(hp - enemy.hp, 25, 0.6);
  });

  it('독 타격은 최대 5중첩까지 쌓이고 중첩마다 초당 피해가 늘어난다', () => {
    const game = quiet();
    const enemy = target(game);
    for (let count = 0; count < 7; count += 1) hit(game, enemy, ['poison']);
    assert.equal(enemy.poisonStacks, ELEMENT_EFFECTS.poison.maxStacks);
    near(enemy.poisonDps, 100 * ELEMENT_EFFECTS.poison.poison * 5);
  });

  it('냉기 타격은 일반 적을 40%, 보스를 15% 느리게 한다', () => {
    for (const [extra, factor] of [[{}, 0.6], [{ boss: true }, 0.85]]) {
      const game = quiet();
      const enemy = target(game, extra);
      hit(game, enemy, ['ice']);
      near(enemy.slowBy, factor);
      assert.ok(enemy.slowUntil > game.time);
    }
  });

  it('물은 적을 적셔 화상을 끄고 적신 동안 불이 붙지 않는다', () => {
    const game = quiet();
    const enemy = target(game);
    hit(game, enemy, ['fire']);
    hit(game, enemy, ['water']);
    assert.ok(enemy.burnUntil <= game.time);
    assert.ok(enemy.wetUntil > game.time);
    hit(game, enemy, ['fire']);
    assert.ok(enemy.burnUntil <= game.time);
  });

  it('번개는 근처 적에게 전이하고 젖은 적에게서는 두 명에게 더 세게 튄다', () => {
    for (const wet of [false, true]) {
      const game = quiet(() => 0);
      const enemy = target(game);
      const others = [target(game, { x: enemy.x + 40 }), target(game, { x: enemy.x + 60 })];
      if (wet) enemy.wetUntil = game.time + 5;
      game.gridFresh = false;
      hit(game, enemy, ['lightning']);
      const lost = others.map(other => other.maxHp - other.hp);
      const dealt = enemy.maxHp - enemy.hp;
      const expected = dealt * ELEMENT_EFFECTS.lightning.chain * (wet ? 1 + ELEMENT_EFFECTS.lightning.wetBonus : 1);
      near(lost[0], expected);
      near(lost[1], wet ? expected : 0);
    }
  });

  it('지속 피해에서는 화상·중독을 걸지 않는다', () => {
    const game = quiet();
    game.weapons = { dehumidifier: 5 };
    const enemy = target(game, { x: game.player.x + 20, speed: 0 });
    for (let frame = 0; frame < 30; frame += 1) update(game, 1 / 60);
    assert.ok(!(enemy.burnUntil > game.time));
  });
});
