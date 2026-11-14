import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyBuild, choose, createGame, describeChoice, passiveLines, rollChoices, rollRelics, statsOf, update } from '../src/engine.js';
import { PASSIVES, RELICS, WEAPONS, passiveMaxLevel } from '../src/rules.js';

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

describe('공속 전용 고정 피해 패시브', () => {
  it('공속 20점부터 레벨업 선택지에 나오고 보물 상자에서는 나오지 않는다', () => {
    assert.equal(RELICS.precision, undefined);
    assert.equal(RELICS.lightgear, undefined);
    assert.equal(RELICS.counterweight, undefined);
    for (const build of [{ haste: 19 }, { crit: 20, haste: 10 }, { treasure: 20 }, { haste: 20 }]) {
      const game = quiet();
      applyBuild(game, build);
      // Other items are already complete, leaving the two new passives in the pool.
      game.weapons = Object.fromEntries(Object.keys(WEAPONS).map((id) => [id, 5]));
      game.evolved = Object.fromEntries(Object.keys(WEAPONS).map((id) => [id, true]));
      game.fusions = { shockshower: true, bomber: true };
      game.passives = Object.fromEntries(Object.keys(PASSIVES).filter((id) => !PASSIVES[id].hasteOnly).map((id) => [id, passiveMaxLevel(id)]));
      const offered = rollChoices(game).filter((choice) => ['precision', 'lightgear', 'counterweight'].includes(choice.id));
      assert.deepEqual(offered.map((choice) => choice.id).sort(), build.haste === 20 ? ['counterweight', 'lightgear', 'precision'] : []);
      assert.ok(offered.every((choice) => choice.kind === 'passive' && choice.level === 1));
      assert.ok(rollRelics(game).every((choice) => !['precision', 'lightgear', 'counterweight'].includes(choice.id)));
      game.passives.precision = 5;
      game.passives.lightgear = 5;
      game.passives.counterweight = 5;
      assert.ok(rollChoices(game).every((choice) => !['precision', 'lightgear', 'counterweight'].includes(choice.id)));
    }
  });

  it('치확 감소는 고무망치 전환 전에 적용하고 음수로 내려가지 않는다', () => {
    const game = quiet();
    game.relics = { mallet: true };
    game.passives = { precision: 5 };
    assert.equal(statsOf(game).flatDamage, 60);
    assert.equal(statsOf(game).critChance, 0);
    applyBuild(game, { haste: 20, crit: 10 });
    game.passives = { ...game.passives, clover: 10 };
    // 60% + 4.8% - 20% = 44.8% -> 8 * 20 + 60.
    assert.equal(statsOf(game).flatDamage, 220);
    delete game.relics.mallet;
    near(statsOf(game).critChance, 0.448);
  });

  it('치확 감소는 보스 약점 포착까지 합산한 뒤 적용한다', () => {
    const game = quiet();
    applyBuild(game, { crit: 5 });
    game.passives = { ...game.passives, precision: 5 };
    game.random = () => 0;
    const enemy = target(game);
    enemy.boss = true;
    shot(game, enemy);
    update(game, 1 / 60);
    // 2.2% + 보스 10% - 20%는 0%이므로 치명타가 나오지 않는다.
    near(10000 - enemy.hp, 10 + 60);
  });

  it('경량 기어는 무기 기본 피해만 줄이고 공격력과 고정 피해는 유지한다', () => {
    const game = quiet();
    game.passives = { protein: 10 };
    game.passives = { ...game.passives, lightgear: 5 };
    game.weapons = { broom: 1 };
    const enemy = target(game, 50);
    update(game, 1 / 60);
    near(statsOf(game).might, 2);
    near(statsOf(game).weaponDamageScale, 0.25);
    near(10000 - enemy.hp, WEAPONS.broom.damage[0] * 2 * 0.25 + 30);
    assert.ok(describeChoice(game, { kind: 'weapon', id: 'broom', level: 1 }).includes('피해 40'));
  });

  it('두 패시브의 추가 피해는 타격당 한 번 더하고 치명타로 늘리지 않는다', () => {
    const game = quiet();
    game.passives = { ...game.passives, precision: 5, lightgear: 5 };
    game.passives = { ...game.passives, clover: 10, hotsauce: 5, protein: 10 };
    const enemy = target(game);
    game.random = () => 0;
    shot(game, enemy);
    update(game, 1 / 60);
    near(10000 - enemy.hp, 10 * 2.75 + 90);
    assert.equal(statsOf(game).flatDamage, 90);
  });

  it('독침 기관총의 다섯 발은 각각 고정 피해를 한 번 받는다', () => {
    const game = quiet();
    game.passives = { ...game.passives, lightgear: 5 };
    game.weapons = { spray: 5, stapler: 5 };
    game.evolved = { spray: true, stapler: true };
    game.fusions = { poisongun: true };
    game.random = () => 0.5;
    const enemy = target(game, 60);
    enemy.radius = 30;
    update(game, 1 / 60);
    game.weapons = {};
    game.shots.forEach((shot) => { shot.pierce = 0; });
    for (let frame = 0; frame < 60; frame += 1) update(game, 1 / 60);
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
    plain.shots.forEach((shot) => { shot.pierce = 0; });
    for (let frame = 0; frame < 60; frame += 1) update(plain, 1 / 60);
    near(10000 - enemy.hp, (10000 - other.hp) * 0.25 + 5 * 30);
  });

  it('지속 피해에는 추가 피해를 붙이지 않고 프레임 간격에도 영향을 받지 않는다', () => {
    for (const frames of [60, 120]) {
      const game = quiet();
      game.passives = { protein: 10, precision: 5, lightgear: 5, counterweight: 5 };
      game.weapons = { dehumidifier: 1 };
      const enemy = target(game, 60);
      for (let frame = 0; frame < frames; frame += 1) update(game, 1 / frames);
      near(10000 - enemy.hp, WEAPONS.dehumidifier.dps[0] * 2 * 0.25 * 0.25);
    }
  });

  it('공격 보물의 얼음 조각에는 추가 고정 피해를 붙이지 않는다', () => {
    const game = quiet();
    game.passives = { ...game.passives, precision: 5, lightgear: 5 };
    const enemy = target(game);
    shot(game, enemy, { kind: 'ice' });
    update(game, 1 / 60);
    near(10000 - enemy.hp, 10);
  });

  it('레벨업으로 5레벨까지 강화해도 보물 세 칸은 그대로 유지한다', () => {
    const game = quiet();
    applyBuild(game, { haste: 20 });
    game.passives = { clover: 10, protein: 10 };
    game.relics = { mallet: true, dice: true, neko: true };
    const relics = { ...game.relics };
    for (let level = 1; level <= 5; level += 1) {
      for (const id of ['precision', 'lightgear', 'counterweight']) {
        game.pendingLevels = 1;
        game.choices = [{ kind: 'passive', id, level, label: PASSIVES[id].label }];
        choose(game, 0);
        assert.equal(game.passives[id], level);
        assert.deepEqual(game.relics, relics);
        assert.equal(game.pendingRelics, 0);
      }
      near(statsOf(game).might, 2 * (1 - level * 0.15));
      near(statsOf(game).weaponDamageScale, 1 - level * 0.15);
      assert.equal(passiveMaxLevel('precision'), 5);
      assert.equal(passiveMaxLevel('lightgear'), 5);
    }
    near(statsOf(game).might, 0.5);
    near(statsOf(game).weaponDamageScale, 0.25);
    assert.equal(statsOf(game).flatDamage, 355);
  });

  it('레벨업 카드와 도감에는 각 레벨의 이익과 불이익을 함께 표시한다', () => {
    const game = quiet();
    assert.deepEqual(passiveLines('precision', 1), ['치명타 확률 감소 4%p', '타격당 고정 피해 +12']);
    assert.deepEqual(passiveLines('lightgear', 5), ['무기 기본 피해 -75%', '타격당 고정 피해 +30']);
    game.passives = { precision: 1, lightgear: 1 };
    assert.deepEqual(describeChoice(game, { kind: 'passive', id: 'precision', level: 2 }), ['치명타 확률 감소 4%p → 8%p', '타격당 고정 피해 +12 → +24']);
    assert.deepEqual(describeChoice(game, { kind: 'passive', id: 'lightgear', level: 2 }), ['무기 기본 피해 -15% → -30%', '타격당 고정 피해 +6 → +12']);
  });

  it('균형추는 현재 공격력과 이동·저체력 버프가 바뀔 때 감소량도 다시 계산한다', () => {
    const game = quiet();
    game.passives = { protein: 10, counterweight: 5 };
    near(statsOf(game).might, 0.5);
    game.relics = { energy: true, lastcup: true };
    game.player.moving = true;
    near(statsOf(game).might, 0.575);
    game.player.hp = 20;
    near(statsOf(game).might, 0.725);
    game.player.moving = false;
    near(statsOf(game).might, 0.65);
    game.player.hp = 100;
    game.passives.counterweight = 1;
    assert.deepEqual(describeChoice(game, { kind: 'passive', id: 'counterweight', level: 2 }), ['공격력 +70% → +40%', '타격당 고정 피해 +9 → +18']);
  });

  it('두 감소 패시브가 최대여도 고무망치와 패시브 고정 피해는 그대로 더한다', () => {
    const game = quiet();
    applyBuild(game, { haste: 20, crit: 10 });
    game.passives = { protein: 10, clover: 10, lightgear: 5, counterweight: 5 };
    game.relics = { mallet: true, dice: true, neko: true };
    game.weapons = { broom: 1 };
    const enemy = target(game, 50);
    update(game, 1 / 60);
    assert.equal(statsOf(game).flatDamage, 375);
    near(10000 - enemy.hp, WEAPONS.broom.damage[0] * 2 * 0.25 * 0.25 + 300 + 30 + 45);
  });

  it('보물 피해에는 균형추의 공격력 감소만 적용하고 경량 기어 감소는 적용하지 않는다', () => {
    const game = quiet();
    game.passives = { protein: 10, lightgear: 5, counterweight: 5 };
    game.relics = { firecracker: true };
    game.fireIn = 0;
    const enemy = target(game);
    update(game, 1 / 60);
    near(10000 - enemy.hp, RELICS.firecracker.damage * 2 * 0.25);
  });

});

