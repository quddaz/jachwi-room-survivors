import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyCharacter, soulGrowth, armyCap, armyUsed, choose, createGame, declineChoice, openSoulShop, recruitPrice, reroll, rollChoices, rollRelics, update, wraithOrbiters } from '../src/engine.js';
import { ARMY, ARMY_CAP, COMMANDS, NECRO_RELICS, RECRUITS, RITUALS, SOULS, UNDEAD, UNDEAD_EVOLUTIONS } from '../src/rules.js';

const DT = 1 / 60;

function quiet(character = 'necromancer', random = () => 0.99) {
  const game = createGame(random);
  applyCharacter(game, character);
  game.weapons = {};
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

function kill(game, enemy) {
  enemy.hp = 1;
  game.weapons = { spray: 5 };
  for (let step = 0; step < 240 && !enemy.dead; step += 1) update(game, DT);
  game.weapons = {};
}

function recruitSoldiers(game, count) {
  for (let n = 0; n < count; n += 1) game.army.push({ id: game.nextId++, type: 'soldier', x: game.player.x, y: game.player.y,
    hp: ARMY.soldier.hp, maxHp: ARMY.soldier.hp, attackIn: 0, facing: 1, swingAt: -1, slot: n });
}

const run = (game, seconds) => { for (let step = 0; step < Math.round(seconds * 60); step += 1) update(game, DT); };

describe('영혼', () => {
  it('적을 처치하면 일반 1, 정예 5, 보스 30개의 영혼을 얻는다', () => {
    for (const [extra, souls] of [[{}, SOULS.normal], [{ elite: true }, SOULS.elite], [{ boss: true }, SOULS.boss]]) {
      const game = quiet();
      kill(game, add(game, 60, 0, extra));
      assert.equal(game.souls, souls);
    }
  });

  it('다른 오리는 영혼을 얻지 않고 영혼 창도 열 수 없다', () => {
    const game = quiet('normal');
    game.souls = 100;
    kill(game, add(game, 60));
    assert.equal(game.souls, 100);
    assert.equal(openSoulShop(game), false);
  });

  it('영혼 항아리는 영혼을 50% 더 모으고 끝수는 다음 처치로 넘긴다', () => {
    const game = quiet();
    game.necroRelics = { soulurn: true };
    kill(game, add(game, 60));
    kill(game, add(game, 60));
    assert.equal(game.souls, 3);
  });
});

describe('영혼 창', () => {
  it('영혼이 모여도 저절로 열리지 않고 R로 연다', () => {
    const game = quiet();
    game.souls = 100;
    update(game, DT);
    assert.equal(game.choices, null);
    assert.ok(openSoulShop(game));
    assert.ok(game.shop);
    assert.equal(reroll(game), false);
  });

  it('모집하면 영혼을 내고 병사 2명이 들어오며 병력 칸을 쓴다', () => {
    const game = quiet();
    game.souls = RECRUITS.soldier.price;
    openSoulShop(game);
    assert.deepEqual(game.choices.map(choice => choice.id), ['soldier', 'leave']);
    choose(game, 0);
    assert.equal(game.army.filter(unit => unit.type === 'soldier').length, RECRUITS.soldier.amount);
    assert.equal(armyUsed(game), RECRUITS.soldier.amount);
    assert.equal(game.souls, 0);
    assert.equal(game.shop, false);
    assert.equal(game.choices, null);
  });

  it('병력 칸이 남은 만큼만 들어오고, 가득 차면 모집이 나오지 않는다', () => {
    const game = quiet();
    recruitSoldiers(game, ARMY_CAP - 2);
    game.souls = 100;
    openSoulShop(game);
    choose(game, game.choices.findIndex(choice => choice.id === 'soldier'));
    assert.equal(armyUsed(game), ARMY_CAP);
    openSoulShop(game);
    assert.ok(game.choices.every(choice => choice.kind !== 'soul'));
  });

  it('값싼 뼈와 뼈 피리는 모집 비용을 줄인다', () => {
    const game = quiet();
    game.commands = { thrift: 5 };
    game.necroRelics = { bonepipe: true };
    assert.equal(recruitPrice(game, 'soldier'), Math.round(RECRUITS.soldier.price * (1 - 0.7)));
  });

  it('레벨업이나 보물을 고르는 중에는 열리지 않는다', () => {
    const game = quiet();
    game.pendingLevels = 1;
    update(game, DT);
    assert.equal(openSoulShop(game), false);
    declineChoice(game);
    assert.ok(openSoulShop(game));
    declineChoice(game);
    assert.equal(game.shop, false);
  });
});

describe('해골 군단', () => {
  it('병사는 적을 둘러싸 베고, 적에게 맞아도 쓰러지지 않는다', () => {
    const game = quiet();
    recruitSoldiers(game, 3);
    const enemy = add(game, 120, 0, { damage: 30 });
    run(game, 4);
    assert.ok(enemy.hp < enemy.maxHp);
    assert.equal(game.army.length, 3);
  });

  it('오리와 멀어진 해골은 오리보다 빠르게 따라붙는다', () => {
    const game = quiet();
    recruitSoldiers(game, 1);
    game.army[0].x = game.player.x + 400;
    run(game, 1);
    assert.ok(Math.hypot(game.army[0].x - game.player.x, game.army[0].y - game.player.y) < 400 - 200 * 1.3);
  });

  it('궁수는 멀리서 화살을 쏜다', () => {
    const game = quiet();
    game.army.push({ id: game.nextId++, type: 'archer', x: game.player.x, y: game.player.y, hp: 22, maxHp: 22, attackIn: 0, facing: 1, swingAt: -1, slot: 0 });
    const enemy = add(game, 200);
    run(game, 2);
    assert.ok(enemy.hp < enemy.maxHp);
    assert.ok(Math.hypot(game.army[0].x - enemy.x, game.army[0].y - enemy.y) > 100);
  });

  it('지휘 능력은 병력 한도와 얻는 영혼을 올린다', () => {
    const game = quiet();
    game.choices = [{ kind: 'command', id: 'harvest', level: 5, label: '', description: '' }];
    choose(game, 0);
    game.souls = 0;
    for (let n = 0; n < 5; n += 1) kill(game, add(game, 60));
    assert.ok(game.souls >= 6);
    game.commands.legion = 2;
    assert.equal(armyCap(game), ARMY_CAP + COMMANDS.legion.cap[1]);
  });
});

describe('레벨업', () => {
  it('무기 없이 강령술, 지휘 능력, 일반 패시브만 나온다', () => {
    let seed = 7;
    const game = quiet('necromancer', () => ((seed = (seed * 16807) % 2147483647) / 2147483647));
    game.undead = { bone: 1 };
    const kinds = new Set();
    for (let n = 0; n < 40; n += 1) rollChoices(game).forEach(choice => kinds.add(choice.kind));
    assert.deepEqual([...kinds].sort(), ['command', 'passive', 'undead']);
  });
});

describe('의식', () => {
  it('병사와 영혼이 충분하면 영혼 창에 의식이 먼저 나오고, 바치면 골렘이 생긴다', () => {
    const game = quiet();
    recruitSoldiers(game, RITUALS.giant1.cost.soldier + 1);
    game.souls = RITUALS.giant1.souls;
    openSoulShop(game);
    assert.equal(game.choices[0].kind, 'ritual');
    assert.equal(game.choices[0].id, 'giant1');
    choose(game, 0);
    assert.equal(game.army.filter(unit => unit.type === 'soldier').length, 1);
    assert.equal(game.army.filter(unit => unit.type === 'giant1').length, 1);
    assert.equal(armyUsed(game), 1 + ARMY.giant1.cap);
    assert.equal(game.souls, 0);
  });

  it('영혼이 모자라면 의식이 나오지 않는다', () => {
    const game = quiet();
    recruitSoldiers(game, RITUALS.giant1.cost.soldier + 1);
    game.souls = RITUALS.giant1.souls - 1;
    openSoulShop(game);
    assert.ok(game.choices.every(choice => choice.kind !== 'ritual'));
  });

  it('골렘은 병사를 더 바쳐 거인, 군주로 자란다', () => {
    const game = quiet();
    recruitSoldiers(game, RITUALS.giant1.cost.soldier + RITUALS.giant2.cost.soldier + RITUALS.giant3.cost.soldier);
    for (const id of ['giant1', 'giant2', 'giant3']) {
      game.souls = RITUALS[id].souls;
      openSoulShop(game);
      const index = game.choices.findIndex(choice => choice.kind === 'ritual' && choice.id === id);
      assert.ok(index >= 0, id);
      choose(game, index);
    }
    assert.deepEqual(game.army.map(unit => unit.type), ['giant3']);
  });

  it('보물 상자에는 의식이 나오지 않고 강령 보물이 먼저 나온다', () => {
    const game = quiet();
    recruitSoldiers(game, 16);
    const offers = rollRelics(game);
    assert.ok(offers.every(choice => choice.kind !== 'ritual'));
    assert.equal(offers[0].kind, 'relic-necro');
  });

  it('거인은 주변 적을 끌어당겨 내리친다', () => {
    const game = quiet();
    game.army.push({ id: game.nextId++, type: 'giant2', x: game.player.x + 150, y: game.player.y, hp: 1800, maxHp: 1800, attackIn: 0, facing: 1, swingAt: -1, slot: 0 });
    const enemy = add(game, 260, 0, { speed: 80 });
    run(game, 3);
    assert.ok(enemy.hp < enemy.maxHp);
  });

  it('강령 보물: 묘지 흙은 쓰러진 적을 구울로 세우고 시체 폭탄은 시체를 터뜨린다', () => {
    const game = quiet('necromancer', () => 0);
    game.necroRelics = { gravesoil: true, corpsebomb: true };
    const neighbor = add(game, 230);
    kill(game, add(game, 200));
    assert.equal(game.ghouls.length, 1);
    assert.equal(game.corpses.length, 1);
    run(game, NECRO_RELICS.corpsebomb.fuseSec + 0.2);
    assert.ok(neighbor.hp < neighbor.maxHp);
  });
});

describe('강령술', () => {
  it('뼈 투척은 관통하는 뼈를 던진다', () => {
    const game = quiet();
    game.undead = { bone: 1 };
    const first = add(game, 100);
    const second = add(game, 140);
    run(game, 1);
    assert.ok(first.hp < first.maxHp && second.hp < second.maxHp);
  });

  it('망령은 오리 둘레를 돌며 닿은 적을 느리게 한다', () => {
    const game = quiet();
    game.undead = { wraith: 1 };
    const enemy = add(game, UNDEAD.wraith.orbit[0], 0);
    run(game, 3);
    assert.equal(wraithOrbiters(game).length, UNDEAD.wraith.count[0]);
    assert.ok(enemy.hp < enemy.maxHp);
  });

  it('리치의 낫은 가진 영혼이 많을수록 세게 벤다', () => {
    const lost = (souls) => {
      const game = quiet();
      game.undead = { scythe: 1 };
      game.souls = souls;
      const enemy = add(game, 40);
      run(game, 0.5);
      return enemy.maxHp - enemy.hp;
    };
    assert.ok(lost(50) > lost(0) * 1.4);
  });
});

describe('지휘 패시브', () => {
  const swings = (commands) => {
    const game = quiet();
    game.commands = commands;
    recruitSoldiers(game, 1);
    const enemy = add(game, 60);
    run(game, 4);
    return enemy.maxHp - enemy.hp;
  };

  it('전쟁 북은 해골 공격 속도를 올린다', () => {
    assert.ok(swings({ drum: 5 }) > swings({}) * 1.3);
  });

  it('긴 뼈창은 궁수가 더 멀리서 쏘게 한다', () => {
    const gap = (commands) => {
      const game = quiet();
      game.commands = commands;
      game.army.push({ id: game.nextId++, type: 'archer', x: game.player.x, y: game.player.y, hp: 22, maxHp: 22, attackIn: 0, facing: 1, swingAt: -1, slot: 0 });
      const enemy = add(game, 300);
      run(game, 4);
      return Math.hypot(game.army[0].x - enemy.x, game.army[0].y - enemy.y);
    };
    assert.ok(gap({ reach: 5 }) > gap({}) + 40);
  });
});

describe('영혼 흡수', () => {
  it('모은 영혼이 많을수록 해골과 강령술 피해가 커진다', () => {
    const game = quiet();
    assert.equal(soulGrowth(game), 1);
    game.souls = 0;
    kill(game, add(game, 60));
    assert.equal(game.soulsTotal, SOULS.normal);
    game.soulsTotal = 16000;
    assert.ok(Math.abs(soulGrowth(game) - 3) < 1e-9);
    game.souls = 0;
    game.soulsTotal = 80000;
    assert.ok(soulGrowth(game) > 7);
  });
});

describe('강령술 완성형', () => {
  it('Lv 5 강령술과 짝 지휘 능력이 있으면 레벨업에 완성형이 먼저 나온다', () => {
    const game = quiet();
    game.undead = { bone: 5 };
    game.commands = { drill: 1 };
    const choices = rollChoices(game);
    game.choices = choices;
    assert.equal(choices[0].kind, 'undead-evolve');
    assert.equal(choices[0].id, 'bone');
    choose(game, 0);
    assert.ok(game.undeadEvolved.bone);
    assert.ok(!rollChoices(game).some(choice => choice.kind === 'undead-evolve'));
  });

  it('뼈 폭풍은 큰 뼈 6개를 던지고, 망령 군무는 7마리가 돌고, 사신의 대낫은 반대로 한 번 더 벤다', () => {
    const game = quiet();
    game.undead = { bone: 5, wraith: 5, scythe: 5 };
    game.undeadEvolved = { bone: true, wraith: true, scythe: true };
    for (let n = 0; n < 8; n += 1) add(game, 80 + n * 20, n * 10);
    update(game, DT);
    assert.equal(game.shots.filter(shot => shot.kind === 'bone').length, UNDEAD_EVOLUTIONS.bone.count);
    assert.equal(wraithOrbiters(game).length, UNDEAD_EVOLUTIONS.wraith.count);
    run(game, 0.7);
    const reaps = game.effects.filter(effect => effect.type === 'reap');
    assert.ok(reaps.some(effect => effect.turn === -1 && effect.evolved));
  });
});

describe('궁수 계열', () => {
  const archers = (game, count) => { for (let n = 0; n < count; n += 1) game.army.push({ id: game.nextId++, type: 'archer', x: game.player.x, y: game.player.y, attackIn: 0, facing: 1, swingAt: -1, slot: n }); };

  it('궁수와 영혼을 바치면 석궁수, 쇠뇌병, 명궁으로 차례로 커진다', () => {
    const game = quiet();
    archers(game, RITUALS.ranger1.cost.archer + RITUALS.ranger2.cost.archer);
    for (const id of ['ranger1', 'ranger2']) {
      game.souls = RITUALS[id].souls;
      openSoulShop(game);
      choose(game, game.choices.findIndex(choice => choice.kind === 'ritual' && choice.id === id));
      assert.equal(game.souls, 0);
    }
    assert.deepEqual(game.army.map(unit => unit.type), ['ranger2']);
    assert.equal(armyUsed(game), ARMY.ranger2.cap);
  });

  it('궁수는 스페이스 마린처럼 사거리 절반을 두고 쏘며, 화면 밖으로 멀어지면 먼저 합류한다', () => {
    const game = quiet();
    game.army.push({ id: game.nextId++, type: 'archer', x: game.player.x, y: game.player.y, attackIn: 0, facing: 1, swingAt: -1, slot: 0 });
    const enemy = add(game, 220);
    run(game, 4);
    const gap = Math.hypot(game.army[0].x - enemy.x, game.army[0].y - enemy.y);
    assert.ok(Math.abs(gap - ARMY.archer.range * 0.5) < 30);
    assert.ok(game.shots.some(shot => shot.kind === 'arrow') || enemy.hp < enemy.maxHp);
    game.army[0].x = game.player.x - 560;
    game.army[0].y = game.player.y;
    run(game, 0.5);
    assert.ok(game.army[0].regrouping);
    assert.ok(game.army[0].x > game.player.x - 560 + 100);
  });

  it('쇠뇌병은 꿰뚫는 볼트 여러 발을 쏜다', () => {
    const game = quiet();
    game.army.push({ id: game.nextId++, type: 'ranger2', x: game.player.x, y: game.player.y, attackIn: 0, facing: 1, swingAt: -1, slot: 0 });
    add(game, 250);
    update(game, DT);
    const bolts = game.shots.filter(shot => shot.kind === 'arrow');
    assert.equal(bolts.length, ARMY.ranger2.bolts);
    assert.ok(bolts.every(shot => shot.pierce === ARMY.ranger2.pierce));
  });
});

describe('강령술 능력치', () => {
  it('점수마다 해골 피해가 오르고, 5점부터 모집이 늘며 10점에 한도와 영혼이 는다', async () => {
    const { applyBuild } = await import('../src/engine.js');
    const game = quiet();
    applyBuild(game, { necro: 20 });
    assert.equal(armyCap(game), ARMY_CAP + 20);
    game.souls = 100;
    openSoulShop(game);
    const recruit = game.choices.find(choice => choice.id === 'soldier');
    assert.equal(recruit.amount, RECRUITS.soldier.amount + 1);
    choose(game, game.choices.indexOf(recruit));
    game.souls = 0;
    kill(game, add(game, 60));
    assert.equal(game.souls, SOULS.normal + 1);
  });

  it('의식을 하면 바친 해골이 사라지고 병력 칸은 바친 만큼만 쓴다', async () => {
    const { applyBuild } = await import('../src/engine.js');
    const game = quiet();
    applyBuild(game, { necro: 20 });
    recruitSoldiers(game, 12);
    game.souls = RITUALS.giant1.souls;
    openSoulShop(game);
    choose(game, game.choices.findIndex(choice => choice.id === 'giant1'));
    assert.equal(game.army.filter(unit => unit.type === 'soldier').length, 12 - (RITUALS.giant1.cost.soldier - 4));
    assert.equal(armyUsed(game), 12);
  });

  it('레벨이 오를 때마다 병력 한도가 1칸씩 는다', () => {
    const game = quiet();
    assert.equal(armyCap(game), ARMY_CAP);
    game.level = 11;
    assert.equal(armyCap(game), ARMY_CAP + 10);
  });

  it('20점이면 의식에 바치는 병사가 4명 줄어든다', async () => {
    const { applyBuild } = await import('../src/engine.js');
    const game = quiet();
    applyBuild(game, { necro: 20 });
    recruitSoldiers(game, RITUALS.giant1.cost.soldier - 4);
    game.souls = RITUALS.giant1.souls;
    openSoulShop(game);
    assert.ok(game.choices.some(choice => choice.kind === 'ritual'));
  });
});
