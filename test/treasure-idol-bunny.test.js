import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyBuild, choose, createGame, damageEnemy, maxWeaponsOf, rollChoices, startWithRelic, statsOf, update } from '../src/engine.js';
import { ARENA, DROP_LIMIT, DROPS, ENEMIES, PASSIVES, PLAYER, SECRET_MAPS } from '../src/rules.js';
const DT=1/60;
function quiet(treasure=false){const g=createGame(()=>.99);g.weapons={};g.spawnCarry=-1e6;g.nextBossAt=g.nextSwarmAt=g.nextXp=Infinity;if(treasure)applyBuild(g,{treasure:20});return g;}
function enemy(g,kind='roach',dx=80){const e={id:g.nextId++,kind,x:g.player.x+dx,y:g.player.y,hp:1e8,maxHp:1e8,radius:ENEMIES[kind].radius,speed:0,damage:30,xp:1,timer:0,kx:0,ky:0};g.enemies.push(e);return e;}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
function run(g,n){for(let i=0;i<n;i++)update(g,DT);}

describe('먼지 토끼 안전한 순간이동',()=>{
 it('모서리에서도 280 거리를 확보한 위치를 0.9초 예고하고 안전하게 착지한다',()=>{
  for(const [x,y] of [[16,16],[2984,16],[16,2984],[2984,2984],[1500,1500]]){
   const g=quiet();g.player.x=x;g.player.y=y;g.random=()=>.625;
   const bunny=enemy(g,'dustbunny',0);bunny.x=x<1500?x+600:x-600;bunny.y=y;bunny.timer=10;
   const original={x:bunny.x,y:bunny.y};update(g,DT);
   assert.ok(bunny.blinkTarget);assert.ok(Math.hypot(bunny.blinkTarget.x-x,bunny.blinkTarget.y-y)>=279.99);
   near(bunny.x,original.x);run(g,55);
   assert.equal(bunny.blinkTarget,null);assert.ok(Math.hypot(bunny.x-x,bunny.y-y)>=ENEMIES.dustbunny.blinkSafe);
   near(g.player.hp,PLAYER.maxHp);
  }
 });
 it('예고된 착지 지점으로 플레이어가 이동하면 순간이동을 취소한다',()=>{
  const g=quiet(),b=enemy(g,'dustbunny',600);b.timer=10;update(g,DT);
  const original={x:b.x,y:b.y};g.player.x=b.blinkTarget.x;g.player.y=b.blinkTarget.y;run(g,55);
  near(b.x,original.x);near(b.y,original.y);assert.equal(b.blinkTarget,null);near(g.player.hp,PLAYER.maxHp);
 });
 it('착지 직후 0.65초는 이동·접촉 피해를 멈춰 피할 시간을 준다',()=>{
  const g=quiet(),b=enemy(g,'dustbunny',600);b.timer=10;update(g,DT);run(g,55);
  g.player.x=b.x;g.player.y=b.y;b.speed=70;const x=b.x;run(g,20);near(b.x,x);near(g.player.hp,PLAYER.maxHp);
  run(g,25);assert.ok(g.player.hp<PLAYER.maxHp);
 });
});

describe('보물 20점 비밀 성장',()=>{
 it('모든 오리의 보물 20점은 무기 0칸이며 전기장판을 기본 제공한다',()=>{
  const g=quiet(true);assert.equal(maxWeaponsOf(g),0);assert.deepEqual(g.weapons,{});startWithRelic(g);
  assert.equal(g.relics.heatpad,true);assert.equal(g.pendingRelics,2);
  g.choices=null;g.pendingRelics=0;const e=enemy(g);run(g,120);assert.ok(e.hp<e.maxHp);
 });
 it('지도는 20점에서만 나오고 조각마다 5레벨에서 보물 피해 15%를 준다',()=>{
  const base=quiet(true),before=statsOf(base).relicPower;
  for(const id of SECRET_MAPS){assert.equal(PASSIVES[id].hidden,true);base.passives[id]=5;}
  near(statsOf(base).relicPower-before,.6);
  const below=quiet();applyBuild(below,{treasure:19});for(let n=0;n<40;n++)assert.ok(rollChoices(below).every(c=>!SECRET_MAPS.includes(c.id)&&c.id!=='idol'));
 });
 it('네 지도를 모두 완성하면 우상이 우선 나오며 지도 효과를 계승하고 추가 50%를 얻는다',()=>{
  const g=quiet(true);g.passives=Object.fromEntries(SECRET_MAPS.map(id=>[id,5]));const before=statsOf(g).relicPower;
  g.pendingLevels=1;g.choices=rollChoices(g);assert.equal(g.choices[0].id,'idol');choose(g,0);
  assert.equal(g.passives.idol,1);for(const id of SECRET_MAPS)assert.equal(g.passives[id],undefined);
  near(statsOf(g).relicPower,before+.5);assert.equal(statsOf(g).relicRepeats,2);near(statsOf(g).dropBonus,.01);
  for(let n=0;n<30;n++)assert.ok(rollChoices(g).every(c=>!SECRET_MAPS.includes(c.id)&&c.id!=='idol'));
 });
 it('우상은 주기 보물을 0.18초 후 한 번 더 발동하고 재귀 예약하지 않는다',()=>{
  const g=quiet(true);g.passives.idol=1;g.relics.heatpad=true;g.heatIn=0;const e=enemy(g);
  update(g,DT);const first=e.maxHp-e.hp;run(g,12);near(e.maxHp-e.hp,first*2);
  assert.equal(g.relicEchoes.length,0);assert.ok(g.heatIn>0);
 });
 it('우상으로 정수기 투사체도 두 번 나오고 보물을 내려놓으면 예약을 취소한다',()=>{
  const g=quiet(true);g.passives.idol=1;g.relics.purifier=true;g.purifierIn=0;update(g,DT);
  assert.equal(g.shots.length,12);run(g,12);assert.equal(g.shots.length,24);
  g.purifierIn=0;update(g,DT);delete g.relics.purifier;run(g,12);assert.equal(g.relicEchoes.length,0);
 });
 it('소모품 확률은 전체에 1%p 추가하며 종류별 바닥 개수 제한을 유지한다',()=>{
  const g=quiet(true);g.passives.idol=1;g.random=()=>.008;const e=enemy(g);damageEnemy(g,e,1e10);
  assert.equal(g.drops.length,1);
  g.drops=Object.keys(DROPS).flatMap(type=>Array.from({length:DROP_LIMIT},()=>({type,x:0,y:0})));
  const count=g.drops.length;damageEnemy(g,enemy(g),1e10);assert.equal(g.drops.length,count);
 });
});
