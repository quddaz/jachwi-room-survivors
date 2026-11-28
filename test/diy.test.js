import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyBuild, applyCharacter, choose, createGame, rollChoices, rollRelics, update } from '../src/engine.js';
import { DIY_RELICS, STRUCTURES, STRUCTURE_DEPLOY_SEC, STRUCTURE_EVOLUTIONS, STRUCTURE_FUSIONS, STRUCTURE_LIFE } from '../src/rules.js';

const DT = 1 / 60;
const run = (game, seconds) => { for (let step = 0; step < Math.round(seconds * 60); step += 1) update(game, DT); };

function quiet(builds = { nailgun: 1 }) {
  const game = createGame(() => 0.5);
  applyCharacter(game, 'diy');
  game.weapons = {};
  game.builds = builds;
  game.spawnCarry = -100000;
  game.nextXp = 1e9;
  game.nextBossAt = Infinity;
  return game;
}

function add(game, dx, dy = 0, extra = {}) {
  const enemy = { id: game.nextId++, kind: 'roach', x: game.player.x + dx, y: game.player.y + dy, hp: 1e6, maxHp: 1e6,
    speed: 0, radius: 10, damage: 0, xp: 0, timer: 0, kx: 0, ky: 0, ...extra };
  game.enemies.push(enemy);
  return enemy;
}

describe('집돌이 오리', () => {
  it('레벨업에서 무기 대신 설치물과 패시브만 나온다', () => {
    const game = quiet();
    for (let n = 0; n < 10; n += 1) {
      for (const choice of rollChoices(game)) assert.ok(['structure', 'passive', 'heal'].includes(choice.kind));
    }
  });

  it('남은 설치물이 있으면 레벨업마다 설치물이 둘까지 나온다', () => {
    const game = quiet();
    const choices = rollChoices(game);
    assert.equal(choices.filter(choice => choice.kind === 'structure').length, 2);
  });

  it('설치물을 고르면 레벨이 오르고, 설치물은 오리 발밑에 저절로 깔린다', () => {
    const game = quiet({});
    game.choices = [{ kind: 'structure', id: 'trap', level: 1, label: '', description: '' }];
    choose(game, 0);
    assert.equal(game.builds.trap, 1);
    update(game, DT);
    assert.equal(game.structures.length, 1);
    assert.equal(game.structures[0].type, 'trap');
  });

  it('동시에 깔 수 있는 수만큼 다시 깔고, 수명이 다하면 해체된다', () => {
    const game = quiet({ nailgun: 5 });
    run(game, STRUCTURE_DEPLOY_SEC * 3);
    assert.equal(game.structures.length, STRUCTURES.nailgun.count[4]);
    const first = game.structures[0].id;
    run(game, STRUCTURE_LIFE);
    assert.ok(!game.structures.some(piece => piece.id === first));
  });

  it('못총 포탑은 못을 쏘고, 전기 탑은 여러 적을 잇고, 박격포는 넓게 터진다', () => {
    const game = quiet({ nailgun: 1, tesla: 5, mortar: 1 });
    const enemies = [add(game, 120), add(game, 180, 30), add(game, 230, -20), add(game, 260)];
    run(game, STRUCTURE_DEPLOY_SEC * 2 + 1.5);
    assert.ok(enemies.filter(enemy => enemy.hp < enemy.maxHp).length >= 3);
    assert.ok(game.effects.some(effect => effect.type === 'bolt') || enemies.every(enemy => enemy.hp < enemy.maxHp));
  });

  it('끈끈이 덫은 밟은 적을 느리게 하고, 택배 상자 벽은 주변 적을 끌어당긴다', () => {
    const game = quiet({ trap: 1, barricade: 1 });
    run(game, STRUCTURE_DEPLOY_SEC + 0.1);
    const trap = game.structures.find(piece => piece.type === 'trap');
    const wall = game.structures.find(piece => piece.type === 'barricade');
    assert.ok(trap && wall);
    const stuck = add(game, trap.x - game.player.x, trap.y - game.player.y);
    const lured = add(game, wall.x - game.player.x + 100, wall.y - game.player.y, { speed: 40 });
    run(game, 0.6);
    assert.ok(stuck.hp < stuck.maxHp);
    assert.ok(game.time < (stuck.slowUntil ?? 0));
    assert.equal(lured.tauntBy, wall);
  });

  it('Lv 5 설치물은 완성형이, 두 완성형을 갖추면 합체가 레벨업 첫 칸에 나온다', () => {
    const game = quiet({ nailgun: 5, tesla: 5 });
    game.choices = rollChoices(game);
    assert.equal(game.choices[0].kind, 'build-evolve');
    game.buildEvolved = { nailgun: true, tesla: true };
    game.choices = rollChoices(game);
    assert.equal(game.choices[0].kind, 'build-fusion');
    assert.equal(game.choices[0].id, 'zapgun');
    choose(game, 0);
    assert.ok(game.buildFusions.zapgun);
  });

  it('공구 보물은 희귀 풀에서만 추첨되고, 공구함은 설치물을 하나 더 깐다', () => {
    const game = quiet({ nailgun: 1 });
    assert.ok(rollRelics(game).every(offer => offer.kind === 'relic'));
    game.random = () => 0.72;
    const offers = rollRelics(game);
    assert.ok(offers.some(offer => offer.kind === 'relic-diy' && offer.rarity === 'rare'));
    game.diyRelics = { toolbox: true };
    assert.ok(rollRelics(game).every(offer => offer.id !== 'toolbox'));
    run(game, STRUCTURE_DEPLOY_SEC * 2 + 0.2);
    assert.equal(game.structures.length, STRUCTURES.nailgun.count[0] + DIY_RELICS.toolbox.extra);
  });

  it('설치물은 소환으로 쳐서 소환 피해와 추가 소환수를 받는다', () => {
    const hit = (build) => {
      const game = quiet({ nailgun: 1 });
      applyBuild(game, build);
      const enemy = add(game, 150);
      run(game, 1.5);
      return enemy.maxHp - enemy.hp;
    };
    assert.ok(hit({ summon: 20 }) > hit({}) * 1.3);
  });

  it('완성형 박격포는 폭탄 셋을 쏘고, 끈끈이 폭탄은 떨어진 자리에 덫을 남긴다', () => {
    const game = quiet({ mortar: 5, trap: 5 });
    game.buildEvolved = { mortar: true, trap: true };
    game.buildFusions = { stickybomb: true };
    for (let n = 0; n < 12; n += 1) add(game, 150 + n * 15, (n % 3) * 30);
    run(game, STRUCTURE_DEPLOY_SEC + 0.5);
    run(game, 1.2);
    assert.ok(game.structures.some(piece => piece.temp && piece.type === 'trap'));
  });

  it('전기 못총은 못이 맞힐 때 주변 적에게 전기를 튀긴다', () => {
    const game = quiet({ nailgun: 5, tesla: 1 });
    game.buildEvolved = { nailgun: true };
    game.buildFusions = { zapgun: true };
    game.builds = { nailgun: 5 };
    const near1 = add(game, 160);
    const side = add(game, 160, 70);
    run(game, 1.5);
    assert.ok(side.hp < side.maxHp && near1.hp < near1.maxHp);
  });
});
