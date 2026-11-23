import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyBuild, applyCharacter, createGame, damageEnemy, describeChoice, passiveLines, rollChoices, rollRelics, statSheet, statsOf, update } from '../src/engine.js';
import { BUILD, CHARACTERS, ELEMENTS, EVOLUTIONS, FUSIONS, PASSIVES, RELICS, WEAPONS, normalizeBuild, passiveMaxLevel, weaponCategoriesOf, weaponCategoryOf, weaponElementsOf } from '../src/rules.js';
import { ITEM_IDS } from '../src/sprites.js';

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-5, `${a} != ${b}`);
function quiet(weapons = {}) {
  const g = createGame(() => 0.99);
  g.weapons = weapons; g.spawnCarry = -1e8;
  g.nextBossAt = g.nextSwarmAt = g.nextXp = Infinity;
  return g;
}
function target(g, dx = 40, dy = 0, extra = {}) {
  const e = { id: g.nextId++, kind: 'roach', x: g.player.x + dx, y: g.player.y + dy,
    hp: 1e6, maxHp: 1e6, radius: 10, speed: 0, damage: 0, xp: 0, timer: 0, kx: 0, ky: 0, ...extra };
  g.enemies.push(e); return e;
}
const PASSIVE_IDS = ['sights', 'redink', 'shatterlens', 'catalyst', 'spectrum', 'corrosion', 'displaystand', 'appraisal', 'collection'];
const RELIC_IDS = ['rubyglass', 'redthread', 'prism', 'contagion', 'jewelcase', 'expedition'];

describe('무기 계열과 다섯 번째 능력치', () => {
  it('기존 배분을 보존하고 지속 점수도 총 30점·최대 20점으로 제한한다', () => {
    assert.deepEqual(normalizeBuild({ crit: 20, haste: 10, dot: 20 }), { crit: 20, haste: 10, summon: 0, treasure: 0, dot: 0, necro: 0 });
    assert.equal(normalizeBuild({ dot: 99 }).dot, 20);
    assert.equal(normalizeBuild({ dot: -1 }).dot, 0);
    assert.equal(normalizeBuild({ dot: 'invalid' }).dot, 0);
    assert.equal(normalizeBuild({ survival: 20, dot: 10 }).summon, 20);
    assert.equal(Object.keys(BUILD).length, 6);
  });
  it('모든 무기·완성형·합체를 분류하고 소환·보물의 주 계열을 보존한다', () => {
    for (const id of [...Object.keys(WEAPONS), ...Object.keys(FUSIONS)]) {
      assert.ok(weaponCategoriesOf(id).length, id);
      assert.ok(weaponElementsOf(id).every(element => Object.hasOwn(ELEMENTS, element)), id);
    }
    for (const id of Object.keys(EVOLUTIONS)) assert.ok(weaponCategoryOf(id), id);
    for (const [id, w] of Object.entries(WEAPONS)) {
      if (w.summon) assert.equal(weaponCategoryOf(id), 'summon', id);
      if (w.treasureScaling) assert.equal(weaponCategoryOf(id), 'treasure', id);
    }
    assert.equal(weaponCategoryOf('dryer'), 'dot');
    assert.equal(weaponCategoryOf('dronebase'), 'summon');
    assert.deepEqual(weaponCategoriesOf('bleachbot'), ['summon', 'dot', 'elemental']);
    assert.equal(weaponCategoryOf('goldrain'), 'treasure');
    assert.deepEqual(weaponElementsOf('shockshower'), ['water', 'lightning']);
    assert.deepEqual(weaponCategoriesOf('invalid'), []);
  });
});

