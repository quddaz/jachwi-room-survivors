import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createGame, damageEnemy, update } from '../src/engine.js';
import { ELEMENT_EFFECTS, ELEMENT_REACTIONS } from '../src/rules.js';

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
      assert.ok(enemy.elementColdUntil > game.time);
      const before = enemy.x;
      update(game, 1 / 60);
      near(before - enemy.x, enemy.speed * factor / 60);
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
      const expected = dealt * ELEMENT_EFFECTS.lightning.chain * (wet ? 1 + ELEMENT_REACTIONS.conductivity.damageBonus : 1);
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

describe('속성 조합', () => {
  it('물과 냉기는 적중 순서와 관계없이 같은 서리 둔화를 적용한다', () => {
    for (const elements of [['water', 'ice'], ['ice', 'water']]) {
      const game = quiet();
      const enemy = target(game);
      for (const element of elements) hit(game, enemy, [element]);
      const before = enemy.x;
      update(game, 1 / 60);
      near(before - enemy.x, enemy.speed * ELEMENT_REACTIONS.frost.slow / 60);
    }
  });

  it('화염은 냉기만 녹이고, 반대로 냉기 타격은 화상 잔여 시간을 줄인다', () => {
    const game = quiet();
    const enemy = target(game, { slowBy: 0.7, slowUntil: 5 });
    hit(game, enemy, ['ice']);
    hit(game, enemy, ['fire']);
    assert.equal(enemy.elementColdUntil, game.time);
    assert.equal(enemy.slowUntil, 5);
    const burn = enemy.burnUntil - game.time;
    hit(game, enemy, ['ice']);
    near(enemy.burnUntil - game.time, burn * ELEMENT_REACTIONS.thaw.burnTimeScale);
  });

  it('화상과 중독의 두 피해를 올리며 물로 화상을 끄면 독 보너스도 사라진다', () => {
    const game = quiet();
    const enemy = target(game);
    hit(game, enemy, ['fire']);
    hit(game, enemy, ['poison']);
    const before = enemy.hp;
    update(game, 1 / 60);
    near(before - enemy.hp, (enemy.burnDps + enemy.poisonDps) * (1 + ELEMENT_REACTIONS.fumes.damageBonus) / 60);
    hit(game, enemy, ['water']);
    const wetHp = enemy.hp;
    update(game, 1 / 60);
    near(wetHp - enemy.hp, enemy.poisonDps / 60);
  });

  it('화상 중인 적을 번개로 맞히면 주변에 폭발 피해와 화상이 퍼진다', () => {
    const game = quiet();
    const source = target(game);
    const dry = target(game, { x: source.x + 40 });
    const wet = target(game, { x: source.x + 60, wetUntil: 3 });
    const far = target(game, { x: source.x + 400 });
    hit(game, source, ['lightning']);
    assert.equal(dry.hp, dry.maxHp);
    hit(game, source, ['fire']);
    hit(game, source, ['lightning']);
    const { damage, burn, burnSec } = ELEMENT_REACTIONS.overload;
    near(dry.maxHp - dry.hp, 100 * damage);
    near(dry.burnDps, 100 * burn);
    near(dry.burnUntil, game.time + burnSec);
    near(wet.maxHp - wet.hp, 100 * damage);
    assert.equal(wet.burnUntil, undefined);
    assert.equal(far.hp, far.maxHp);
    hit(game, source, ['lightning']);
    near(dry.maxHp - dry.hp, 100 * damage);
  });

  it('젖으면 감전 확률이 높아지고 독과 젖음의 전이 피해 보너스를 합산한다', () => {
    const game = quiet(() => 0.4);
    const enemy = target(game);
    const adjacent = target(game, { x: enemy.x + 40 });
    hit(game, enemy, ['poison']);
    hit(game, enemy, ['lightning']);
    assert.equal(adjacent.hp, adjacent.maxHp);
    hit(game, enemy, ['water']);
    hit(game, enemy, ['lightning']);
    const bonus = ELEMENT_REACTIONS.conductivity.damageBonus + ELEMENT_REACTIONS.ionize.damageBonus;
    near(adjacent.maxHp - adjacent.hp, 100 * ELEMENT_EFFECTS.lightning.chain * (1 + bonus));
  });
});

describe('치명 폭발과 속성', () => {
  it('치명 폭발은 맞힌 무기의 속성 효과를 주변 적에게 퍼뜨리지 않는다', async () => {
    const { applyBuild } = await import('../src/engine.js');
    const game = quiet(() => 0);
    applyBuild(game, { crit: 20 });
    const source = target(game, { hp: 1, maxHp: 1 });
    const adjacent = target(game, { x: source.x + 40 });
    game.gridFresh = false;
    hit(game, source, ['fire']);
    assert.ok(adjacent.hp < adjacent.maxHp);
    assert.equal(adjacent.burnUntil, undefined);
  });
});

describe('속성 지속 피해와 치명타', () => {
  it('속성으로 붙은 화상·중독은 치명타와 치명 폭발을 일으키지 않는다', async () => {
    const { applyBuild } = await import('../src/engine.js');
    for (const element of ['fire', 'poison']) {
      const game = quiet(() => 0.99);
      applyBuild(game, { crit: 20 });
      const source = target(game, { speed: 0 });
      const adjacent = target(game, { x: source.x + 40, speed: 0 });
      hit(game, source, [element]);
      const before = adjacent.hp;
      game.random = () => 0;
      for (let frame = 0; frame < 30; frame += 1) update(game, 1 / 60);
      assert.equal(adjacent.hp, before);
      assert.ok(!game.effects.some(effect => effect.type === 'number' && effect.crit));
    }
  });
});
