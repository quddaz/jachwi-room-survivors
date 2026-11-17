import assert from 'node:assert/strict';
import { it } from 'node:test';
import { createGame, statsOf, update, passiveLines } from '../src/engine.js';
function scene(level=1,counter=5) {
 const g=createGame(()=>.99);g.weapons={};g.passives={lightgear:5,counterweight:counter};g.level=level;
 g.spawnCarry=-1e9;g.nextBossAt=g.nextSwarmAt=g.nextXp=Infinity;
 const add=(x)=>{const e={id:g.nextId++,kind:'roach',x:g.player.x+x,y:g.player.y,hp:1e7,maxHp:1e7,radius:8,speed:0,damage:0,xp:0,timer:0,kx:0,ky:0};g.enemies.push(e);return e;};
 return {g,add};
}
function hit(g,e){g.shots.push({x:e.x,y:e.y,vx:0,vy:0,damage:10,radius:3,life:1,hit:new Set(),pierce:0});update(g,1/60);}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
it('두 고정 패시브는 레벨 1에 280, 레벨 100에 557.2이며 공격력·치명타와 별도로 성장한다',()=>{
 const a=scene(1),b=scene(100);close(statsOf(a.g).flatDamage,280);close(statsOf(b.g).flatDamage,557.2);
 b.g.passives.protein=20;b.g.passives.clover=10;b.g.passives.hotsauce=5;close(statsOf(b.g).flatDamage,557.2);
 const e=b.add(100);b.g.random=()=>0;hit(b.g,e);close(e.maxHp-e.hp,10*2.75+557.2);
 assert.ok(passiveLines('counterweight',1).includes('캐릭터 레벨당 패시브 고정 피해 +0.2%'));
});
it('8회 적중 때 주변에만 추가 고정 피해 40%를 주고 원래 대상과 멀리 있는 적은 제외한다',()=>{
 const {g,add}=scene();const a=add(100),b=add(150),outside=add(400);
 for(let i=0;i<7;i++)hit(g,a);close(b.maxHp-b.hp,0);hit(g,a);
 close(a.maxHp-a.hp,8*290);close(b.maxHp-b.hp,112);close(outside.hp,outside.maxHp);assert.equal(a.fixedDischargeHits,0);
 assert.equal(b.fixedDischargeHits,undefined);
});
it('방출은 치명타·성냥·공진 못·방출을 재귀 발동하지 않는다',()=>{
 const {g,add}=scene();g.relics={resonator:true,match:true,icetray:true};g.passives.clover=10;g.passives.hotsauce=5;g.random=()=>0;
 const a=add(100),b=add(150);for(let i=0;i<8;i++)hit(g,a);
 close(b.maxHp-b.hp,112);assert.equal(b.burnUntil,undefined);assert.equal(b.resonatorHits,undefined);assert.equal(b.fixedDischargeHits,undefined);assert.equal(b.chillUntil,undefined);
});
it('균형추 4레벨과 지속 피해는 방출을 발동하지 않고 대상별 타격 수는 분리한다',()=>{
 const low=scene(1,4),a=low.add(100),b=low.add(150);for(let i=0;i<16;i++)hit(low.g,a);close(b.maxHp-b.hp,0);
 const dot=scene();dot.g.weapons={dehumidifier:1};const e=dot.add(40);for(let i=0;i<60;i++)update(dot.g,1/60);assert.equal(e.fixedDischargeHits,undefined);
 const many=scene(),x=many.add(100),y=many.add(200);for(let i=0;i<7;i++)hit(many.g,x);hit(many.g,y);assert.equal(x.fixedDischargeHits,7);assert.equal(y.fixedDischargeHits,1);
});
