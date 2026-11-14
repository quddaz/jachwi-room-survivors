import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createGame, update } from '../src/engine.js';
import { bossStatsOf, BOSSES, difficultyAt, ELITE, ENEMIES, hpSurgeAt } from '../src/rules.js';

function quiet(time) {
  const game = createGame(() => 0.99);
  game.time = time;
  game.weapons = {};
  game.spawnCarry = -1000000;
  game.nextBossAt = Infinity;
  game.nextSwarmAt = Infinity;
  game.eliteUnlocked = ELITE.order.length;
  return game;
}

function enemy(game, extra = {}) {
  const target = { id: game.nextId++, kind: 'roach', x: game.player.x + 200, y: game.player.y,
    hp: 30, maxHp: 100, speed: 0, radius: 10, damage: 0, xp: 1, timer: 0, kx: 0, ky: 0, ...extra };
  game.enemies.push(target);
  return target;
}

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);

describe('8분 체력 강화', () => {
  it('8분 전은 기존 난이도를 유지하고 8분부터 1.3배, 이후 분당 8%씩 추가 성장한다', () => {
    near(hpSurgeAt(0), 1);
    near(hpSurgeAt(479.999), 1);
    near(hpSurgeAt(480), 1.3);
    near(hpSurgeAt(540), 1.404);
    near(hpSurgeAt(600), 1.51632);
    near(hpSurgeAt(720), 1.768635648);
    near(difficultyAt(480).hp, 19.448);
  });

  it('7분 55초에 경고음이 있는 배너를 한 번만 띄운다', () => {
    const game = quiet(474.99);
    update(game, 0.02);
    const warning = game.effects.find((effect) => effect.warning);
    assert.match(warning.text, /경고!.*8분/);
    assert.equal(warning.sound, 'boss');
    update(game, 1 / 60);
    assert.equal(game.effects.filter((effect) => effect.warning).length, 1);
    assert.equal(game.hpSurgeStarted, false);
  });

  it('일반 적·정예·보스의 남은 체력 비율을 보존하고 죽은 적은 강화하지 않는다', () => {
    const game = quiet(480 - 1 / 60);
    const normal = enemy(game);
    const elite = enemy(game, { elite: true, hp: 180, maxHp: 600 });
    const boss = enemy(game, { boss: true, hp: 300, maxHp: 1000 });
    const dead = enemy(game, { dead: true, hp: 0 });
    update(game, 1 / 60);
    for (const [target, maxHp] of [[normal, 130], [elite, 780], [boss, 1300]]) {
      near(target.maxHp, maxHp);
      near(target.hp / target.maxHp, 0.3);
    }
    assert.equal(dead.hp, 0);
    assert.equal(dead.maxHp, 100);
    assert.ok(game.effects.some((effect) => effect.warning && effect.text.includes('체력 +30%')));
  });

  it('8분 전환 후 다음 프레임마다 강화 배율을 다시 곱하지 않는다', () => {
    const game = quiet(480 - 1 / 60);
    const target = enemy(game);
    for (let frame = 0; frame < 61; frame += 1) update(game, 1 / 60);
    near(target.maxHp, 100 * hpSurgeAt(game.time));
    near(target.hp / target.maxHp, 0.3);
    assert.equal(game.effects.filter((effect) => effect.text?.includes('체력 +30%')).length, 1);
  });

  it('강화 후에도 기존 적의 체력이 분당 8%씩 연속 증가한다', () => {
    const game = quiet(480);
    const target = enemy(game);
    update(game, 60);
    near(target.maxHp, 108);
    near(target.hp, 32.4);
  });

  it('새로 생성된 적은 현재 체력 배율을 정확히 한 번 적용받는다', () => {
    const game = quiet(480 - 1 / 60);
    game.spawnCarry = 1;
    update(game, 1 / 60);
    assert.equal(game.enemies.length, 1);
    const spawned = game.enemies[0];
    assert.ok(!spawned.elite);
    near(spawned.maxHp, ENEMIES[spawned.kind].hp * difficultyAt(game.time).hp);
  });

  it('새 보스의 체력에도 8분 배율을 적용한다', () => {
    assert.equal(bossStatsOf(0, 480).hp, Math.round(BOSSES[0].hp * 19.448));
  });

  it('선택창이 열려 있으면 시간이 멈추고 경고와 체력 강화도 진행하지 않는다', () => {
    const game = quiet(479.99);
    const target = enemy(game);
    game.choices = [{ kind: 'heal' }];
    update(game, 1);
    assert.equal(game.time, 479.99);
    assert.equal(target.maxHp, 100);
    assert.equal(game.hpSurgeStarted, false);
    assert.equal(game.effects.length, 0);
  });
});
