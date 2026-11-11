import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyBuild, choose, createGame, declineChoice, reroll, startWithRelic, update } from '../src/engine.js';
import { MAX_WEAPONS, WEAPONS } from '../src/rules.js';

describe('안 고를래요', () => {
  it('시작 보물을 받지 않고 게임을 시작한다', () => {
    const game = createGame();
    startWithRelic(game);
    assert.equal(declineChoice(game), true);
    assert.deepEqual(game.relics, {});
    assert.equal(game.pendingRelics, 0);
    assert.equal(game.choices, null);
    assert.equal(declineChoice(game), false);
    update(game, 1 / 60);
    assert.ok(game.time > 0);
  });

  it('상자 두 개와 경험치를 함께 얻으면 보물과 강화를 차례대로 하나씩 넘긴다', () => {
    const game = createGame();
    game.xp = game.nextXp;
    game.drops.push(...Array.from({ length: 2 }, () => ({ type: 'chest', x: game.player.x, y: game.player.y })));
    update(game, 1 / 60);
    assert.equal(game.pendingRelics, 2);
    assert.equal(game.pendingLevels, 1);
    assert.ok(reroll(game));
    const firstOffer = game.choices;
    declineChoice(game);
    assert.equal(game.pendingRelics, 1);
    assert.equal(game.pendingLevels, 1);
    assert.notEqual(game.choices, firstOffer);
    assert.ok(game.choices.every((card) => card.kind === 'relic'));
    assert.equal(game.rerollLeft, 1);
    declineChoice(game);
    assert.equal(game.pendingRelics, 0);
    assert.equal(game.pendingLevels, 1);
    assert.ok(game.choices.every((card) => card.kind === 'passive' || card.kind === 'weapon'));
    declineChoice(game);
    assert.equal(game.choices, null);
    assert.equal(game.level, 2);
    assert.equal(game.pendingLevels, 0);
    assert.deepEqual(game.relics, {});
    assert.deepEqual(game.weapons, { spray: 1 });
    assert.deepEqual(game.passives, {});
  });

  it('보물 교체 중 거절하면 기존 보물과 상자 특전만 남는다', () => {
    const game = createGame();
    applyBuild(game, { item: 20 });
    const relics = { waterbottle: true, magnet: true, dice: true };
    game.relics = { ...relics };
    game.drops.push({ type: 'chest', x: game.player.x, y: game.player.y });
    update(game, 1 / 60);
    reroll(game);
    choose(game, 0);
    assert.equal(game.choices[0].kind, 'relic-swap');
    declineChoice(game);
    assert.deepEqual(game.relics, relics);
    assert.equal(game.swapIn, null);
    assert.equal(game.pendingRelics, 0);
    assert.equal(game.pendingLevels, 1);
    assert.equal(game.rerollLeft, 2);
    choose(game, 0);
    assert.equal(game.choices, null);
  });

  it('무기 교체 중 거절하면 기존 무기를 유지하고 다음 강화로 넘어간다', () => {
    const game = createGame();
    const owned = Object.keys(WEAPONS).slice(0, MAX_WEAPONS);
    const weapons = Object.fromEntries(owned.map((id) => [id, 2]));
    const fresh = Object.keys(WEAPONS).find((id) => !weapons[id]);
    game.weapons = { ...weapons };
    game.pendingLevels = 2;
    const offer = [{ kind: 'weapon', id: fresh, level: 1, label: WEAPONS[fresh].label }];
    game.choices = offer;
    game.rerollLeft = 0;
    choose(game, 0);
    assert.equal(game.choices[0].kind, 'weapon-swap');
    declineChoice(game);
    assert.deepEqual(game.weapons, weapons);
    assert.equal(game.weaponSwap, null);
    assert.equal(game.pendingLevels, 1);
    assert.notEqual(game.choices, offer);
    assert.equal(game.choices.length, 3);
    assert.equal(game.rerollLeft, 1);
  });
});