describe('신규 20점 장비 해금', () => {
  for (const tree of ['crit', 'dot', 'treasure']) {
    const flag = { crit: 'critOnly', dot: 'dot20Only', treasure: 'treasureOnly' }[tree];
    const passives = PASSIVE_IDS.filter(id => PASSIVES[id][flag]);
    const relics = RELIC_IDS.filter(id => RELICS[id][flag]);
    it(`${tree}: 새 패시브 3종·보물 2종은 19점에서 숨기고 20점부터 제공한다`, () => {
      assert.equal(passives.length, 3); assert.equal(relics.length, 2);
      for (const points of [19, 20]) {
        const g = quiet(Object.fromEntries(Object.keys(WEAPONS).map(id => [id, 5])));
        applyBuild(g, { [tree]: points });
        g.evolved = Object.fromEntries(Object.keys(WEAPONS).map(id => [id, true]));
        g.fusions = Object.fromEntries(Object.keys(FUSIONS).map(id => [id, true]));
        g.passives = Object.fromEntries(Object.keys(PASSIVES).filter(id => !passives.includes(id)).map(id => [id, passiveMaxLevel(id)]));
        assert.deepEqual(rollChoices(g).filter(c => passives.includes(c.id)).map(c => c.id).sort(), points === 20 ? [...passives].sort() : []);
        g.relics = Object.fromEntries(Object.keys(RELICS).filter(id => !relics.includes(id)).map(id => [id, true]));
        const found = rollRelics(g).map(c => c.id);
        for (const id of relics) assert.equal(found.includes(id), points === 20, id);
      }
    });
  }
  it('새 장비에 고유 아이콘과 실제 선택 수치가 있다', () => {
    for (const id of [...PASSIVE_IDS, ...RELIC_IDS]) assert.ok(ITEM_IDS.includes(id), id);
    for (const id of PASSIVE_IDS) {
      const lines = passiveLines(id, 5);
      assert.ok(lines.length && lines.every(line => !/undefined|NaN/.test(line)), id);
      const choice = describeChoice(quiet(), { kind: 'passive', id, level: 5 });
      assert.ok(choice.every(line => !/undefined|NaN/.test(line)), id);
    }
  });
});

describe('지속·속성 피해와 연금술사', () => {
  it('연금술사는 지속과 속성 배율을 각각 한 번 받으며 물리 타격에는 보너스가 없다', () => {
    const sample = (id, alchemist) => {
      const g = quiet({ [id]: 1 }); if (alchemist) applyCharacter(g, 'alchemist');
      const e = target(g); update(g, 0.1); return e.maxHp - e.hp;
    };
    near(sample('dryer', true) / sample('dryer', false), 1.25 * 1.2);
    near(sample('broom', true), sample('broom', false));
    assert.equal(CHARACTERS.alchemist.starter, 'dryer');
  });
  it('지속 5·10·20점 보너스와 전용 패시브를 실제 지속 피해에 적용한다', () => {
    const g = quiet({ dehumidifier: 1 }); applyBuild(g, { dot: 20 });
    g.passives = { catalyst: 5, spectrum: 5, corrosion: 5 };
    const s = statsOf(g); near(s.dotPower, 1 + 0.42 + 0.15 + 0.6); near(s.elementalPower, 1 + 0.28 + 0.2 + 0.4);
    const e = target(g, 40, 0, { elite: true }); update(g, 0.1);
    near(e.maxHp - e.hp, 18 * 0.1 * s.dotPower * s.elementalPower * 1.75);
  });
  it('오색 프리즘은 속성 공격의 기본 피해만 올리고 고정 피해를 증폭하지 않는다', () => {
    const damage = prism => {
      const g = quiet({ spray: 1 }); g.passives.clover = 10; g.relics.mallet = true;
      if (prism) g.relics.prism = true;
      target(g, 300); update(g, 0.001);
      return { shot: g.shots[0].damage, flat: statsOf(g).flatDamage };
    };
    const a = damage(false), b = damage(true);
    near(a.flat, b.flat); near(b.shot - a.shot, WEAPONS.spray.damage[0] * 0.45);
  });
  it('물·번개 복합 합체도 속성 배율을 중복 적용하지 않는다', () => {
    const sample = prism => {
      const g = quiet({ shower: 5, zapper: 5 }); g.fusions.shockshower = true;
      if (prism) g.relics.prism = true;
      target(g); update(g, 0.01);
      return g.splashes[0].damage;
    };
    near(sample(true) / sample(false), 1.45);
  });
  it('냉기·독·화염 공격 보물에도 속성 배율이 한 번 적용된다', () => {
    for (const id of ['purifier', 'freshener', 'heatpad']) {
      const sample = prism => {
        const g = quiet(); g.relics[id] = true; if (prism) g.relics.prism = true;
        g.purifierIn = g.freshIn = g.heatIn = 0;
        target(g); update(g, 0.01);
        return g.relicAttacks.find(attack => attack.id === id).damage;
      };
      near(sample(true) / sample(false), 1.45);
    }
  });
  it('반응 촉매는 같은 장판의 30·60·120 FPS 총 피해가 같다', () => {
    const damage = fps => {
      const g = quiet(); g.passives.catalyst = 5;
      const e = target(g); g.puddles = [{ x: e.x, y: e.y, dps: 100, radius: 40, life: 10 }];
      for (let n = 0; n < fps; n++) update(g, 1 / fps);
      return e.maxHp - e.hp;
    };
    near(damage(30), 160); near(damage(60), 160); near(damage(120), 160);
  });
});

