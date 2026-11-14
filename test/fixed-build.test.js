import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyBuild, choose, createGame, describeChoice, rollRelics, statsOf, update } from '../src/engine.js';
import { PASSIVES, RELICS, WEAPONS } from '../src/rules.js';

function quiet() {
  const game = createGame(() => 0.99);
  game.spawnCarry = -100000;
  game.weapons = {};
  return game;
}

function target(game, dx = 100) {
  const enemy = { id: game.nextId++, kind: 'roach', x: game.player.x + dx, y: game.player.y,
    hp: 10000, maxHp: 10000, radius: 10, speed: 0, damage: 0, xp: 1, timer: 0, kx: 0, ky: 0 };
  game.enemies.push(enemy);
  return enemy;
}

function shot(game, enemy, extra = {}) {
  game.shots.push({ x: enemy.x, y: enemy.y, vx: 0, vy: 0, damage: 10, life: 1,
    radius: 5, pierce: 0, hit: new Set(), ...extra });
}

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);

describe('공속 전용 고정 피해 보물', () => {
  it('공속 20점 이전과 보물 20점에서는 전용 보물이 나오지 않는다', () => {
    for (const build of [{ haste: 19 }, { crit: 20, haste: 10 }, { treasure: 20 }]) {
      const game = quiet();
      applyBuild(game, build);
      game.relics = Object.fromEntries(Object.keys(RELICS).filter((id) => !RELICS[id].hasteOnly).map((id) => [id, true]));
      assert.deepEqual(rollRelics(game), []);
    }
    const game = quiet();
    applyBuild(game, { haste: 20 });
    game.relics = Object.fromEntries(Object.keys(RELICS).filter((id) => !RELICS[id].hasteOnly).map((id) => [id, true]));
    assert.deepEqual(rollRelics(game).filter((choice) => choice.kind === 'relic').map((choice) => choice.id).sort(), ['lightgear', 'precision']);
  });

  it('치확 감소는 고무망치 전환 전에 적용하고 음수로 내려가지 않는다', () => {
    const game = quiet();
    game.relics = { precision: true, mallet: true };
    assert.equal(statsOf(game).flatDamage, 75);
    assert.equal(statsOf(game).critChance, 0);
    applyBuild(game, { haste: 20, crit: 10 });
    game.passives = { clover: 10 };
    // 60% + 4.8% - 20% = 44.8% -> 8 * 20 + 75.
    assert.equal(statsOf(game).flatDamage, 235);
    delete game.relics.mallet;
    near(statsOf(game).critChance, 0.448);
  });

  it('치확 감소는 보스 약점 포착까지 합산한 뒤 적용한다', () => {
    const game = quiet();
    applyBuild(game, { crit: 5 });
    game.relics = { precision: true };
    game.random = () => 0;
    const enemy = target(game);
    enemy.boss = true;
    shot(game, enemy);
    update(game, 1 / 60);
    // 2.2% + 보스 10% - 20%는 0%이므로 치명타가 나오지 않는다.
    near(10000 - enemy.hp, 10 + 75);
  });

  it('경량 기어는 최종 공격력 배율을 줄이고 고정 피해는 줄이지 않는다', () => {
    const game = quiet();
    game.passives = { protein: 10 };
    game.relics = { lightgear: true };
    game.weapons = { broom: 1 };
    const enemy = target(game, 50);
    update(game, 1 / 60);
    near(statsOf(game).might, 1.5);
    near(10000 - enemy.hp, WEAPONS.broom.damage[0] * 1.5 + 45);
    assert.ok(describeChoice(game, { kind: 'weapon', id: 'broom', level: 1 }).includes('피해 75'));
  });

  it('두 보물의 추가 피해는 타격당 한 번 더하고 치명타로 늘리지 않는다', () => {
    const game = quiet();
    game.relics = { precision: true, lightgear: true };
    game.passives = { clover: 10, hotsauce: 5, protein: 10 };
    const enemy = target(game);
    game.random = () => 0;
    shot(game, enemy);
    update(game, 1 / 60);
    near(10000 - enemy.hp, 10 * 2.75 + 120);
    assert.equal(statsOf(game).flatDamage, 120);
  });

  it('독침 기관총의 다섯 발은 각각 고정 피해를 한 번 받는다', () => {
    const game = quiet();
    game.relics = { lightgear: true };
    game.weapons = { spray: 5, stapler: 5 };
    game.evolved = { spray: true, stapler: true };
    game.fusions = { poisongun: true };
    game.random = () => 0.5;
    const enemy = target(game, 60);
    enemy.radius = 30;
    update(game, 1 / 60);
    game.weapons = {};
    for (let frame = 0; frame < 30; frame += 1) update(game, 1 / 60);
    // Compare with the same attacks without the flat bonus; poison must not add it every frame.
    const plain = quiet();
    plain.weapons = { spray: 5, stapler: 5 };
    plain.evolved = { spray: true, stapler: true };
    plain.fusions = { poisongun: true };
    plain.passives = {};
    plain.random = () => 0.5;
    const other = target(plain, 60);
    other.radius = 30;
    update(plain, 1 / 60);
    plain.weapons = {};
    for (let frame = 0; frame < 30; frame += 1) update(plain, 1 / 60);
    near(10000 - enemy.hp, (10000 - other.hp) * 0.75 + 5 * 45);
  });

  it('지속 피해에는 추가 피해를 붙이지 않고 프레임 간격에도 영향을 받지 않는다', () => {
    for (const frames of [60, 120]) {
      const game = quiet();
      game.relics = { precision: true, lightgear: true };
      game.weapons = { dehumidifier: 1 };
      const enemy = target(game, 60);
      for (let frame = 0; frame < frames; frame += 1) update(game, 1 / frames);
      near(10000 - enemy.hp, WEAPONS.dehumidifier.dps[0] * 0.75);
    }
  });

  it('공격 보물의 얼음 조각에는 추가 고정 피해를 붙이지 않는다', () => {
    const game = quiet();
    game.relics = { precision: true, lightgear: true };
    const enemy = target(game);
    shot(game, enemy, { kind: 'ice' });
    update(game, 1 / 60);
    near(10000 - enemy.hp, 10);
  });

  it('보물을 교체하면 치확과 공격력 감소도 즉시 해제한다', () => {
    const game = quiet();
    game.passives = { clover: 10 };
    game.relics = { precision: true, lightgear: true, magnet: true };
    game.swapIn = 'dice';
    game.pendingRelics = 1;
    game.choices = [{ kind: 'relic-swap', id: 'precision' }];
    choose(game, 0);
    near(statsOf(game).critChance, 0.65);
    assert.equal(statsOf(game).flatDamage, 45);
    game.swapIn = 'neko';
    game.pendingRelics = 1;
    game.choices = [{ kind: 'relic-swap', id: 'lightgear' }];
    choose(game, 0);
    near(statsOf(game).might, 1);
    assert.equal(statsOf(game).flatDamage, 0);
  });
});

describe('네잎클로버 상향', () => {
  it('레벨마다 6%p씩 올라 10레벨에서 치확 60%가 된다', () => {
    const game = quiet();
    for (let level = 1; level <= 10; level += 1) {
      game.passives = { clover: level };
      near(statsOf(game).critChance, level * 0.06);
    }
    assert.equal(PASSIVES.clover.critChance.at(-1), 0.6);
    assert.deepEqual(describeChoice(game, { kind: 'passive', id: 'clover', level: 10 }), ['치명타 확률 +54% → +60%']);
  });
});
