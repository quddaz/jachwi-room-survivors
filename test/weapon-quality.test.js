import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyBuild, createGame, update } from '../src/engine.js';
import { EVOLUTIONS, WEAPONS } from '../src/rules.js';
const DT = 1 / 60;
const close = (a,b) => assert.ok(Math.abs(a-b)<0.0001, `${a} != ${b}`);
function quiet(weapons = {}) {
  const game = createGame(() => 0.99);
  game.weapons = weapons;
  game.spawnCarry = -1e6;
  game.nextBossAt = Infinity;
  game.nextSwarmAt = Infinity;
  game.nextXp = Infinity;
  return game;
}
function target(game, dx, dy=0, radius=10) {
  const enemy = { id: game.nextId++, kind: 'roach', x: game.player.x+dx, y: game.player.y+dy,
    hp: 1e6, maxHp: 1e6, radius, speed: 0, damage: 0, xp: 1, timer: 0, kx: 0, ky: 0 };
  game.enemies.push(enemy);return enemy;
}
function run(game, frames) { for(let n=0;n<frames;n++) update(game, DT); }
function shot(game, values={}) {
  game.shots.push({ x:game.player.x,y:game.player.y,vx:6000,vy:0,damage:10,life:1,radius:1,pierce:0,hit:new Set(),...values });
}

describe('실제 적을 향한 조준', () => {
  it('레이저는 무작위 각도 대신 위쪽의 가까운 적을 관통한다', () => {
    const game=quiet({laser:1});
    const first=target(game,0,-100),far=target(game,0,-300),side=target(game,100,0);
    update(game,DT);
    assert.ok(first.hp<first.maxHp && far.hp<far.maxHp);
    assert.equal(side.hp,side.maxHp);
  });
  it('레이저 쇼 여섯 줄기를 한 적에게 모두 중첩하지 않는다', () => {
    const game=quiet({laser:5});game.evolved.laser=true;
    const enemy=target(game,200);update(game,DT);
    close(enemy.maxHp-enemy.hp,WEAPONS.laser.damage[4]*EVOLUTIONS.laser.damage*2);
    assert.equal(game.effects.filter(effect=>effect.type==='laser').length,6);
  });
  it('돌돌이는 이동 방향 반대편에 있는 적도 조준한다', () => {
    const game=quiet({roller:1});game.player.heading=0;
    const enemy=target(game,-180);update(game,DT);
    assert.ok(game.shots[0].vx<0);
    run(game,40);assert.ok(enemy.hp<enemy.maxHp);
  });
  it('슬리퍼는 같은 적을 왕복 경로에서 한 번씩 때리고 회수된다', () => {
    const game=quiet({slipper:1});const enemy=target(game,150);
    update(game,DT);game.cooldowns.slipper=999;
    run(game,120);
    close(enemy.maxHp-enemy.hp,WEAPONS.slipper.damage[0]*2);
    assert.equal(game.slippers.length,0);
  });
  it('슬리퍼는 출발 후 옆으로 이동한 표적 쪽으로 완만히 방향을 튼다', () => {
    const game=quiet({slipper:1});const enemy=target(game,200);
    update(game,DT);enemy.y+=60;update(game,DT);
    assert.ok(game.slippers[0].vy>0);
  });
  it('쥐덫은 다가오는 적 쪽에 서로 다른 위치로 배치한다', () => {
    const game=quiet({mousetrap:5});const enemy=target(game,400);enemy.speed=60;
    update(game,DT);
    assert.equal(game.traps.length,3);
    assert.ok(game.traps.every(trap=>trap.x>game.player.x && trap.x-game.player.x<=165));
    assert.equal(new Set(game.traps.map(trap=>`${trap.x},${trap.y}`)).size,3);
  });
  it('드라이기는 비슷한 거리의 적 사이에서 조준이 흔들리지 않는다', () => {
    const game=quiet({dryer:1}),first=target(game,100),other=target(game,0,101);
    update(game,DT);assert.equal(game.dryerTarget,first);
    other.y=game.player.y+99;update(game,DT);assert.equal(game.dryerTarget,first);
    other.y=game.player.y+50;update(game,DT);assert.equal(game.dryerTarget,other);
  });
});

