import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyBuild, choose, createGame, describeChoice, rollChoices, rollRelics, statsOf, update } from '../src/engine.js';
import { BUILD, EVOLUTIONS, PASSIVES, WEAPONS, normalizeBuild, passiveMaxLevel } from '../src/rules.js';
const IDS = ['sockpuppet', 'toydrone', 'windcar', 'plantspirit', 'toyknight'];
const DT = 1 / 60;
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
function quiet(weapons = {}) {
  const g = createGame(() => 0.99);g.weapons = weapons;g.spawnCarry = -1e6;
  g.nextBossAt = Infinity;g.nextSwarmAt = Infinity;g.nextXp = Infinity;return g;
}
function target(g, dx = 220, dy = 0) {
  const e = { id: g.nextId++, kind: 'roach', x: g.player.x + dx, y: g.player.y + dy,
    hp: 1e8, maxHp: 1e8, radius: 12, speed: 0, damage: 0, xp: 1, timer: 0, kx: 0, ky: 0 };
  g.enemies.push(e);return e;
}
function run(g, frames) { for (let n = 0; n < frames; n++) update(g, DT); }

describe('생존 대신 소환 능력치', () => {
  it('세 번째 항목을 소환으로 바꾸고 기존 저장 포인트는 이전한다', () => {
    assert.deepEqual(Object.keys(BUILD), ['crit', 'haste', 'summon', 'treasure']);
    assert.deepEqual(normalizeBuild({ crit: 10, survival: 20 }), { crit: 10, haste: 0, summon: 20, treasure: 0 });
    assert.equal(normalizeBuild({ summon: 0, survival: 20 }).summon, 0);
  });
  it('20점은 패시브 해금이며 즉시 추가 소환수를 주지는 않는다', () => {
    const g = quiet();applyBuild(g, { summon: 20 });
    const s = statsOf(g);near(s.summonPower, 1.56);near(s.summonSpeed, 1.48);
    near(s.summonHaste, 1.25);near(s.summonRange, 1.2);assert.equal(s.summonCount, 0);
    g.passives = { summoncrest: 5, summonwhistle: 3 };
    near(statsOf(g).summonPower, 2.16);assert.equal(statsOf(g).summonCount, 3);
  });
  it('소환 보너스는 일반 무기의 피해와 체력·회복·방어에 영향을 주지 않는다', () => {
    const values = [0, 20].map(points => {
      const g = quiet({ broom: 1 });applyBuild(g, { summon: points });
      const e = target(g, 40);update(g, DT);
      const s = statsOf(g);assert.equal(s.maxHp, 100);assert.equal(s.regen, 1);assert.equal(s.armor, 0);
      return e.maxHp - e.hp;
    });near(values[0], values[1]);
  });
  it('기존 로봇과 마린도 피해 강화와 추가 소환수 혜택을 받는다', () => {
    for (const evolved of [false, true]) {
      const g = quiet({ robot: 5 });g.evolved.robot = evolved;
      applyBuild(g, { summon: 20 });g.passives.summonwhistle = 3;
      target(g);update(g, DT);
      assert.equal(g.robots.length, (evolved ? 3 : 2) + 3);
      assert.ok(g.robots.every(unit => unit.marine === evolved));
    }
    const values = [0, 20].map(points => {
      const g = quiet({ robot: 1 });applyBuild(g, { summon: points });
      const e = target(g);g.robots = [{ id: 50, x: e.x, y: e.y, angle: 0 }];
      update(g, DT);return e.maxHp - e.hp;
    });near(values[1] / values[0], 1.56);
  });
});

describe('소환 20점 전용 패시브', () => {
  function pool(points) {
    const g = quiet(Object.fromEntries(Object.keys(WEAPONS).map(id => [id, 5])));
    applyBuild(g, { summon: points });g.evolved = Object.fromEntries(Object.keys(WEAPONS).map(id => [id, true]));
    g.fusions = { shockshower: true, bomber: true };
    g.passives = Object.fromEntries(Object.keys(PASSIVES).filter(id => !PASSIVES[id].summonOnly).map(id => [id, passiveMaxLevel(id)]));
    return g;
  }
  it('19점까지 숨기고 20점부터 레벨업 선택지에만 나온다', () => {
    for (const points of [0, 10, 19, 20]) {
      const g = pool(points);
      const ids = rollChoices(g).filter(c => PASSIVES[c.id]?.summonOnly).map(c => c.id).sort();
      assert.deepEqual(ids, points === 20 ? ['summoncrest', 'summonwhistle'] : []);
      assert.ok(rollRelics(g).every(c => !['summoncrest', 'summonwhistle'].includes(c.id)));
    }
  });
  it('패시브를 실제로 골라야 증원되고 3레벨을 넘겨 강화하지 않는다', () => {
    const g = pool(20);g.pendingLevels = 1;
    g.choices = [{ kind: 'passive', id: 'summonwhistle', level: 1 }];choose(g, 0);
    assert.equal(statsOf(g).summonCount, 1);
    g.passives.summonwhistle = 3;g.passives.summoncrest = 5;
    assert.ok(rollChoices(g).every(c => !['summonwhistle', 'summoncrest'].includes(c.id)));
    assert.ok(describeChoice(g, { kind: 'passive', id: 'summonwhistle', level: 3 }).join().includes('+3'));
  });
});