describe('독침 기관총 전방 발사', () => {
  it('독침 기관총만 전 레벨에서 기본 발사 주기가 1.25배가 되고 공속 보너스와 함께 적용된다', () => {
    for (const build of [{}, { haste: 20 }]) {
      for (let level = 1; level <= 5; level += 1) {
        const cooldowns = [];
        for (const fused of [false, true]) {
          const game = quiet();
          applyBuild(game, build);
          game.time = 6;
          game.passives = { battery: 5 };
          game.relics = { stopwatch: true };
          game.weapons = { stapler: level, spray: level };
          if (fused) game.fusions = { poisongun: true };
          update(game, 1 / 60);
          cooldowns.push(game.cooldowns.stapler);
        }
        near(cooldowns[1], cooldowns[0] * 1.25);
      }
    }
  });

  it('탄속은 유지하고 비행 시간과 최대 이동 거리만 일반 스테이플러의 두 배로 늘린다', () => {
    const distances = [];
    for (const fused of [false, true]) {
      const game = quiet();
      game.weapons = { stapler: 5, spray: 5 };
      if (fused) game.fusions = { poisongun: true };
      update(game, 1 / 60);
      const staple = game.shots.find((shot) => shot.kind === 'staple');
      near(Math.hypot(staple.vx, staple.vy), WEAPONS.stapler.speed);
      near(staple.life + 1 / 60, WEAPONS.stapler.lifeSec * (fused ? 2 : 1));
      distances.push((staple.life + 1 / 60) * staple.speed);
    }
    near(distances[1], distances[0] * 2);
  });

  it('바라보는 방향을 중심으로 유도 독침 다섯 발을 앞쪽에 펼쳐 발사한다', () => {
    for (const heading of [0, 0.8, Math.PI]) {
      const game = quiet();
      game.player.heading = heading;
      game.random = () => 0.5;
      game.weapons = { spray: 5, stapler: 5 };
      game.evolved = { spray: true, stapler: true };
      game.fusions = { poisongun: true };
      update(game, 1 / 60);
      assert.equal(game.shots.length, 5);
      assert.ok(game.shots.every((shot) => shot.kind === 'staple' && shot.homing > 0 && shot.poison > 0));
      for (let index = 0; index < game.shots.length; index += 1) {
        const angle = Math.atan2(game.shots[index].vy, game.shots[index].vx);
        const offset = Math.atan2(Math.sin(angle - heading), Math.cos(angle - heading));
        near(offset, (index - 2) * 0.2);
        assert.ok(Math.cos(offset) > 0);
      }
    }
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
