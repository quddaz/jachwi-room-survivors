import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyBuild, applyCharacter, choose, createGame, rollChoices, update } from '../src/engine.js';
import { STRUCTURES, STRUCTURE_FUSIONS } from '../src/rules.js';

const DT = 1 / 60;
const run = (game, seconds) => { for (let n = 0; n < Math.round(seconds * 60); n++) update(game, DT); };
function quiet(builds) {
  const game = createGame(() => 0.5);
  applyCharacter(game, 'diy');
  game.weapons = {};
  game.builds = builds;
  game.deployIn = Object.fromEntries(Object.keys(builds).map(id => [id, 1e9]));
  game.spawnCarry = -1e9;
  game.nextXp = game.nextBossAt = Infinity;
  return game;
}
function piece(game, type, dx = 0, dy = 0, extra = {}) {
  const item = { id: game.nextId++, type, x: game.player.x + dx, y: game.player.y + dy,
    life: 24, total: 24, fireIn: 0, hp: 1, facing: 1, shotAt: -1, ...extra };
  game.structures.push(item);
  return item;
}
function enemy(game, dx, dy = 0, extra = {}) {
  const item = { id: game.nextId++, kind: 'roach', x: game.player.x + dx, y: game.player.y + dy,
    hp: 1e6, maxHp: 1e6, speed: 0, radius: 10, damage: 0, xp: 0, timer: 0, kx: 0, ky: 0, ...extra };
  game.enemies.push(item);
  return item;
}