describe('소환 무기와 완성형', () => {
  for (const id of IDS) {
    it(`${id}: 5레벨과 완성형이 있고 공격하며 소환수가 누적되지 않는다`, () => {
      const g = quiet({ [id]: 5 });g.evolved[id] = true;
      applyBuild(g, { summon: 20 });g.passives = { summonwhistle: 3, summoncrest: 5 };
      const enemy = target(g);run(g, 360);
      assert.ok(enemy.hp < enemy.maxHp);
      assert.equal(g.summons.filter(u => u.weapon === id).length, EVOLUTIONS[id].count + 3);
      assert.ok(g.summons.every(u => Number.isFinite(u.x) && Number.isFinite(u.y)));
      assert.ok(EVOLUTIONS[id].icon);
    });
    it(`${id}: 패시브 없는 20점과 19점은 소환 수가 같고 증원 패시브만 수를 늘린다`, () => {
      const counts = [19, 20].map(points => {
        const g = quiet({ [id]: 1 });applyBuild(g, { summon: points });update(g, DT);return g.summons.length;
      });assert.deepEqual(counts, [1, 1]);
      const g = quiet({ [id]: 1 });applyBuild(g, { summon: 20 });g.passives.summonwhistle = 2;
      update(g, DT);assert.equal(g.summons.length, 3);
    });
  }
  it('태엽 자동차는 빠른 돌진 경로의 작은 적도 놓치지 않는다', () => {
    const g = quiet({ windcar: 1 });target(g, 150);
    update(g, DT);g.summons[0].angle = 0;g.summons[0].charging = true;g.summons[0].chargeLeft = 300;g.summons[0].hit = new Set();
    const e = target(g, 80);e.radius = 2;update(g, 0.2);assert.ok(e.hp < e.maxHp);
  });
  it('화분 정령의 씨앗은 적중 지점 주변의 적도 때린다', () => {
    const g = quiet({ plantspirit: 1 });const first = target(g, 180), side = target(g, 180, 25);
    run(g, 60);assert.ok(first.hp < first.maxHp && side.hp < side.maxHp);
  });
  it('소환수를 교체하면 해당 소환수만 제거하고 다른 소환수는 유지한다', () => {
    const g = quiet({ sockpuppet: 1, toydrone: 1 });update(g, DT);
    delete g.weapons.sockpuppet;update(g, DT);
    assert.equal(g.summons.length, 1);assert.equal(g.summons[0].weapon, 'toydrone');
  });
  it('여섯 소환 무기를 최대 강화해도 소환수는 총 36개로 유지한다', () => {
    const all = [...IDS, 'robot'];const g = quiet(Object.fromEntries(all.map(id => [id, 5])));
    g.evolved = Object.fromEntries(all.map(id => [id, true]));applyBuild(g, { summon: 20, haste: 10 });
    g.passives = { summonwhistle: 3, summoncrest: 5, battery: 5 };
    target(g);run(g, 600);assert.equal(g.summons.length + g.robots.length, 36);
    assert.ok(g.shots.length < 400);
  });
});

describe('소환 전투 보너스 적용', () => {
  it('소환 휘장은 드론의 실제 탄환 피해를 올린다', () => {
    const damage = [false, true].map(boost => {
      const g = quiet({ toydrone: 1 });applyBuild(g, { summon: boost ? 20 : 0 });
      if (boost) g.passives.summoncrest = 5;
      target(g);update(g, DT);return g.shots[0].damage;
    });near(damage[1] / damage[0], 2.16);
  });
  it('소환 이동 속도는 적을 추격하는 인형의 실제 이동에 반영된다', () => {
    const moved = [0, 20].map(points => {
      const g = quiet({ sockpuppet: 1 });applyBuild(g, { summon: points });target(g, 400);
      update(g, DT);return Math.hypot(g.summons[0].x - g.player.x, g.summons[0].y - g.player.y);
    });near(moved[1] / moved[0], 1.48);
  });
});
