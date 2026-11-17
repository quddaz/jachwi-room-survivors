import assert from 'node:assert/strict';
import { it } from 'node:test';
import { applyBuild, applyCharacter, createGame, rollChoices, statsOf, update } from '../src/engine.js';
import { PASSIVES, WEAPONS, FUSIONS, passiveMaxLevel } from '../src/rules.js';
function scene(level=5,random=.49){const g=createGame(()=>random);g.weapons={broom:1};g.passives={precision:level,lightgear:5,counterweight:5,clover:10};g.relics={mallet:true};g.spawnCarry=-1e9;g.nextBossAt=g.nextSwarmAt=g.nextXp=Infinity;
 const e={id:g.nextId++,kind:'roach',x:g.player.x+40,y:g.player.y,hp:1e8,maxHp:1e8,radius:8,speed:0,damage:0,xp:0,timer:0,kx:0,ky:0};g.enemies=[e];return {g,e};}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
it('각 레벨에서 10~50% 확률 경계 미만이면 현재 고정 피해를 정확히 한 번 더 적용한다',()=>{
 for(let level=1;level<=5;level++){
  const chance=level*.1,on=scene(level,chance-.001),off=scene(level,chance);
  update(on.g,1/60);update(off.g,1/60);
  close(off.e.hp-on.e.hp,statsOf(on.g).flatDamage);
 }
});
it('고무망치·레벨 성장·총잡이·정밀 저울을 포함하고 타격 횟수는 한 번만 쌓는다',()=>{
 const on=scene(),off=scene(5,.5);
 for(const {g} of [on,off]){g.level=100;applyCharacter(g,'gunner');g.relics.precisionscale=true;g.relics.resonator=true;}
 update(on.g,1/60);update(off.g,1/60);
 close(off.e.hp-on.e.hp,statsOf(on.g).flatDamage);assert.equal(on.e.resonatorHits,1);assert.equal(on.e.fixedDischargeHits,1);
});
it('추가 발동은 치명타로 증폭되지 않고 지속 피해·보물 공격은 발동하지 않는다',()=>{
 const {g,e}=scene(5,0);g.weapons={};g.relics={};g.passives={precision:5,lightgear:5,clover:10,hotsauce:5,protein:20};
 g.shots=[{x:e.x,y:e.y,vx:0,vy:0,damage:10,life:1,radius:3,hit:new Set(),pierce:0}];update(g,1/60);close(e.maxHp-e.hp,10*2.75+120*2);
 const dot=scene(5,0);dot.g.relics={};dot.g.passives={precision:5,lightgear:5};dot.g.weapons={dehumidifier:1};update(dot.g,.1);close(dot.e.maxHp-dot.e.hp,WEAPONS.dehumidifier.dps[0]*.25*.1);
 const ice=scene(5,0);ice.g.weapons={};ice.g.shots=[{kind:'ice',x:ice.e.x,y:ice.e.y,vx:0,vy:0,damage:10,life:1,radius:3,hit:new Set(),pierce:0}];update(ice.g,1/60);close(ice.e.maxHp-ice.e.hp,10);
});
it('공속 20점에 고정 피해를 이미 가진 경우에만 첫 정밀 스프링을 제시한다',()=>{
 for(const points of [19,20])for(const fixed of [false,true]){
  const {g}=scene();applyBuild(g,{haste:points});g.weapons=Object.fromEntries(Object.keys(WEAPONS).map(id=>[id,5]));g.evolved=Object.fromEntries(Object.keys(WEAPONS).map(id=>[id,true]));g.fusions=Object.fromEntries(Object.keys(FUSIONS).map(id=>[id,true]));
  g.passives=Object.fromEntries(Object.keys(PASSIVES).filter(id=>!['precision','lightgear','counterweight'].includes(id)).map(id=>[id,passiveMaxLevel(id)]));g.relics={};if(fixed)g.relics.mallet=true;
  assert.equal(rollChoices(g).some(c=>c.id==='precision'),points===20&&fixed);
 }
});
