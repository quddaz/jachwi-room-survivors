import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyBuild, choose, createGame, reroll, startWithRelic, statsOf, update } from '../src/engine.js';
import { NUCLEAR_STRIKE, RELICS } from '../src/rules.js';
const DT=1/60;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-4,`${a} != ${b}`);
function scene(stacks=4){const g=createGame(()=>.99);applyBuild(g,{treasure:20});g.weapons={};g.relics={firecracker:true,mlrs:stacks};g.fireIn=1e9;g.spawnCarry=-1e9;g.nextBossAt=g.nextSwarmAt=g.nextXp=Infinity;return g;}
function run(g,frames){for(let i=0;i<frames;i++)update(g,DT);}
function target(g,dx){const e={id:g.nextId++,kind:'roach',x:g.player.x+dx,y:g.player.y,hp:1e9,maxHp:1e9,radius:10,speed:0,damage:0,xp:0,timer:0,kx:0,ky:0,boss:true};g.enemies.push(e);return e;}
const nukes=g=>g.relicAttacks.filter(a=>a.type==='nuclear');
describe('다연장 미사일 핵 지원',()=>{
 it('3개는 핵이 없고 4개부터 일반 미사일에 핵 한 발을 추가한다',()=>{
  for(const stacks of [3,4]){const g=scene(stacks);g.fireIn=0;g.nuclearIn=0;update(g,DT);
   assert.equal(g.relicAttacks.filter(a=>a.type==='firework').length,RELICS.firecracker.rockets+stacks*RELICS.mlrs.rockets);
   assert.equal(nukes(g).length,stacks===4?1:0);
  }
 });
 it('첫 핵은 주기만큼 기다리고 공속·태엽·우상이 있어도 주기 두 번 동안 두 번만 발사한다',()=>{
  const g=scene();applyBuild(g,{treasure:20,haste:10});g.passives={battery:5,windup:5,idol:1};g.relics.stopwatch=true;
  const launches=new Set(),every=Math.round(NUCLEAR_STRIKE.everySec/DT);
  for(let frame=1;frame<=every*2;frame++){update(g,DT);for(const a of nukes(g))launches.add(a.seed);if(frame===every-1)assert.equal(launches.size,0);if(frame===every)assert.equal(launches.size,1);}
  assert.equal(launches.size,2);
 });
 it('예고 중에는 피해가 없고 충돌은 한 번, 안쪽 잔류 지대만 3초 지속된다',()=>{
  const g=scene(),center=target(g,100),edge=target(g,100+NUCLEAR_STRIKE.radius*.8),outside=target(g,100+NUCLEAR_STRIKE.radius+50);
  const power=statsOf(g).might*statsOf(g).relicPower;g.nuclearIn=0;run(g,60);
  assert.equal(center.hp,1e9);run(g,24);
  near(1e9-edge.hp,NUCLEAR_STRIKE.damage*power);assert.equal(outside.hp,1e9);
  const edgeHp=edge.hp;run(g,220);
  near(1e9-center.hp,(NUCLEAR_STRIKE.damage+NUCLEAR_STRIKE.falloutDps*NUCLEAR_STRIKE.falloutSec)*power);
  assert.equal(edge.hp,edgeHp);assert.equal(nukes(g).length,0);
 });
 it('범위 보너스를 받지만 반경은 900을 넘지 않는다',()=>{
  const g=scene();g.relics.bigpot=true;g.passives.wipes=5;g.nuclearIn=0;update(g,DT);
  assert.equal(nukes(g)[0].radius,NUCLEAR_STRIKE.maxRadius);
 });
 it('4개 미만으로 내려가면 예약이 취소되고 다시 모으면 주기를 처음부터 센다',()=>{
  const g=scene(),e=target(g,100);g.nuclearIn=0;update(g,DT);g.relics.mlrs=3;update(g,DT);
  assert.equal(nukes(g).length,0);assert.equal(g.nuclearIn,undefined);run(g,100);assert.equal(e.hp,1e9);
  g.relics.mlrs=4;update(g,DT);near(g.nuclearIn,NUCLEAR_STRIKE.everySec-DT);assert.equal(nukes(g).length,0);
 });
 it('기존 미사일이 공격 개수 제한에 도달해도 이미 예고한 핵은 취소되지 않는다',()=>{
  const g=scene();g.nuclearIn=0;update(g,DT);const nuclear=nukes(g)[0];
  g.relicAttacks.push(...Array.from({length:191},(_,n)=>({type:'firework',id:'firecracker',age:0,seed:1e4+n,x:100,y:100,radius:1,damage:0,life:10})));
  g.fireIn=0;update(g,DT);assert.ok(g.relicAttacks.includes(nuclear));assert.equal(g.relicAttacks.length,192);
 });
});
describe('보물 20점 리롤',()=>{
 it('보물 선택창에서 19점은 1회, 20점은 2회이며 행운의 고양이는 한 회를 더한다',()=>{
  for(const points of [19,20])for(const cat of [false,true]){
   const g=scene(0);applyBuild(g,{treasure:points});g.relics=cat?{neko:true}:{};startWithRelic(g);
   const count=1+Number(points===20)+Number(cat);assert.equal(g.rerollLeft,count);
   for(let n=0;n<count;n++)assert.equal(reroll(g),true);assert.equal(reroll(g),false);
  }
 });
 it('다음 보물·레벨업 선택창에서도 보너스를 새로 제공한다',()=>{
  const g=scene(0);g.relics={};startWithRelic(g);reroll(g);choose(g,0);assert.equal(g.rerollLeft,2);
  g.pendingRelics=0;g.choices=null;g.pendingLevels=1;update(g,DT);assert.equal(g.rerollLeft,2);
  assert.equal(reroll(g),true);assert.equal(reroll(g),true);assert.equal(reroll(g),false);
 });
});
