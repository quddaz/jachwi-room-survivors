import assert from 'node:assert/strict';
import { it } from 'node:test';
import { createGame, update, activeWeapon, rollChoices, choose, statsOf } from '../src/engine.js';
import { WEAPONS, EVOLUTIONS, FUSIONS } from '../src/rules.js';
import { ITEM_IDS } from '../src/sprites.js';
const ids = ["papercrane", "cactus", "chessrook", "plushbear", "toyaxe", "coin", "handbell", "compass", "seal", "hourglass"];
function scenario(id, evolved = false, fused = false) {
  const game = createGame(() => .99);
  game.weapons = { [id]: evolved ? 5 : 1 }; game.evolved = evolved ? { [id]: true } : {};
  game.spawnCarry = -1e9; game.nextBossAt = game.nextSwarmAt = game.nextXp = Infinity;
  if (fused) {
    const [fid, recipe] = Object.entries(FUSIONS).find(([,r]) => r.primary === id);
    game.weapons[recipe.from[1]] = 5; game.evolved[recipe.from[1]] = true; game.fusions[fid] = true;
  }
  for (let n = 0; n < 12; n++) {
    const angle = n / 12 * Math.PI * 2;
    game.enemies.push({ id: game.nextId++, kind: 'roach', x: game.player.x + Math.cos(angle)*100, y: game.player.y + Math.sin(angle)*100,
      hp: 1e8, maxHp: 1e8, radius: 12, speed: 0, damage: 0, xp: 0, timer: 0, kx: 0, ky: 0 });
  }
  return game;
}
function simulate(game) {
  for (let n = 0; n < 360; n++) update(game, 1/60);
  assert.ok(game.enemies.every(e => Number.isFinite(e.hp)));
  return game.enemies.reduce((sum,e) => sum + e.maxHp - e.hp, 0);
}
for (const id of ids) {
  it(`${id}: 기본·완성형·합체가 실제 공격하고 합체는 재료 공격을 대체한다`, () => {
    assert.equal(WEAPONS[id].damage.length, 5);
    assert.ok(ITEM_IDS.includes(id)); assert.ok(ITEM_IDS.includes(EVOLUTIONS[id].icon));
    assert.ok(simulate(scenario(id)) > 0);
    const evolved = simulate(scenario(id, true));
    const game = scenario(id, true, true);
    const fusedDamage = simulate(game);
    assert.ok(fusedDamage > evolved, '합체는 완성형보다 강해야 한다');
    const pair = scenario(id, true, true); pair.fusions = {};
    assert.ok(fusedDamage > simulate(pair), '합체는 재료 둘의 독립 공격보다 강해야 한다');
    const [fid, recipe] = Object.entries(FUSIONS).find(([,r]) => r.primary === id);
    assert.ok(ITEM_IDS.includes(recipe.icon));
    const secondary = recipe.from[1];
    assert.equal(activeWeapon(game, secondary), false);
    assert.ok(game.summons.every(u => u.weapon !== secondary));
    assert.ok(game.shots.every(s => s.weapon !== secondary));
    const offered = scenario(id, true, true); offered.fusions = {};
    const choice = rollChoices(offered).find(c => c.kind === 'fusion' && c.id === fid);
    assert.ok(choice); offered.choices = [choice]; choose(offered, 0);
    assert.equal(offered.fusions[fid], true);
  });
}
it('보물 무기는 보물 피해 배율을, 소환 무기는 증원 수를 따른다', () => {
  const base = scenario('handbell'), boosted = scenario('handbell'); boosted.passives.polish = 5;
  assert.ok(statsOf(boosted).relicPower > statsOf(base).relicPower);
  assert.ok(simulate(boosted) > simulate(base));
  const summon = scenario('papercrane'); summon.passives.summonwhistle = 3;
  simulate(summon);
  assert.equal(summon.summons.length, WEAPONS.papercrane.count[0] + statsOf(summon).summonCount);
});

it('보물 20점에서도 새 보물 무기를 한 칸에 장착하고 완성형으로 올릴 수 있다', () => {
  const game = scenario('coin'); game.build = { treasure: 20, summon: 0, crit: 0, haste: 10 };
  for (let level = 2; level <= 5; level++) {
    game.choices = [{ kind: 'weapon', id: 'coin', level }]; choose(game, 0);
  }
  game.choices = [{ kind: 'evolve', id: 'coin' }]; choose(game, 0);
  assert.equal(game.evolved.coin, true); assert.equal(Object.keys(game.weapons).length, 1);
  assert.ok(simulate(game) > 0);
});
