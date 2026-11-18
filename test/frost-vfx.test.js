import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createGame, update } from '../src/engine.js';

describe('실제 냉기 적중 연출', () => {
  it('얼음 탄환의 피해는 매번 적용하고 같은 적의 결정 파편만 잠깐 묶는다', () => {
    const game=createGame(()=>.99);
    game.weapons={};game.spawnCarry=-1e6;game.nextBossAt=game.nextSwarmAt=game.nextXp=Infinity;
    const enemy={id:game.nextId++,kind:'roach',x:game.player.x+80,y:game.player.y,
      hp:1000,maxHp:1000,speed:0,radius:8,damage:0,xp:0,timer:0,kx:0,ky:0};
    game.enemies.push(enemy);
    const shoot=()=>game.shots.push({x:enemy.x-10,y:enemy.y,vx:300,vy:0,kind:'ice',damage:20,
      radius:2,life:.5,pierce:0,hit:new Set()});
    shoot();update(game,1/60);
    assert.equal(enemy.hp,980);
    const effect=game.effects.find(effect=>effect.type==='frosthit');
    assert.ok(effect);
    assert.ok(Math.abs(effect.x-enemy.x)<=enemy.radius+2);
    assert.equal(effect.y,enemy.y);
    shoot();update(game,1/60);
    assert.equal(enemy.hp,960);
    assert.equal(game.effects.filter(effect=>effect.type==='frosthit').length,1);
    update(game,.12);shoot();update(game,1/60);
    assert.equal(enemy.hp,940);
    assert.equal(game.effects.filter(effect=>effect.type==='frosthit').length,2);
  });
});
