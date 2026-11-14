import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyBuild, createGame, statsOf, update } from '../src/engine.js';

function quiet() {
  const game = createGame(() => 0.99);
  game.weapons = { toyknight: 1 };
  game.spawnCarry = -1e6;
  game.nextBossAt = game.nextSwarmAt = game.nextXp = Infinity;
  return game;
}
function target(game, dx, dy = 0) {
  const enemy = { id: game.nextId++, kind: 'roach', x: game.player.x + dx, y: game.player.y + dy,
    hp: 1e6, maxHp: 1e6, radius: 8, speed: 0, damage: 0, xp: 1, timer: 0, kx: 0, ky: 0 };
  game.enemies.push(enemy);
  return enemy;
}
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);

describe('검을 든 소환수', () => {
  it('부채꼴 안의 여러 적을 한 번씩 베고 뒤쪽과 사거리 밖의 적은 맞히지 않는다', () => {
    const game = quiet();
    const front = target(game, 50), side = target(game, 60, 35), behind = target(game, -70), outside = target(game, 180);
    update(game, 1 / 60);
    near(front.maxHp - front.hp, 24);
    near(side.maxHp - side.hp, 24);
    near(behind.hp, behind.maxHp);
    near(outside.hp, outside.maxHp);
    const scar = game.effects.find(e => e.type === 'swordscar');
    assert.ok(scar && scar.radius > 70 && scar.sound === 'slash');
  });
  it('남아 있는 검흔은 적을 매 프레임 다시 때리지 않고 시간이 지나면 사라진다', () => {
    const game = quiet(), enemy = target(game, 50);
    update(game, 1 / 60);
    const hp = enemy.hp;
    for (let n = 0; n < 48; n++) update(game, 1 / 60);
    near(enemy.hp, hp);
    assert.equal(game.effects.filter(e => e.type === 'swordscar').length, 0);
  });
  it('소환 피해와 전용 보물·증원 패시브가 실제 검사에게 적용된다', () => {
    const game = quiet();
    applyBuild(game, { summon: 20 });
    game.passives = { summoncrest: 5, summonwhistle: 3 };
    game.relics = { baton: true, marchdrum: true };
    const enemy = target(game, 50);
    update(game, 1 / 60);
    near(enemy.maxHp - enemy.hp, 24 * 2.16 * 1.35);
    assert.equal(game.summons.length, 4);
    near(game.summons[0].attackIn, 1.5 * statsOf(game).cooldownScale / (1.25 * 1.25));
  });
  it('검흔 수호자는 검사의 앞옆까지 더 넓게 베며 1초 잔상을 남긴다', () => {
    const sample = evolved => {
      const game = quiet();
      game.evolved.toyknight = evolved;
      target(game, 50);
      const side = target(game, -7, 70);
      update(game, 1 / 60);
      return { damage: side.maxHp - side.hp, scar: game.effects.find(e => e.type === 'swordscar') };
    };
    near(sample(false).damage, 0);
    const evolved = sample(true);
    near(evolved.damage, 24 * 1.65);
    assert.equal(evolved.scar.life, 1);
    assert.equal(evolved.scar.evolved, true);
  });
});
