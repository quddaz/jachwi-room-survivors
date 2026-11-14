import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyBuild, attackTempoOf, choose, createGame, rollChoices, sawBlades, update } from '../src/engine.js';
import { EVOLUTIONS, FUSIONS } from '../src/rules.js';

const DT = 1 / 60;
const almost = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
function quiet() {
  const game = createGame(() => 0.99);
  game.spawnCarry = -1e6;
  game.nextBossAt = Infinity;
  game.nextSwarmAt = Infinity;
  game.nextXp = Infinity;
  game.weapons = {};
  return game;
}
function target(game, dx = 200, dy = 0) {
  const enemy = { id: game.nextId++, kind: 'roach', x: game.player.x + dx, y: game.player.y + dy,
    hp: 1e8, maxHp: 1e8, radius: 15, speed: 0, damage: 0, xp: 1, timer: 0, kx: 0, ky: 0 };
  game.enemies.push(enemy);
  return enemy;
}
function run(game, frames) { for (let n = 0; n < frames; n++) update(game, DT); }
function fused(id) {
  const game = quiet();
  game.weapons = Object.fromEntries(FUSIONS[id].from.map(id => [id, 5]));
  game.evolved = Object.fromEntries(FUSIONS[id].from.map(id => [id, true]));
  game.fusions[id] = true;
  return game;
}

describe('공속에 따른 자율 무기 이동', () => {
  const movers = {
    ball: game => { game.weapons.ball = 1; game.balls = [{ id: 50, x: game.player.x, y: game.player.y, dx: 1, dy: 0 }]; return () => game.balls[0]; },
    robot: game => { game.weapons.robot = 1; target(game, 400); game.robots = [{ id: 50, x: game.player.x, y: game.player.y }]; return () => game.robots[0]; },
    marine: game => { game.weapons.robot = 5; game.evolved.robot = true; return () => game.robots[0]; },
    saw: game => { game.weapons.roller = 5; game.fusions.sawblade = true; target(game, 400); return () => game.saws[0]; },
    top: game => { game.relics.top = true; game.topIn = 999; game.tops = [{ id: 50, x: game.player.x, y: game.player.y, dx: 1, dy: 0, life: 10 }]; return () => game.tops[0]; },
  };
  for (const [name, setup] of Object.entries(movers)) {
    it(`${name}: 공속 배율만큼 이동하고 커피 효과도 즉시 반영한다`, () => {
      const games = [quiet(), quiet(), quiet()];
      games[1].passives.battery = 5;
      games[2].passives.battery = 5;
      games[2].coffeeUntil = 10;
      const distances = games.map(game => {
        const actor = setup(game);
        update(game, DT);
        return Math.hypot(actor().x - game.player.x, actor().y - game.player.y);
      });
      almost(distances[1] / distances[0], attackTempoOf(games[1]) / attackTempoOf(games[0]));
      almost(distances[2] / distances[1], 1 / 0.7);
      games[2].time = 11;
      almost(attackTempoOf(games[2]), attackTempoOf(games[1]));
    });
  }
  it('과충전이 시작되고 끝나면 이동 배율도 같은 시각에 바뀐다', () => {
    const game = quiet();
    applyBuild(game, { haste: 20 });
    game.time = 4.99;
    const before = attackTempoOf(game);
    game.time = 5;
    almost(attackTempoOf(game), before * 1.5);
    game.time = 8;
    almost(attackTempoOf(game), before);
  });
});

describe('스페이스 마린', () => {
  it('세 명이 자율 이동하며 원거리 사격하고 몸통 박치기는 하지 않는다', () => {
    const game = quiet();
    game.weapons.robot = 5;
    game.evolved.robot = true;
    const enemy = target(game, 300);
    update(game, DT);
    assert.equal(game.robots.length, 3);
    assert.equal(game.shots.length, 6);
    assert.ok(game.shots.every(shot => shot.kind === 'marine'));
    run(game, 120);
    assert.ok(enemy.hp < enemy.maxHp);
    assert.equal(enemy.robotHitAt, undefined);
    assert.ok(game.robots.some(robot => Math.hypot(robot.x - game.player.x, robot.y - game.player.y) > 58));
    assert.ok(game.robots.every(robot => Math.hypot(robot.x - enemy.x, robot.y - enemy.y) > 90));
  });
  it('완성형 선택지에서도 새 마린 아이콘을 쓴다', () => {
    const game = quiet();
    game.weapons.robot = 5;
    const choice = rollChoices(game).find(choice => choice.id === 'robot');
    assert.equal(choice.kind, 'evolve');
    assert.equal(choice.icon, EVOLUTIONS.robot.icon);
  });
});