describe('집돌이 오리의 선풍기·작업대 조합', () => {
  it('새 설치물을 선택하고 강화한 뒤 각각 완성형과 합체를 고를 수 있다', () => {
    for (const [id, partner, fusion] of [['blower', 'trap', 'stickyspray'], ['workbench', 'nailgun', 'autoturret']]) {
      const game = quiet(Object.fromEntries(Object.keys(STRUCTURES).filter(key => key !== id).map(key => [key, 5])));
      game.buildEvolved = Object.fromEntries(Object.keys(game.builds).map(key => [key, true]));
      game.buildFusions = Object.fromEntries(Object.keys(STRUCTURE_FUSIONS).map(key => [key, true]));
      const offer = rollChoices(game).find(choice => choice.kind === 'structure' && choice.id === id);
      assert.ok(offer, `${id} 새 설치물`);
      game.choices = [offer]; choose(game, 0);
      assert.equal(game.builds[id], 1);
      game.builds = { [id]: 5, [partner]: 5 };
      game.buildEvolved = {};
      game.buildFusions = {};
      const evolve = rollChoices(game).find(choice => choice.kind === 'build-evolve' && choice.id === id);
      assert.ok(evolve, `${id} 완성형`);
      game.choices = [evolve]; choose(game, 0);
      assert.ok(game.buildEvolved[id]);
      assert.ok(!rollChoices(game).some(choice => choice.kind === 'build-fusion' && choice.id === fusion));
      game.buildEvolved[partner] = true;
      const combine = rollChoices(game).find(choice => choice.kind === 'build-fusion' && choice.id === fusion);
      assert.ok(combine, `${fusion} 합체`);
      game.choices = [combine]; choose(game, 0);
      assert.ok(game.buildFusions[fusion]);
    }
  });

  it('선풍기는 전방 부채꼴 적을 밀어내고 뒤쪽 적은 맞히지 않는다', () => {
    const game = quiet({ blower: 1 });
    piece(game, 'blower');
    const front = enemy(game, 80), back = enemy(game, -140), side = enemy(game, 0, 150);
    update(game, DT);
    assert.ok(front.hp < front.maxHp);
    assert.ok(front.kx > 0);
    assert.equal(back.hp, back.maxHp);
    assert.equal(side.hp, side.maxHp);
    const start = front.x;
    update(game, DT);
    assert.ok(front.x > start);
  });

  it('선풍기는 보스에게 피해를 주되 밀어내지 않는다', () => {
    const game = quiet({ blower: 1 });
    piece(game, 'blower');
    const boss = enemy(game, 80, 0, { boss: true });
    update(game, DT);
    assert.ok(boss.hp < boss.maxHp);
    assert.equal(boss.kx, 0);
    assert.equal(boss.ky, 0);
  });

  it('완성형 선풍기는 기존 사거리 밖의 적도 밀어낸다', () => {
    const game = quiet({ blower: 5 });
    game.buildEvolved.blower = true;
    piece(game, 'blower');
    const target = enemy(game, 250);
    update(game, DT);
    assert.ok(target.hp < target.maxHp);
    assert.ok(target.kx > 0);
  });

  function supportedHit(benches, gap = 50, evolved = false) {
    const game = quiet({ nailgun: 1, workbench: 5 });
    game.buildEvolved.workbench = evolved;
    const gun = piece(game, 'nailgun', 0, 0, { fireIn: 0.5 });
    for (let n = 0; n < benches; n++) piece(game, 'workbench', gap, n * 20);
    const target = enemy(game, 120);
    run(game, 0.65);
    return { game, gun, damage: target.maxHp - target.hp };
  }

  it('작업대는 가까운 설치물을 가속하고 여러 대가 겹쳐도 중첩하지 않는다', () => {
    const alone = supportedHit(0), near = supportedHit(1), overlapped = supportedHit(2), far = supportedHit(1, 350);
    assert.ok(near.damage > alone.damage);
    assert.equal(overlapped.damage, near.damage);
    assert.equal(far.damage, alone.damage);
  });

  it('작업대가 해체되거나 범위 밖으로 옮겨지면 가속 효과가 사라진다', () => {
    for (const expire of [true, false]) {
      const game = quiet({ nailgun: 1, workbench: 1 });
      const gun = piece(game, 'nailgun', 0, 0, { fireIn: 10 });
      const bench = piece(game, 'workbench', 50);
      update(game, DT);
      const accelerated = 10 - gun.fireIn;
      if (expire) bench.life = 0;
      else bench.x += 400;
      const before = gun.fireIn;
      update(game, DT);
      assert.ok(accelerated > before - gun.fireIn);
      assert.ok(Math.abs(before - gun.fireIn - DT) < 1e-9);
    }
  });

  it('완성형과 연장선은 작업대 지원 범위를 실제로 넓힌다', () => {
    assert.ok(supportedHit(1, 280, true).damage > supportedHit(1, 280).damage);
    const base = quiet({ workbench: 1, nailgun: 1 });
    const gun = piece(base, 'nailgun', 0, 0, { fireIn: 10 });
    piece(base, 'workbench', 200);
    base.relics.extension = true;
    update(base, DT);
    assert.ok(10 - gun.fireIn > DT);
  });

  it('끈끈이 살포기는 둔화와 전방 장판을 만들고 장판 개수는 제한된다', () => {
    const game = quiet({ blower: 5, trap: 5 });
    game.buildEvolved = { blower: true, trap: true };
    game.buildFusions.stickyspray = true;
    const fan = piece(game, 'blower');
    const target = enemy(game, 100);
    update(game, DT);
    assert.equal(target.slowBy, 0.15);
    assert.ok(target.slowUntil > game.time);
    const puddle = game.structures.find(item => item.sprayOwner === fan.id);
    assert.ok(puddle?.temp);
    assert.ok(puddle.x > fan.x);
    for (let n = 0; n < 720; n++) {
      target.x = game.player.x + 100; target.kx = target.ky = 0;
      update(game, DT);
      assert.ok(game.structures.filter(item => item.sprayOwner === fan.id).length <= 1);
    }
    game.enemies = [];
    run(game, 3.5);
    assert.ok(!game.structures.some(item => item.sprayOwner === fan.id));
  });

  it('자동 조립은 8초 뒤 소형 포탑을 만들고 수명·설치 수 제한을 지킨다', () => {
    const game = quiet({ workbench: 5, nailgun: 5 });
    game.buildEvolved = { workbench: true, nailgun: true };
    game.buildFusions.autoturret = true;
    const bench = piece(game, 'workbench');
    piece(game, 'nailgun', 100);
    enemy(game, 180);
    run(game, 7.9);
    assert.ok(!game.structures.some(item => item.mini));
    run(game, 0.2);
    const mini = game.structures.find(item => item.mini);
    assert.ok(mini?.temp);
    assert.equal(mini.assemblyOwner, bench.id);
    assert.equal(game.structures.filter(item => item.type === 'nailgun' && !item.temp).length, 1);
    run(game, 6.1);
    assert.ok(!game.structures.some(item => item.id === mini.id));
    for (let n = 0; n < 900; n++) {
      update(game, DT);
      assert.ok(game.structures.filter(item => item.assemblyOwner === bench.id).length <= 1);
    }
  });

  it('소형 포탑의 기본 피해는 동일한 강화의 못총 피해 55%다', () => {
    const game = quiet({ nailgun: 5 });
    game.buildEvolved.nailgun = true;
    piece(game, 'nailgun', 0, -20);
    piece(game, 'nailgun', 0, 20, { mini: true, temp: true, damageScale: 0.55 });
    enemy(game, 280);
    update(game, DT);
    const damage = game.shots.map(shot => shot.damage).sort((a, b) => a - b);
    assert.equal(damage.length, 2);
    assert.ok(Math.abs(damage[0] / damage[1] - 0.55) < 1e-9);
    applyBuild(game, { summon: 20 });
    game.structures.forEach(item => { item.fireIn = 0; });
    game.shots = [];
    update(game, DT);
    assert.ok(game.shots.every(shot => Number.isFinite(shot.damage)));
  });
});