describe('빠른 무기의 경로 충돌', () => {
  it('한 프레임에 적을 통과해도 가장 먼저 만난 적에게 맞는다', () => {
    const game=quiet(),far=target(game,90,0,2),near=target(game,40,0,2);
    shot(game);update(game,DT);
    close(near.maxHp-near.hp,10);assert.equal(far.hp,far.maxHp);
  });
  it('관통탄은 경로 순서대로 두 적을 맞히고 세 번째 앞에서 소멸한다', () => {
    const game=quiet(),third=target(game,90,0,2),second=target(game,60,0,2),first=target(game,30,0,2);
    shot(game,{pierce:1});update(game,DT);
    close(first.maxHp-first.hp,10);close(second.maxHp-second.hp,10);assert.equal(third.hp,third.maxHp);
  });
  it('수명이 프레임 중 끝나도 마지막 경로는 판정하고 수명 밖 적은 맞히지 않는다', () => {
    const game=quiet(),inside=target(game,40,0,2),outside=target(game,80,0,2);
    shot(game,{life:0.01,pierce:5});update(game,DT);
    close(inside.maxHp-inside.hp,10);assert.equal(outside.hp,outside.maxHp);assert.equal(game.shots.length,0);
  });
  it('거품은 프레임 끝점이 아닌 실제 접촉 위치에서 폭발한다', () => {
    const game=quiet(),first=target(game,80,0,2),neighbor=target(game,80,25,2);
    shot(game,{vx:12000,pop:35,radius:2,kind:'bubble',seed:1});update(game,DT);
    close(first.maxHp-first.hp,10);close(neighbor.maxHp-neighbor.hp,10);
    const ring=game.effects.find(effect=>effect.type==='ring');
    assert.ok(ring.x-game.player.x>70 && ring.x-game.player.x<80);
  });
  it('고공속 탱탱볼도 프레임 사이에 지나친 작은 적을 맞힌다', () => {
    const game=quiet({ball:1});applyBuild(game,{haste:20});
    game.relics.mallet=true;game.passives.battery=5;game.coffeeUntil=10;
    game.view={halfW:1000,halfH:1000};
    game.balls=[{id:50,x:game.player.x,y:game.player.y,dx:1,dy:0,bounce:0}];
    const enemy=target(game,100,0,2);update(game,0.1);
    assert.ok(enemy.hp<enemy.maxHp);
  });
  it('전자레인지 파동은 낮은 FPS에서도 작은 적을 한 번만 때린다', () => {
    for(const dt of [0.2,1/60]) {
      const game=quiet({microwave:5}),enemy=target(game,40,0,2);
      for(let n=0;n<Math.round(1/dt);n++)update(game,dt);
      close(enemy.maxHp-enemy.hp,WEAPONS.microwave.damage[4]);
    }
  });
});

describe('회수와 전투 효과음', () => {
  it('최대 이동속도로 달려도 돌아오는 슬리퍼가 플레이어를 따라잡는다', () => {
    const game=quiet();game.passives.sneakers=10;game.relics={energy:true,scooter:true};game.coffeeUntil=10;
    game.slippers=[{x:game.player.x-300,y:game.player.y,vx:0,vy:0,damage:1,returning:true,spin:0,radius:10,hit:new Set()}];
    for(let n=0;n<120;n++)update(game,DT,{x:1,y:0});
    assert.equal(game.slippers.length,0);
  });
  it('전자레인지는 발사할 때만 파동음을 만들고 지속 파동마다 소리를 쌓지 않는다', () => {
    const game=quiet({microwave:1});update(game,DT);
    assert.equal(game.effects.filter(effect=>effect.sound==='pulse').length,1);
    game.cooldowns.microwave=999;run(game,5);
    assert.equal(game.effects.filter(effect=>effect.sound==='pulse').length,1);
  });
});
