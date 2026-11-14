import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyBuild, choose, createGame, describeChoice, rollChoices, statsOf, update } from '../src/engine.js';
import { MAX_WEAPONS } from '../src/rules.js';
const DT = 1 / 60;
function quiet(weapons = {}) {
  const game = createGame(() => 0.99);
  game.weapons = weapons;
  game.spawnCarry = -1e6;
  game.nextBossAt = game.nextSwarmAt = game.nextXp = Infinity;
  return game;
}
function target(game, dx = 100, dy = 0) {
  const enemy = { id: game.nextId++, kind: 'roach', x: game.player.x + dx, y: game.player.y + dy,
    hp: 1e8, maxHp: 1e8, radius: 8, speed: 0, damage: 0, xp: 1, timer: 0, kx: 0, ky: 0 };
  game.enemies.push(enemy);
  return enemy;
}
function run(game, frames) { for (let n = 0; n < frames; n++) update(game, DT); }
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-5, `${actual} != ${expected}`);

describe('마린 수류탄', () => {
  it('총을 계속 쏘면서 별도 주기로 수류탄을 던진다', () => {
    const game = quiet({ robot: 5 });game.evolved.robot = true;
    target(game, 300);update(game, DT);
    assert.equal(game.shots.filter(shot => shot.kind === 'marine').length, 6);
    assert.equal(game.shots.filter(shot => shot.kind === 'grenade').length, 0);
    run(game, 90);
    const grenades = game.shots.filter(shot => shot.kind === 'grenade');
    assert.ok(grenades.length > 0);
    assert.equal(new Set(grenades.map(shot => shot.owner)).size, grenades.length);
    assert.ok(game.shots.some(shot => shot.kind === 'marine'));
  });
  it('착탄 지점을 고정하고 비행·신관 시간이 지난 뒤 주변에 한 번만 피해를 준다', () => {
    const game = quiet(), moved = target(game, 100), side = target(game, 150), outside = target(game, 300);
    game.passives.precision = 1;
    game.shots.push({ weapon: 'robot', kind: 'grenade', owner: 50, x: game.player.x, y: game.player.y,
      fromX: game.player.x, fromY: game.player.y, toX: moved.x, toY: moved.y, age: 0,
      flightSec: 0.65, life: 0.85, arcHeight: 52, blast: 90, damage: 84 });
    run(game, 30);
    near(side.hp, side.maxHp);
    moved.x += 300;
    run(game, 24);
    near(side.maxHp - side.hp, 96);
    near(moved.hp, moved.maxHp);
    near(outside.hp, outside.maxHp);
    near(game.player.hp, statsOf(game).maxHp);
    assert.equal(game.shots.length, 0);
    assert.ok(game.effects.some(effect => effect.type === 'bomb'));
    run(game, 20);
    near(side.maxHp - side.hp, 96);
  });
  it('소독 강습대의 수류탄은 착탄 지점에 소독 장판을 남긴다', () => {
    const game = quiet({ robot: 5, bleach: 5 });game.evolved = { robot: true, bleach: true };game.fusions.bleachbot = true;
    target(game, 300);run(game, 60);
    const grenade = game.shots.find(shot => shot.kind === 'grenade');
    assert.ok(grenade?.acid);
    // 총알 장판과 구별하도록 투척된 수류탄만 남긴다.
    game.weapons = {};game.shots = [grenade];game.puddles = [];
    run(game, 54);
    assert.ok(game.puddles.some(puddle => Math.abs(puddle.x - grenade.toX) < 1 && Math.abs(puddle.y - grenade.toY) < 1));
  });
});

describe('소환 수에 따라 길어지는 용', () => {
  it('증원은 머리를 늘리지 않고 기존 용의 꼬리에 마디를 붙인다', () => {
    const game = quiet({ toydragon: 1 });update(game, DT);
    const head = game.summons[0];assert.equal(head.spine.length, 6);
    applyBuild(game, { summon: 20 });game.passives.summonwhistle = 3;update(game, DT);
    assert.equal(game.summons.length, 1);
    assert.equal(game.summons[0], head);
    assert.equal(head.spine.length, 12);
    game.weapons.toydragon = 5;game.evolved.toydragon = true;update(game, DT);
    assert.equal(head.spine.length, 18);
    run(game, 600);
    assert.equal(game.summons.length, 1);
    assert.ok([head, ...head.spine].every(part => Number.isFinite(part.x) && Number.isFinite(part.y)));
  });
  it('몸통 여러 마디가 겹쳐도 같은 적은 주기당 한 번 맞고 고정 피해도 한 번만 더한다', () => {
    const game = quiet({ toydragon: 1 });game.passives.precision = 1;
    const enemy = target(game, -60);update(game, DT);
    near(enemy.maxHp - enemy.hp, 18 + 12);
    run(game, 10);
    near(enemy.maxHp - enemy.hp, 30);
  });
  it('길이 카드와 완성형을 제공하고 무기를 바꾸면 머리·몸통을 함께 정리한다', () => {
    const game = quiet({ toydragon: 1 });update(game, DT);
    assert.ok(describeChoice(game, { kind: 'weapon', id: 'toydragon', level: 1 }).some(line => line === '몸통 마디 6'));
    game.weapons.toydragon = 5;
    const evolved = rollChoices(game).find(choice => choice.id === 'toydragon');assert.equal(evolved.kind, 'evolve');
    game.weapons = { toydragon: 5, ...Object.fromEntries(['spray','broom','bleach','zapper','fan','laser','robot'].map(id => [id,1])) };
    assert.equal(Object.keys(game.weapons).length, MAX_WEAPONS);
    game.pendingLevels = 1;game.choices = [{ kind: 'weapon', id: 'coil', level: 1 }];
    choose(game, 0);
    choose(game, game.choices.findIndex(choice => choice.id === 'toydragon'));
    update(game, DT);
    assert.ok(!game.summons.some(unit => unit.weapon === 'toydragon'));
  });
  it('모든 소환 무기와 증원을 갖춰도 용의 머리는 하나만 추가한다', () => {
    const ids = ['robot','sockpuppet','toydrone','windcar','plantspirit','toyknight','toydragon'];
    const game = quiet(Object.fromEntries(ids.map(id => [id,5])));
    game.evolved = Object.fromEntries(ids.map(id => [id,true]));applyBuild(game, { summon:20 });game.passives.summonwhistle = 3;
    target(game, 250);run(game, 180);
    assert.equal(game.summons.length + game.robots.length, 37);
    assert.equal(game.summons.filter(unit => unit.weapon === 'toydragon').length, 1);
    assert.equal(game.summons.find(unit => unit.weapon === 'toydragon').spine.length, 18);
  });
});