describe('합체 공격 대체', () => {
  for (const id of Object.keys(FUSIONS)) {
    it(`${id}: 재료 무기의 독립 공격 없이 합체 공격만 만든다`, () => {
      const game = fused(id);
      for (let i = 0; i < 10; i++) target(game, 90 + i * 10, i % 2 ? 30 : -30);
      run(game, 120);
      const primary = FUSIONS[id].primary;
      const secondary = FUSIONS[id].from.filter(weapon => weapon !== primary);
      assert.ok(game.shots.every(shot => !secondary.includes(shot.weapon)));
      assert.ok(game.effects.every(effect => !secondary.includes(effect.weapon)));
      for (const weapon of secondary) assert.equal(game.cooldowns[weapon], undefined);
      if (id === 'sawblade') { assert.equal(game.slippers.length, 0); assert.equal(game.shots.length, 0); assert.equal(game.saws.length, 3); }
      if (id === 'bleachbot') assert.ok(game.puddles.every(puddle => puddle.weapon !== 'bleach'));
      if (id === 'foammine') assert.ok(game.shots.every(shot => shot.foamMine));
      assert.ok(game.enemies.some(enemy => enemy.hp < enemy.maxHp), '합체가 실제 피해를 줘야 한다');
    });
  }
  it('합체를 고르는 순간 재료 공격만 정리하고 다른 무기 공격은 남긴다', () => {
    const game = quiet();
    game.weapons = { spray: 5, stapler: 5, roller: 5 };
    game.evolved = { spray: true, stapler: true, roller: true };
    run(game, 1);
    assert.ok(game.shots.some(shot => shot.weapon === 'spray'));
    game.pendingLevels = 1;
    game.choices = [{ kind: 'fusion', id: 'poisongun', label: FUSIONS.poisongun.label }];
    choose(game, 0);
    assert.ok(game.shots.length > 0);
    assert.ok(game.shots.every(shot => shot.weapon === 'roller'));
    assert.ok(!game.effects.some(effect => ['spray', 'stapler'].includes(effect.weapon)));
    run(game, 1);
    assert.ok(game.shots.some(shot => shot.weapon === 'stapler' && shot.volleyId != null));
    assert.ok(!game.shots.some(shot => shot.weapon === 'spray'));
  });
  it('한 합체에 사용한 재료는 다른 합체 선택지에 다시 나오지 않는다', () => {
    const game = fused('thunderball');
    game.weapons.shower = 5;
    game.evolved.shower = true;
    for (let i = 0; i < 10; i++) assert.ok(rollChoices(game).every(choice => choice.id !== 'shockshower'));
  });
});

describe('중첩 피해 제한', () => {
  it('공속과 크기가 커져도 톱날은 같은 적을 0.16초보다 자주 베지 않는다', () => {
    const game = fused('sawblade');
    game.passives = { battery: 5, wipes: 5, magnifier: 5 };
    applyBuild(game, { haste: 20 });
    game.coffeeUntil = 10;
    const enemy = target(game, 80);
    const times = [];
    for (let i = 0; i < 180; i++) {
      const previous = enemy.sawHitAt;
      update(game, DT);
      if (enemy.sawHitAt !== previous) times.push(enemy.sawHitAt);
    }
    assert.ok(times.length > 5 && times.length <= 19);
    assert.ok(times.slice(1).every((time, index) => time - times[index] >= 0.16 - 1e-9));
    assert.ok(sawBlades(game).every(blade => blade.radius <= 56));
  });
  it('겹친 장판은 가장 강한 세 개만 적용하고 만료된 장판은 제외한다', () => {
    const game = quiet();
    const enemy = target(game, 100);
    game.puddles = [10, 20, 30, 40].map(dps => ({ x: enemy.x, y: enemy.y, radius: 50, dps, life: 1 }));
    game.puddles.push({ x: enemy.x, y: enemy.y, radius: 50, dps: 1e6, life: 0.001 });
    update(game, DT);
    almost(enemy.maxHp - enemy.hp, (20 + 30 + 40) * DT);
  });
  it('동일 발사의 초과 독침은 적을 통과하고 다른 적에게 쓸 관통은 남긴다', () => {
    const game = quiet();
    const first = target(game, 100), second = target(game, 150);
    for (let n = 0; n < 5; n++) game.shots.push({ x: first.x, y: first.y, vx: 0, vy: 0,
      radius: 5, damage: 10, life: 2, pierce: 1, hit: new Set(), volleyId: 5, volleyMaxHits: 2 });
    update(game, DT);
    almost(first.maxHp - first.hp, 20);
    const skipped = game.shots.filter(shot => shot.ignored?.has(first.id));
    assert.equal(skipped.length, 3);
    assert.ok(skipped.every(shot => shot.hit.size === 0));
    for (const shot of skipped) { shot.x = second.x; shot.y = second.y; }
    update(game, DT);
    almost(second.maxHp - second.hp, 20);
  });
});
