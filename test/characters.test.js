import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyBuild, applyCharacter, choose, createGame, maxRelicsOf, maxWeaponsOf, startWithRelic, statsOf, update } from '../src/engine.js';
import { CHARACTERS, PLAYER } from '../src/rules.js';
const DT = 1 / 60;
function quiet(character, weapons = {}) {
  const game = createGame(() => 0.99);
  applyCharacter(game, character);
  game.weapons = weapons;game.spawnCarry = -1e6;
  game.nextBossAt = game.nextSwarmAt = game.nextXp = Infinity;
  return game;
}
function target(game, dx = 60) {
  const enemy = { id: game.nextId++, kind: 'roach', x: game.player.x + dx, y: game.player.y,
    hp: 1e8, maxHp: 1e8, radius: 8, speed: 0, damage: 0, xp: 1, timer: 0, kx: 0, ky: 0 };
  game.enemies.push(enemy);return enemy;
}
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);

describe('특화 오리 캐릭터', () => {
  it('잘못된 캐릭터는 일반 오리로 복구하고 재적용해도 보너스가 누적되지 않는다', () => {
    const game = quiet('__proto__');assert.equal(game.character, 'normal');
    for (let n = 0; n < 5; n++) applyCharacter(game, 'normal');
    near(statsOf(game).critChance, 0.2);near(statsOf(game).critDamage, 1.85);
    applyCharacter(game, 'gunner');near(statsOf(game).critChance, 0);near(statsOf(game).critDamage, 1.5);
    near(statsOf(game).flatDamage, 8);
    assert.equal(Object.keys(CHARACTERS).length, 4);
  });
  it('일반 오리의 치명타 확률과 피해가 능력치·패시브와 합산되고 고무망치로도 전환된다', () => {
    const game = quiet('normal');applyBuild(game, { crit: 20 });
    near(statsOf(game).critChance, 0.2 + 20 * 0.004 * 1.4);
    near(statsOf(game).critDamage, PLAYER.critDamage + 0.35 + 20 * 0.015 * 1.4 + 0.5);
    applyBuild(game, {});game.relics.mallet = true;
    near(statsOf(game).critChance, 0);near(statsOf(game).flatDamage, 80);
  });
  it('소환사는 20점을 찍지 않아도 각 무기에 한 명을 더 부르고 용은 머리 대신 길이가 늘어난다', () => {
    const game = quiet('summoner', { robot: 1, sockpuppet: 1, toydragon: 1 });update(game, DT);
    assert.equal(game.robots.length, 2);
    assert.equal(game.summons.filter(unit => unit.weapon === 'sockpuppet').length, 2);
    const dragons = game.summons.filter(unit => unit.weapon === 'toydragon');
    assert.equal(dragons.length, 1);assert.equal(dragons[0].spine.length, 8);
    assert.equal(statsOf(game).summonCount, 1);
  });
  it('소환사와 증원 패시브는 합산되어 일반 소환수는 일곱 명씩, 청룡은 20마디다', () => {
    const ids = ['robot','sockpuppet','toydrone','windcar','plantspirit','toyknight','toydragon'];
    const game = quiet('summoner', Object.fromEntries(ids.map(id => [id, 5])));
    game.evolved = Object.fromEntries(ids.map(id => [id,true]));applyBuild(game, { summon:20 });game.passives.summonwhistle = 3;
    target(game, 240);update(game, DT);
    assert.equal(game.robots.length, 7);
    assert.equal(game.summons.length + game.robots.length, 43);
    assert.equal(game.summons.find(unit => unit.weapon === 'toydragon').spine.length, 20);
  });
  it('트레저헌터는 보물만 한 칸 늘리고 시작 보물 개수와 무기 제한은 그대로다', () => {
    const game = quiet('hunter');assert.equal(maxRelicsOf(game), 4);
    startWithRelic(game);assert.equal(game.pendingRelics, 1);
    const weapons = maxWeaponsOf(game);applyBuild(game, { treasure:20 });
    assert.equal(maxRelicsOf(game), 7);
    const baseline = quiet('normal');applyBuild(baseline, { treasure:20 });assert.equal(maxWeaponsOf(game), maxWeaponsOf(baseline));
    applyBuild(game, {});assert.equal(maxWeaponsOf(game), weapons);
  });
  it('트레저헌터의 네 번째 보물은 바로 받고 다섯 번째부터 교체를 선택한다', () => {
    const game = quiet('hunter');game.relics = { waterbottle:true, stopwatch:true, magnet:true };
    game.pendingRelics = 1;game.choices = [{ kind:'relic', id:'piggy', label:'저금통' }];choose(game, 0);
    assert.equal(game.relics.piggy, true);
    game.pendingRelics = 1;game.choices = [{ kind:'relic', id:'clothespin', label:'빨래집게' }];choose(game, 0);
    assert.ok(game.choices.every(choice => choice.kind === 'relic-swap' || choice.kind === 'relic-keep'));
    assert.equal(Object.keys(game.relics).length, 4);
  });
  it('총잡이 공속은 다른 공속과 곱해지고 고정 피해는 직접 타격에 한 번만 추가한다', () => {
    const game = quiet('gunner');near(statsOf(game).cooldownScale, 1 / 1.15);
    applyBuild(game, { haste:20 });const baseline = quiet('hunter');applyBuild(baseline, { haste:20 });
    near(statsOf(game).cooldownScale, statsOf(baseline).cooldownScale / 1.15);
    const enemy = target(game);
    game.passives = { protein:10, clover:10 };game.random = () => 0;
    game.shots.push({ x:enemy.x,y:enemy.y,vx:0,vy:0,damage:10,radius:4,life:1,pierce:0,hit:new Set() });
    update(game, DT);
    near(enemy.maxHp - enemy.hp, 10 * statsOf(game).critDamage + 8);
  });
  it('총잡이 고정 피해는 지속 피해에 붙지 않고 정밀 저울의 강화만 받는다', () => {
    const game = quiet('gunner', { dehumidifier:1 }), enemy = target(game, 40);
    update(game, 0.1);near(enemy.maxHp - enemy.hp, 18 * 0.1);
    game.relics.precisionscale = true;near(statsOf(game).flatDamage, (8 + 20) * 1.25);
  });
});
