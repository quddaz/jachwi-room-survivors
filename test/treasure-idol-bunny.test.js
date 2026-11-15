import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyBuild, choose, createGame, damageEnemy, maxWeaponsOf, rollChoices, startWithRelic, statsOf, update } from '../src/engine.js';
import { ARENA, DROP_LIMIT, DROPS, ENEMIES, PASSIVES, PLAYER, RELICS, SECRET_MAPS, SECRET_MAP_DROP_CHANCE } from '../src/rules.js';
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
 it('보물 20점도 시작 무기 1칸과 시작 보물 두 번 선택을 유지한다',()=>{
  const g=createGame(()=>.99);applyBuild(g,{treasure:20});startWithRelic(g);
  assert.equal(maxWeaponsOf(g),1);assert.deepEqual(g.weapons,{spray:1});
  assert.equal(g.relics.heatpad,undefined);assert.equal(g.pendingRelics,2);
 });
 it('지도와 우상은 완성 조건과 관계없이 레벨업 선택지에 나오지 않는다',()=>{
  for(const points of [19,20]){
   const g=quiet();applyBuild(g,{treasure:points});
   for(const id of SECRET_MAPS)g.passives[id]=1;
   for(let n=0;n<40;n++)assert.ok(rollChoices(g).every(c=>!SECRET_MAPS.includes(c.id)&&c.id!=='idol'));
  }
 });
 it('지도는 일반 소모품과 별도로 드물게 나오며 중복 방향은 바닥에 나오지 않는다',()=>{
  assert.ok(SECRET_MAP_DROP_CHANCE>0&&SECRET_MAP_DROP_CHANCE<DROPS.ramen.chance);
  const g=quiet(true);g.random=()=>SECRET_MAP_DROP_CHANCE+.00001;
  damageEnemy(g,enemy(g),1e10);assert.equal(g.drops.filter(d=>SECRET_MAPS.includes(d.type)).length,0);
  g.random=()=>.00001;
  for(let n=0;n<6;n++)damageEnemy(g,enemy(g),1e10);
  const maps=g.drops.filter(d=>SECRET_MAPS.includes(d.type));
  assert.equal(maps.length,4);assert.equal(new Set(maps.map(d=>d.type)).size,4);
  const below=quiet();below.random=()=>.00001;damageEnemy(below,enemy(below),1e10);
  assert.ok(below.drops.every(d=>!SECRET_MAPS.includes(d.type)));
 });
 it('각 방향은 한 번만 줍고 네 번째 조각을 주우면 선택창 없이 즉시 우상으로 합쳐진다',()=>{
  const g=quiet(true),before=statsOf(g).relicPower;
  for(let i=0;i<SECRET_MAPS.length;i++){
   const id=SECRET_MAPS[i];g.drops=[{type:id,x:g.player.x,y:g.player.y}];update(g,DT);
   if(i<3){assert.equal(g.passives[id],1);near(statsOf(g).relicPower,before+(i+1)*.15);}
  }
  assert.equal(g.passives.idol,1);for(const id of SECRET_MAPS)assert.equal(g.passives[id],undefined);
  near(statsOf(g).relicPower,before+1.1);assert.equal(statsOf(g).relicRepeats,2);near(statsOf(g).dropBonus,.01);
  assert.equal(g.choices,null);assert.ok(g.effects.some(effect=>effect.type==='relic-awaken'&&effect.id==='idol'));
  g.random=()=>.00001;damageEnemy(g,enemy(g),1e10);assert.ok(g.drops.every(d=>!SECRET_MAPS.includes(d.type)));
 });
 it('우상은 주기 보물을 0.18초 후 한 번 더 발동하고 재귀 예약하지 않는다',()=>{
  const g=quiet(true);g.passives.idol=1;g.relics.firecracker=true;g.fireIn=0;enemy(g);
  update(g,DT);assert.equal(g.relicAttacks.length,RELICS.firecracker.rockets);run(g,12);
  const casts=g.relicAttacks.filter(a=>a.type==='firework').length+g.effects.filter(e=>e.type==='nova').length;
  assert.equal(casts,RELICS.firecracker.rockets*2);assert.equal(g.relicEchoes.length,0);assert.ok(g.fireIn>0);
 });
 it('우상으로 정수기 투사체도 두 번 나오고 보물을 내려놓으면 예약을 취소한다',()=>{
  const g=quiet(true);g.passives.idol=1;g.relics.purifier=true;g.purifierIn=0;update(g,DT);
  assert.equal(g.shots.length,4);run(g,35);assert.equal(g.shots.length,24);
  g.purifierIn=0;update(g,DT);delete g.relics.purifier;run(g,12);assert.equal(g.relicEchoes.length,0);
 });
 it('소모품 확률은 전체에 1%p 추가하며 종류별 바닥 개수 제한을 유지한다',()=>{
  const g=quiet(true);g.passives.idol=1;g.random=()=>.008;const e=enemy(g);damageEnemy(g,e,1e10);
  assert.equal(g.drops.length,1);
  g.drops=Object.keys(DROPS).flatMap(type=>Array.from({length:DROP_LIMIT},()=>({type,x:0,y:0})));
  const count=g.drops.length;damageEnemy(g,enemy(g),1e10);assert.equal(g.drops.length,count);
 });
});
