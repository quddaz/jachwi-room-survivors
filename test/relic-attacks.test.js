import assert from 'node:assert/strict';
import { it } from 'node:test';
import { createGame, update } from '../src/engine.js';
import { RELICS } from '../src/rules.js';
const DT=1/60;
function scene(id,clock){const g=createGame(()=>.99);g.weapons={};g.relics={[id]:true};g[clock]=0;g.spawnCarry=-1e6;g.nextBossAt=g.nextSwarmAt=g.nextXp=Infinity;return g;}
function target(g,x,y=0){const e={id:g.nextId++,kind:'roach',x:g.player.x+x,y:g.player.y+y,hp:1e6,maxHp:1e6,radius:10,speed:0,damage:0,xp:1,timer:0,kx:0,ky:0};g.enemies.push(e);return e;}
function run(g,frames){for(let n=0;n<frames;n++)update(g,DT);}
it('지나간 냉각 파동은 같은 적에게 재적중하지 않는다',()=>{
 const g=scene('pas','pasIn'),e=target(g,100);run(g,60);
 assert.equal(1e6-e.hp,RELICS.pas.damage);assert.equal(g.relicAttacks.length,0);
});
it('열선은 생성된 바닥에 남고 직사각형 밖의 적은 맞지 않는다',()=>{
 const g=scene('heatpad','heatIn'),inside=target(g,100),outside=target(g,0,100);
 update(g,DT);g.player.x+=500;run(g,46);
 assert.equal(1e6-inside.hp,RELICS.heatpad.damage);assert.equal(outside.hp,1e6);
});
it('보물을 내려놓으면 착탄 예약과 지속 지대의 추가 피해가 취소된다',()=>{
 for(const [id,clock] of [['firecracker','fireIn'],['freshener','freshIn'],['heatpad','heatIn']]){
  const g=scene(id,clock),e=target(g,50);update(g,DT);const hp=e.hp;
  delete g.relics[id];run(g,70);assert.equal(e.hp,hp);assert.equal(g.relicAttacks.length,0);
 }
});
