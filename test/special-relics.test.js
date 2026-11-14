import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyBuild, choose, createGame, rollChoices, rollRelics, statsOf, update } from '../src/engine.js';
import { PASSIVES, RELICS } from '../src/rules.js';
const DT=1/60;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
function quiet(weapons={}) {const g=createGame(()=>.99);g.weapons=weapons;g.spawnCarry=-1e6;g.nextBossAt=Infinity;g.nextSwarmAt=Infinity;g.nextXp=Infinity;return g;}
function target(g,dx=100,dy=0) {const e={id:g.nextId++,kind:'roach',x:g.player.x+dx,y:g.player.y+dy,hp:1e8,maxHp:1e8,radius:10,speed:0,damage:0,xp:1,timer:0,kx:0,ky:0};g.enemies.push(e);return e;}
function shot(g,e) {g.shots.push({x:e.x,y:e.y,vx:0,vy:0,damage:10,radius:4,life:1,pierce:0,hit:new Set()});}
function offers(g) {const ids=new Set();for(let i=0;i<30;i++)rollRelics(g).forEach(c=>ids.add(c.id));return ids;}
function allBut(g,ids) {g.relics=Object.fromEntries(Object.keys(RELICS).filter(id=>!ids.includes(id)).map(id=>[id,true]));}

describe('전용 보물 등장 조건',()=>{
 it('고정은 공속 20점, 소환은 소환 20점부터 나온다',()=>{
  for(const tree of ['haste','summon'])for(const points of [19,20]) {
   const g=quiet();applyBuild(g,{[tree]:points});g.passives.precision=1;
   const ids=tree==='haste'?['precisionscale','resonator']:['baton','marchdrum'];allBut(g,ids);
   const found=offers(g);for(const id of ids)assert.equal(found.has(id),points===20,id);
  }
 });
 it('공진 못은 공속 20점이어도 현재 고정 피해가 없으면 숨긴다',()=>{
  const g=quiet();applyBuild(g,{haste:20});
  g.relics=Object.fromEntries(Object.keys(RELICS).filter(id=>!['resonator','precisionscale','mallet'].includes(id)).map(id=>[id,true]));
  assert.ok(!offers(g).has('resonator'));g.passives.lightgear=1;assert.ok(offers(g).has('resonator'));
 });
 it('지속 피해 보물은 실제 지속 피해를 주는 무기·합체·성냥이 있어야 나온다',()=>{
  for(const source of ['none','bleach','dryer','dehumidifier','spinlaser','poisongun','sawblade','dryoven','bleachbot','match']) {
   const g=quiet(source==='none'?{spray:1}:['bleach','dryer','dehumidifier'].includes(source)?{[source]:1}:{});
   allBut(g,['thermos','concentrate','match']);
   if(source==='match')g.relics.match=true;
   if(['spinlaser','poisongun','sawblade','dryoven','bleachbot'].includes(source))g.fusions[source]=true;
   const found=offers(g);for(const id of ['thermos','concentrate'])assert.equal(found.has(id),source!=='none',source);
  }
 });
 it('새 아이템 6종은 패시브 레벨업이 아닌 보물 슬롯을 사용한다',()=>{
  const ids=['precisionscale','resonator','thermos','concentrate','baton','marchdrum'];
  for(const id of ids){assert.ok(RELICS[id]);assert.equal(PASSIVES[id],undefined);}
  const g=quiet();applyBuild(g,{haste:20});g.pendingRelics=1;g.choices=[{kind:'relic',id:'precisionscale',label:RELICS.precisionscale.label}];choose(g,0);
  assert.equal(g.relics.precisionscale,true);assert.ok(rollChoices(g).every(c=>!ids.includes(c.id)));
 });
});

describe('고정 피해 보물',()=>{
 it('정밀 저울은 고무망치와 패시브 고정 피해를 모두 올린다',()=>{
  const g=quiet();g.relics={mallet:true};g.passives={clover:10,precision:5};
  const before=statsOf(g).flatDamage;g.relics.precisionscale=true;
  near(statsOf(g).flatDamage,(before+20)*1.25);
 });
 it('저울로 늘어난 타격 고정 피해는 치명타와 공격력으로 증폭되지 않는다',()=>{
  const g=quiet();g.relics.precisionscale=true;g.passives={precision:5,protein:10,clover:10,hotsauce:5};g.random=()=>0;
  const e=target(g);shot(g,e);update(g,DT);
  near(e.maxHp-e.hp,10*2.75+(60+20)*1.25);
 });
 it('공진 못은 같은 적을 여섯 번 때릴 때만 고정 피해를 한 번 추가한다',()=>{
  const g=quiet();g.relics.resonator=true;g.passives.precision=1;const e=target(g);
  for(let n=0;n<5;n++){shot(g,e);update(g,DT);}near(e.maxHp-e.hp,5*(10+12));
  shot(g,e);update(g,DT);near(e.maxHp-e.hp,6*(10+12)+12*2);assert.equal(e.resonatorHits,0);
  assert.equal(g.shots.length,0);
 });
 it('공진 못의 추가 고정 피해는 치명타가 터지지 않고 공격 간에 재귀 발동하지 않는다',()=>{
  const g=quiet();g.relics.resonator=true;g.passives={precision:1,clover:10,hotsauce:5};g.random=()=>0;const e=target(g);
  for(let n=0;n<12;n++){shot(g,e);update(g,DT);}
  near(e.maxHp-e.hp,12*(10*2.75+12)+2*(12*2));assert.equal(e.resonatorHits,0);
 });
 it('여러 적의 연타 수는 공유하지 않고 지속 피해는 연타를 쌓지 않는다',()=>{
  const g=quiet({dehumidifier:1});g.relics.resonator=true;g.passives.precision=1;const a=target(g,40),b=target(g,80);
  for(let n=0;n<5;n++){shot(g,a);update(g,DT);}shot(g,b);update(g,DT);
  assert.equal(a.resonatorHits,5);assert.equal(b.resonatorHits,1);
 });
});