describe('보물 수집과 전염', () => {
  it('수집 도감·진열함은 슬롯 수, 감정 수첩은 현재 레벨에 비례한다', () => {
    const g = quiet(); g.level = 11; g.passives = { collection: 5, appraisal: 5, displaystand: 5 };
    g.relics = { jewelcase: true, expedition: true };
    near(statsOf(g).relicPower, 1 + 10 * 0.02 + 2 * 0.18);
    near(statsOf(g).relicRange, 1.75); near(statsOf(g).area, 1);
    delete g.relics.expedition; near(statsOf(g).relicPower, 1 + 0.2 + 0.18);
  });
  it('보물 전용 범위는 공격 보물의 실제 지대 크기만 넓힌다', () => {
    const g = quiet(); g.relics = { heatpad: true, expedition: true }; g.passives.displaystand = 5; g.heatIn = 0;
    target(g); update(g, 0.01);
    near(g.relicAttacks.find(attack => attack.id === 'heatpad').halfWidth, RELICS.heatpad.radius * 1.75);
    near(statsOf(g).area, 1);
  });
  it('최대 3명에게 남은 독·화상만 복사하고 전염 처치는 재전염하지 않는다', () => {
    const g = quiet(); g.relics.contagion = true;
    const source = target(g, 40, 0, { hp: 1, burnUntil: 8, burnDps: 100, poisonUntil: 2, poisonDps: 80 });
    const victims = Array.from({ length: 4 }, (_, i) => target(g, 50 + i * 15));
    const far = target(g, 450); damageEnemy(g, source, 2);
    const infected = victims.filter(e => e.dotContagion);
    assert.equal(infected.length, 3); near(infected[0].burnDps, 65); near(infected[0].poisonDps, 52);
    near(infected[0].burnUntil, 3); near(infected[0].poisonUntil, 2);
    assert.equal(far.burnDps, undefined);
    const fourth = victims.find(e => !e.dotContagion); damageEnemy(g, infected[0], 2e6);
    assert.equal(fourth.burnDps, undefined);
  });
  it('강한 기존 상태는 시간과 피해를 모두 보존하고 출혈은 전염하지 않는다', () => {
    const g = quiet(); g.relics.contagion = true;
    const a = target(g, 40, 0, { hp: 1, burnUntil: 1, burnDps: 100, bleedUntil: 5, bleedDps: 100 });
    const b = target(g, 55, 0, { burnUntil: 8, burnDps: 200 }); damageEnemy(g, a, 2);
    near(b.burnDps, 200); near(b.burnUntil, 8); assert.equal(b.bleedDps, undefined);
  });
});

