import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyBuild, applyCharacter, armyMaxHp, armyUsed, choose, createGame, openSoulShop, ritualCost, rollChoices, update } from '../src/engine.js';
import { ARMY, COMMANDS, NECRO_RELICS, RITUALS } from '../src/rules.js';

const DT = 1 / 60;
function quiet() {
  const game = createGame(() => 0.99);
  applyCharacter(game, 'necromancer');
  game.weapons = {};
  game.spawnCarry = -1e9;
  game.nextBossAt = game.nextXp = Infinity;
  return game;
}
function unit(game, type = 'soldier', dx = 100, dy = 0) {
  const hp = armyMaxHp(game, type);
  const ally = { id: game.nextId++, type, x: game.player.x + dx, y: game.player.y + dy, hp, maxHp: hp,
    attackIn: 1e9, facing: 1, swingAt: -1, slot: 0 };
  game.army.push(ally);
  return ally;
}
function enemy(game, dx = 100, damage = 20) {
  const foe = { id: game.nextId++, kind: 'roach', x: game.player.x + dx, y: game.player.y,
    hp: 1e6, maxHp: 1e6, speed: 0, radius: 10, damage, xp: 0, timer: 0, kx: 0, ky: 0 };
  game.enemies.push(foe);
  return foe;
}
function shot(game, dx, vx, damage = 20) {
  game.enemyShots.push({ x: game.player.x + dx, y: game.player.y, vx, vy: 0, life: 1, radius: 3, damage, kind: 'rust' });
}

