import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyBuild, createGame, statsOf, update } from '../src/engine.js';
import { ARENA, EVOLUTIONS, PLAYER } from '../src/rules.js';
const DT = 1 / 60;
function quiet(acid = false) {
  const game = createGame(() => 0.99);
  game.weapons = acid ? { robot: 5, bleach: 5 } : { robot: 5 };
  game.evolved = { robot: true, ...(acid ? { bleach: true } : {}) };
  game.fusions = acid ? { bleachbot: true } : {};
  game.spawnCarry = -1e6;
  game.nextBossAt = game.nextSwarmAt = game.nextXp = Infinity;
  return game;
}
function target(game, dx, dy = 0) {
  const enemy = { id: game.nextId++, kind: 'roach', x: game.player.x + dx, y: game.player.y + dy,
    hp: 1e8, maxHp: 1e8, radius: 10, speed: 0, damage: 0, xp: 1, timer: 0, kx: 0, ky: 0 };
  game.enemies.push(enemy);
  return enemy;
}
function marine(game, dx, dy = 0) {
  const unit = { id: game.nextId++, x: game.player.x + dx, y: game.player.y + dy, angle: 0 };
  game.robots.push(unit);
  return unit;
}
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function run(game, frames) { for (let n = 0; n < frames; n++) update(game, DT); }

describe('스페이스 마린 자율 전투', () => {
  it('마린 위치에서 적을 찾아 플레이어 사거리 밖의 적에게도 사격한다', () => {
    const game = quiet(), unit = marine(game, 400), enemy = target(game, 800);
    update(game, DT);
    assert.ok(distance(enemy, game.player) > EVOLUTIONS.robot.range);
    assert.ok(game.shots.some(shot => shot.kind === 'marine' && shot.x > game.player.x + 350));
    run(game, 90);
    assert.ok(enemy.hp < enemy.maxHp);
    assert.ok(distance(unit, game.player) > 350);
  });
  it('사거리 밖의 적에게는 다가간 뒤 발사하고 움직이는 동안 계속 사격한다', () => {
    const game = quiet(), enemy = target(game, 650);
    update(game, DT);
    assert.equal(game.shots.length, 0);
    const first = { ...game.robots[0] };
    run(game, 180);
    assert.ok(distance(game.robots[0], first) > 100);
    assert.ok(game.shots.some(shot => shot.kind === 'marine'));
    assert.ok(enemy.hp < enemy.maxHp);
  });
  it('적이 너무 가까우면 거리를 벌리며 쏘고 고정 호위 궤도에서 벗어난다', () => {
    const game = quiet(), enemy = target(game, 40);
    update(game, DT);
    assert.ok(game.robots[0].x < game.player.x);
    assert.ok(game.shots.length > 0);
    run(game, 120);
    assert.ok(game.robots.every(unit => distance(unit, enemy) > 100));
    assert.ok(game.robots.some(unit => distance(unit, game.player) > 58));
    assert.equal(enemy.robotHitAt, undefined);
  });
  it('멀리 뒤처지면 근처 적보다 합류를 우선하고 다시 전투에 복귀한다', () => {
    const game = quiet(), unit = marine(game, -600);
    target(game, -650);
    const start = unit.x;
    update(game, DT);
    assert.ok(unit.regrouping);
    assert.ok(unit.x > start);
    run(game, 180);
    assert.equal(unit.regrouping, false);
    assert.ok(distance(unit, game.player) < EVOLUTIONS.robot.leash);
  });
  it('비정상적으로 멀어지면 복귀하고 맵 가장자리에서도 경계를 넘지 않는다', () => {
    const game = quiet(), unit = marine(game, -1000);
    update(game, DT);
    assert.ok(distance(unit, game.player) < 10);
    game.player.x = PLAYER.radius;
    game.player.y = PLAYER.radius;
    unit.x = PLAYER.radius;
    unit.y = PLAYER.radius;
    target(game, 30, 10);
    run(game, 120);
    for (const robot of game.robots) {
      assert.ok(robot.x >= PLAYER.radius && robot.x <= ARENA.width - PLAYER.radius);
      assert.ok(robot.y >= PLAYER.radius && robot.y <= ARENA.height - PLAYER.radius);
    }
  });
  it('소환 사거리 강화만큼 멀리 쏠 수 있도록 탄환 비행 시간도 확보한다', () => {
    const game = quiet();
    applyBuild(game, { summon: 20 });
    game.relics.baton = true;
    target(game, 700);
    update(game, DT);
    const shot = game.shots.find(shot => shot.kind === 'marine');
    assert.ok(shot);
    const range = EVOLUTIONS.robot.range * statsOf(game).summonRange;
    assert.ok((shot.life + DT) * EVOLUTIONS.robot.bulletSpeed >= range);
    run(game, 120);
    assert.ok(game.enemies[0].hp < game.enemies[0].maxHp);
  });
  it('소독 강습대도 자율 이동하며 소독 탄환과 장판을 유지한다', () => {
    const game = quiet(true), enemy = target(game, 450);
    update(game, DT);
    assert.ok(game.shots.every(shot => shot.acid && shot.acid.dps > 0));
    run(game, 120);
    assert.ok(game.robots.some(unit => distance(unit, game.player) > 58));
    assert.ok(game.puddles.some(puddle => puddle.dps > 0 && puddle.slow > 0));
    assert.ok(enemy.hp < enemy.maxHp);
  });
});
