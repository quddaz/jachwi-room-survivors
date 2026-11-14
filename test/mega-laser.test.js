import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createGame, statsOf, update } from '../src/engine.js';
import { EVOLUTIONS, FUSIONS, WEAPONS } from '../src/rules.js';

function arena() {
  const game = createGame(() => 0.99);
  game.weapons = { laser: 5, fan: 5 };
  game.evolved = { laser: true, fan: true };
  game.fusions = { spinlaser: true };
  game.spawnCarry = -1e6;
  game.nextBossAt = Infinity;
  game.nextSwarmAt = Infinity;
  game.nextXp = Infinity;
  return game;
}
function target(game, dx = 200, dy = 0) {
  const enemy = { id: game.nextId++, kind: 'roach', x: game.player.x + dx, y: game.player.y + dy,
    hp: 1e8, maxHp: 1e8, radius: 10, speed: 0, damage: 0, xp: 1, timer: 0, kx: 0, ky: 0 };
  game.enemies.push(enemy);
  return enemy;
}
function run(game, seconds, fps = 60, input = { x: 0, y: 0 }) {
  for (let n = 0; n < Math.round(seconds * fps); n++) update(game, 1 / fps, input);
}
const close = (a, b, tolerance = 1e-4) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

describe('메가 레이저', () => {
  it('충전 중에는 피해가 없고 발사 순간 한 번 충격음과 섬광을 낸다', () => {
    const game = arena(), enemy = target(game);
    run(game, 0.6);
    assert.equal(game.megaLaser.phase, 'charge');
    assert.equal(enemy.hp, enemy.maxHp);
    assert.equal(game.effects.filter(effect => effect.sound === 'laserBlast').length, 0);
    run(game, 0.1);
    assert.equal(game.megaLaser.phase, 'fire');
    close(enemy.maxHp - enemy.hp, WEAPONS.laser.damage[4] * EVOLUTIONS.laser.damage * FUSIONS.spinlaser.impact);
    assert.equal(game.effects.filter(effect => effect.sound === 'laserBlast').length, 1);
    assert.ok(game.effects.some(effect => effect.type === 'flash'));
  });
  it('플레이어가 움직이거나 적이 이동해도 발사 위치와 방향은 고정된다', () => {
    const game = arena();
    target(game);
    run(game, 0.1);
    const { x, y, angle } = game.megaLaser;
    run(game, 1.5, 60, { x: 0, y: 1 });
    assert.ok(game.player.y > y);
    assert.equal(game.megaLaser.x, x);
    assert.equal(game.megaLaser.y, y);
    assert.equal(game.megaLaser.angle, angle);
    assert.equal(game.megaLaser.phase, 'fire');
  });
  it('빔 안의 적만 3초간 지지고 뒤쪽·옆쪽 적에게는 피해를 주지 않는다', () => {
    const game = arena();
    const inside = target(game), behind = target(game, -250), side = target(game, 200, 300);
    run(game, 3.7);
    assert.equal(game.megaLaser.phase, 'cooldown');
    const base = WEAPONS.laser.damage[4] * EVOLUTIONS.laser.damage;
    close(inside.maxHp - inside.hp, base * (FUSIONS.spinlaser.impact + FUSIONS.spinlaser.dps * 3));
    assert.equal(behind.hp, behind.maxHp);
    assert.equal(side.hp, side.maxHp);
    const hp = inside.hp;
    run(game, 0.5);
    assert.equal(inside.hp, hp);
  });
  it('30·60·120 FPS 모두 같은 총 피해를 주며 고정 피해는 최초 충격에만 더한다', () => {
    for (const fps of [30, 60, 120]) {
      const game = arena();
      game.passives = { precision: 5 };
      const enemy = target(game);
      run(game, 4, fps);
      const base = WEAPONS.laser.damage[4] * EVOLUTIONS.laser.damage;
      close(enemy.maxHp - enemy.hp, base * (FUSIONS.spinlaser.impact + FUSIONS.spinlaser.dps * 3) + 60, 0.001);
      // 충격 피해 숫자 한 번 외에는 지속 피해 숫자/파편이 쌓이지 않는다.
      assert.ok(game.effects.filter(effect => effect.type === 'number').length <= 1);
    }
  });
  it('공속은 충전·발사 시간을 유지하고 발사 후 대기만 줄인다', () => {
    const game = arena();
    game.passives.battery = 5;
    target(game);
    run(game, 3.7);
    assert.equal(game.megaLaser.phase, 'cooldown');
    close(game.megaLaser.remaining, FUSIONS.spinlaser.restSec * statsOf(game).cooldownScale);
    run(game, 1.3);
    assert.equal(game.megaLaser.phase, 'charge');
    assert.ok(game.megaLaser.remaining > 0.6);
    assert.equal(game.shots.length, 0);
    assert.ok(!game.effects.some(effect => effect.weapon === 'fan'));
  });
});