describe('괴담 소환수 체력과 의식 비용', () => {
  it('모집한 병사와 궁수는 최대 체력을 가득 채우고 나온다', () => {
    for (const id of ['soldier', 'archer']) {
      const game = quiet(); game.souls = 100;
      openSoulShop(game);
      choose(game, game.choices.findIndex(choice => choice.kind === 'soul' && choice.id === id));
      assert.equal(game.army.length, 2);
      for (const ally of game.army) {
        assert.equal(ally.hp, ARMY[id].hp);
        assert.equal(ally.maxHp, ARMY[id].hp);
      }
    }
  });

  it('접촉 피해는 체력을 깎고 0.5초 동안의 연속 접촉은 중복되지 않는다', () => {
    const game = quiet(), ally = unit(game);
    enemy(game);
    const full = ally.hp;
    update(game, DT);
    assert.equal(ally.hp, full - 20);
    for (let n = 0; n < 20; n++) update(game, DT);
    assert.equal(ally.hp, full - 20);
    for (let n = 0; n < 12; n++) update(game, DT);
    assert.equal(ally.hp, full - 40);
  });

  it('빙결된 적과 닿아도 소환수는 접촉 피해를 받지 않는다', () => {
    const game = quiet(), ally = unit(game);
    enemy(game); game.freezeUntil = 5;
    update(game, DT);
    assert.equal(ally.hp, ally.maxHp);
  });

  it('양말 냄새는 가까운 소환수만 맞히고 멀리 떨어진 오리에게 피해를 주지 않는다', () => {
    const game = quiet(), ally = unit(game, 'soldier', 220);
    const sock = enemy(game, 260, 0); sock.kind = 'sock'; sock.timer = 2;
    const hp = game.player.hp;
    update(game, DT);
    assert.ok(ally.hp < ally.maxHp);
    assert.equal(game.player.hp, hp);
  });

  it('체력이 다한 해골은 사라져 병력 칸이 반환되고 영혼은 생기지 않는다', () => {
    const game = quiet(), ally = unit(game);
    enemy(game, 100, 10000);
    const souls = game.souls, kills = game.kills;
    assert.equal(armyUsed(game), 1);
    update(game, DT);
    assert.equal(ally.hp, 0);
    assert.equal(game.army.length, 0);
    assert.equal(armyUsed(game), 0);
    assert.equal(game.souls, souls);
    assert.equal(game.kills, kills);
  });

  it('빠른 탄환도 앞에 있는 해골에 막히고 뒤의 오리에게 닿지 않는다', () => {
    const game = quiet(), ally = unit(game);
    const playerHp = game.player.hp;
    shot(game, 200, -18000);
    update(game, DT);
    assert.equal(ally.hp, ally.maxHp - 20);
    assert.equal(game.player.hp, playerHp);
    assert.equal(game.enemyShots.length, 0);
  });

  it('탄환 경로에서 오리가 먼저면 뒤쪽 해골이 대신 막지 않는다', () => {
    const game = quiet(), ally = unit(game);
    const hp = game.player.hp;
    shot(game, -150, 18000);
    update(game, DT);
    assert.ok(game.player.hp < hp);
    assert.equal(ally.hp, ally.maxHp);
  });

  it('폭발과 증기 공격은 범위 안의 해골을 함께 맞힌다', () => {
    for (const line of [false, true]) {
      const game = quiet(), ally = unit(game);
      game.hazards.push({ x: game.player.x + 100, y: game.player.y, delay: DT, total: DT,
        radius: 25, damage: 30, line, angle: 0, length: 150 });
      update(game, DT);
      assert.equal(ally.hp, ally.maxHp - 30);
    }
  });

  it('단단한 뼈는 레벨업에 나오고 기존 병력의 체력 비율을 보존한다', () => {
    const game = quiet(), ally = unit(game);
    ally.hp /= 2;
    for (const id of Object.keys(COMMANDS)) if (id !== 'vigor') game.commands[id] = 5;
    let seed = 3;
    game.random = () => ((seed = seed * 16807 % 2147483647) / 2147483647);
    let offer;
    for (let n = 0; n < 40 && !offer; n++) offer = rollChoices(game).find(choice => choice.kind === 'command' && choice.id === 'vigor');
    assert.ok(offer);
    game.choices = [offer]; choose(game, 0);
    assert.equal(ally.maxHp, Math.round(ARMY.soldier.hp * 1.2));
    assert.equal(ally.hp / ally.maxHp, 0.5);
    game.choices = [{ kind: 'command', id: 'vigor', level: 5 }]; choose(game, 0);
    assert.equal(ally.maxHp, ARMY.soldier.hp * 2);
    assert.equal(ally.hp / ally.maxHp, 0.5);
  });

  it('캐릭터 레벨 상승은 모든 군단의 최대 체력을 늘리되 완전히 회복시키지 않는다', () => {
    const game = quiet();
    for (const type of Object.keys(ARMY)) { const ally = unit(game, type); ally.hp /= 2; }
    game.level = 26;
    update(game, DT);
    for (const ally of game.army) {
      assert.equal(ally.maxHp, ARMY[ally.type].hp * 2);
      assert.equal(ally.hp / ally.maxHp, 0.5);
    }
  });

  it('좀비도 체력 강화를 받고 체력이 다하면 수명 전에도 사라진다', () => {
    const game = quiet();
    game.necroRelics.gravesoil = true; game.commands.vigor = 5;
    const ghoul = { id: game.nextId++, kind: 'roach', x: game.player.x + 100, y: game.player.y,
      radius: 10, life: 7, total: 7, attackIn: 1e9, facing: 1, damageScale: 1 };
    game.ghouls.push(ghoul);
    update(game, DT);
    assert.equal(ghoul.hp, NECRO_RELICS.gravesoil.hp * 2);
    enemy(game, 100, 10000);
    update(game, DT);
    assert.equal(ghoul.hp, 0);
    assert.equal(game.ghouls.length, 0);
  });

  it('모든 의식은 낮춘 비용으로 살아 있는 재료만 소비하고 새 유닛을 완전한 체력으로 만든다', () => {
    for (const [id, ritual] of Object.entries(RITUALS)) {
      const game = quiet(); game.souls = ritual.souls;
      for (const [type, amount] of Object.entries(ritual.cost)) for (let n = 0; n < amount; n++) unit(game, type);
      const used = armyUsed(game);
      openSoulShop(game);
      const offer = game.choices.findIndex(choice => choice.kind === 'ritual' && choice.id === id);
      assert.ok(offer >= 0, id);
      choose(game, offer);
      assert.equal(game.souls, 0);
      const born = game.army.find(ally => ally.type === id);
      assert.ok(born, id);
      assert.equal(born.hp, born.maxHp);
      assert.equal(born.maxHp, ARMY[id].hp);
      assert.equal(armyUsed(game), used);
    }
  });

  it('쓰러진 재료는 의식 조건에 들지 않고 20점 할인은 최소 한 명을 남긴다', () => {
    const game = quiet(); game.souls = 1e6;
    for (let n = 0; n < RITUALS.giant1.cost.soldier; n++) unit(game);
    game.army[0].hp = 0;
    openSoulShop(game);
    assert.ok(!game.choices.some(choice => choice.kind === 'ritual' && choice.id === 'giant1'));
    applyBuild(game, { necro: 20 });
    for (const id of Object.keys(RITUALS)) for (const count of Object.values(ritualCost(game, id))) assert.ok(count >= 1);
  });
});