describe('지속 피해 보물',()=>{
 it('보온병은 지속 피해만 40% 올리며 직접 타격은 그대로다',()=>{
  const amounts=[false,true].map(on=>{const g=quiet({dehumidifier:1});if(on)g.relics.thermos=true;const e=target(g,40);update(g,.1);return e.maxHp-e.hp;});
  near(amounts[1]/amounts[0],1.4);
  const g=quiet();g.relics.thermos=true;const e=target(g);shot(g,e);update(g,DT);near(e.maxHp-e.hp,10);
 });
 it('농축 앰플은 시간으로 쌓이며 장판 수가 늘어도 더 빨리 충전되지 않는다',()=>{
  const sample=count=>{const g=quiet();g.relics.concentrate=true;const e=target(g);g.puddles=Array.from({length:count},()=>({x:e.x,y:e.y,dps:100,radius:40,life:10}));for(let i=0;i<12;i++)update(g,.1);const before=e.hp;update(g,.1);return {damage:before-e.hp,elapsed:g.time-e.dotStartedAt};};
  const g=quiet({dehumidifier:1});g.relics.concentrate=true;const e=target(g,40);for(let n=0;n<181;n++)update(g,DT);
  const before=e.hp;update(g,.1);near(before-e.hp,18*.1*1.6);
  const a=sample(1),b=sample(3);near(a.elapsed,b.elapsed);near(b.damage/a.damage,3);near(a.elapsed,1.3);
 });
 it('피해가 0.5초 끊기면 농축을 초기화한다',()=>{
  const g=quiet({dehumidifier:1});g.relics.concentrate=true;const e=target(g,40);for(let n=0;n<180;n++)update(g,DT);
  g.weapons={};update(g,.6);g.weapons={dehumidifier:1};const before=e.hp;update(g,.1);near(before-e.hp,18*.1*1.01);
 });
 it('지속 피해 강화 후에도 기절·빙결·고정 피해를 매 틱 발동하지 않는다',()=>{
  const g=quiet({dehumidifier:1});applyBuild(g,{crit:20});g.random=()=>0;g.passives={clover:10,precision:5};g.relics={thermos:true,concentrate:true,resonator:true,icetray:true};
  const e=target(g,40);update(g,.1);assert.equal(e.chillUntil,undefined);assert.equal(e.resonatorHits,undefined);
  near(e.maxHp-e.hp,18*.1*1.4*1.01*statsOf(g).critDamage);
 });
});

describe('소환 전용 보물',()=>{
 it('지휘봉과 행군 북은 소환 피해·사거리·공속·이동만 강화한다',()=>{
  const g=quiet();applyBuild(g,{summon:20});const before=statsOf(g);g.relics={baton:true,marchdrum:true};const after=statsOf(g);
  near(after.summonPower/before.summonPower,1.35);near(after.summonRange/before.summonRange,1.2);near(after.summonHaste/before.summonHaste,1.25);near(after.summonSpeed/before.summonSpeed,1.25);
  near(after.might,before.might);near(after.cooldownScale,before.cooldownScale);near(after.speed,before.speed);assert.equal(after.summonCount,0);
 });
 it('보물이 소환수를 추가하지 않아 최대 30개체를 유지한다',()=>{
  const g=quiet(Object.fromEntries(['robot','sockpuppet','toydrone','windcar','plantspirit'].map(id=>[id,5])));
  g.evolved=Object.fromEntries(Object.keys(g.weapons).map(id=>[id,true]));applyBuild(g,{summon:20});g.passives.summonwhistle=3;g.relics={baton:true,marchdrum:true};
  target(g);for(let n=0;n<180;n++)update(g,DT);assert.equal(g.summons.length+g.robots.length,30);
 });
});

describe('지속 피해 충전의 시간 일관성',()=>{
 it('농축 앰플 피해량은 프레임 간격과 무관하다',()=>{
  const damages=[30,60,120].map(fps=>{
   const g=quiet({dehumidifier:1});g.relics={thermos:true,concentrate:true};const e=target(g,40);
   for(let n=0;n<fps*4;n++)update(g,1/fps);return e.maxHp-e.hp;
  });
  for(const damage of damages)near(damage,18*1.4*(4+0.6*(1.5+1)));
 });
 it('공진 못은 보물이 직접 날린 얼음 조각에 반응하지 않는다',()=>{
  const g=quiet();g.relics.resonator=true;g.passives.precision=1;const e=target(g);
  for(let n=0;n<12;n++){shot(g,e);g.shots.at(-1).kind='ice';update(g,DT);}
  near(e.maxHp-e.hp,120);assert.equal(e.resonatorHits,undefined);
 });
});