describe('100% 초과 치명타', () => {
  it('능력치 창은 치확 101.2%를 보존하고 고정 피해의 긴 소수만 정리한다', () => {
    const g = quiet(); applyBuild(g, { crit: 20 }); applyCharacter(g, 'normal');
    const sheet = Object.fromEntries(statSheet(g));
    assert.equal(sheet['치명타 확률'], '101.2%');
    assert.equal(sheet['다중 치명'], '1회 확정');
    assert.equal(sheet['2중 치명 확률'], '1.2%');
    applyCharacter(g, 'gunner'); g.level = 100;
    g.passives = { counterweight: 5, lightgear: 5 };
    const raw = statsOf(g).flatDamage;
    const value = Object.fromEntries(statSheet(g))['고정 피해'];
    assert.match(value, /^\+\d+$/);
    assert.ok(Math.abs(Number(value) - raw) <= 0.5);
    assert.equal(statsOf(g).flatDamage, raw);
  });
  it('치명 20점에 +70%p가 붙고 일반 오리는 기본 배분만으로 101.2%다', () => {
    const g = quiet(); applyBuild(g, { crit: 20 }); near(statsOf(g).critChance, 0.812);
    applyCharacter(g, 'normal'); near(statsOf(g).critChance, 1.012);
  });
  const chanceGame = chance => {
    const g = quiet();
    // 클로버 60% + 고양이 10% + 주사위 5% + 조준경 15% + 루비 15% = 105%.
    g.passives = { clover: 10, sights: 5 };
    g.relics = { neko: true, dice: true, rubyglass: true };
    applyBuild(g, { crit: 20 });
    // 실제 확률을 확인하여 난수 경계가 의도와 같은지 검사한다.
    assert.ok(statsOf(g).critChance > chance);
    return g;
  };
  it('정확히 100%에서는 난수 없이 치명타 한 번을 보장한다', () => {
    const g = quiet(); g.passives = { clover: 10, sights: 5 }; g.relics = { rubyglass: true, neko: true };
    near(statsOf(g).critChance, 1);
    // 숫자 위치와 처치 드롭 난수를 제외하고 순수 피해 계산만 실행한다.
    g.random = () => { throw new Error('100% 확률에 불필요한 추첨'); };
    const e = target(g, 300); damageEnemy(g, e, 10, false, g.player, 0, { hitEffects: false, showHit: false });
    near(e.maxHp - e.hp, 10 * statsOf(g).critDamage);
  });
  it('파쇄 렌즈를 얻으면 기존 반경 밖의 적도 치명 폭발에 맞는다', () => {
    const sample = lens => {
      const g = quiet(); applyBuild(g, { crit: 20 }); if (lens) g.passives.shatterlens = 5;
      g.random = () => 0;
      const source = target(g, 40), adjacent = target(g, 160);
      damageEnemy(g, source, 10, false, g.player, 0, { showHit: false });
      return adjacent.maxHp - adjacent.hp;
    };
    near(sample(false), 0); assert.ok(sample(true) > 0);
  });
  it('100% 초과분의 경계 양쪽에서 1중·2중 치명타가 갈리고 고정 피해는 한 번 더한다', () => {
    const g = chanceGame(1); const chance = statsOf(g).critChance;
    assert.ok(chance < 2);
    const sample = random => {
      g.random = () => random;
      const e = target(g, 300); damageEnemy(g, e, 10, false, g.player, 37, { showHit: false, hitEffects: false });
      return e.maxHp - e.hp;
    };
    near(sample(chance - 1 - 0.001), 98.4);
    near(sample(chance - 1 + 0.001), 72.7);
  });
  it('200% 이상이면 2중을 보장하며 추가 폭발·고정 피해는 재치명타가 없다', () => {
    const g = chanceGame(1); applyCharacter(g, 'normal'); g.passives.redink = 5;
    assert.ok(statsOf(g).critChance > 2); g.random = () => 0.99;
    const e = target(g, 300); damageEnemy(g, e, 10, false, g.player, 23, { hitEffects: false });
    near(e.maxHp - e.hp, 10 * (1 + (statsOf(g).critDamage - 1) * 2) + 23);
    const f = target(g, 600); damageEnemy(g, f, 23, false, g.player, 0, { canCrit: false, hitEffects: false });
    near(f.maxHp - f.hp, 23);
    assert.ok(g.effects.some(effect => effect.type === 'number' && effect.critTiers === 2));
  });
  it('운명의 실은 직접 타격 4회만 세며 고무망치 보유 시 비활성화한다', () => {
    const g = quiet(); g.relics.redthread = true;
    const e = target(g);
    for (let n = 0; n < 3; n++) damageEnemy(g, e, 10, false, g.player, 0, { showHit: false });
    damageEnemy(g, e, 10, false, g.player, 0, { hitEffects: false, showHit: false });
    assert.equal(g.threadHits, 3);
    const before = e.hp; damageEnemy(g, e, 10, false, g.player, 0, { showHit: false });
    near(before - e.hp, 15); assert.equal(g.threadHits, 4);
    g.relics.mallet = true; const hp = e.hp;
    for (let n = 0; n < 8; n++) damageEnemy(g, e, 10, false, g.player, 0, { showHit: false });
    near(hp - e.hp, 80); assert.equal(g.threadHits, 4);
  });
  it('운명의 실은 이미 치확 100%인 경우에도 네 번째 적중에 치명 단계를 더한다', () => {
    const g = quiet(); g.passives = { clover: 10, sights: 5 };
    g.relics = { rubyglass: true, neko: true, redthread: true };
    near(statsOf(g).critChance, 1);
    const e = target(g, 300);
    for (let n = 0; n < 3; n++) damageEnemy(g, e, 10, false, g.player, 0, { showHit: false });
    const before = e.hp;
    damageEnemy(g, e, 10, false, g.player, 19, { showHit: false });
    near(before - e.hp, 10 * (1 + (statsOf(g).critDamage - 1) * 2) + 19);
  });
});
