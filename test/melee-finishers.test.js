import assert from 'node:assert/strict';
import { it } from 'node:test';
import { createGame, update } from '../src/engine.js';
import { FUSIONS, WEAPONS } from '../src/rules.js';
function setup(id, evolved = true) {
 const g=createGame(()=>.99);g.weapons={[id]:evolved ? 5 : 1};g.evolved=evolved ? {[id]:true} : {};g.spawnCarry=-1e9;g.nextBossAt=g.nextSwarmAt=g.nextXp=Infinity;
 const add=(x,y,hp)=>{const e={id:g.nextId++,kind:'roach',x:g.player.x+x,y:g.player.y+y,hp,maxHp:hp,radius:8,speed:0,damage:0,xp:0,timer:0,kx:0,ky:0};g.enemies.push(e);return e;};
 return {g,add};
}
for(const id of ['toyknight','toyaxe','plushbear']) {
 it(`${id}: 직접 처치 시 피니시가 별도 범위를 공격하고 연쇄 처치로 재귀 발동하지 않는다`,()=>{
  const {g,add}=setup(id);add(40,0,1);const collateral=add(100,80,1),outside=add(-500,0,1e6);
  update(g,1/60);assert.ok(collateral.dead);assert.equal(outside.hp,outside.maxHp);
  const effects=g.effects.filter(e=>e.finisher&&e.type!=='paw');assert.equal(effects.length,1);
  assert.ok(g.summons[0].finisherReadyAt>g.time);
 });
 it(`${id}: 처치하지 않으면 피니시가 없고 쿨타임 중 처치해도 다시 발동하지 않는다`,()=>{
  const {g,add}=setup(id);const first=add(40,0,1e6);update(g,1/60);
  assert.ok(!g.effects.some(e=>e.finisher));first.hp=1;g.summons[0].attackIn=0;update(g,1/60);
  const ready=g.summons[0].finisherReadyAt;assert.ok(ready>g.time);
  const next=add(40,0,1);g.summons[0].attackIn=0;update(g,1/60);
  assert.ok(next.dead);assert.equal(g.summons[0].finisherReadyAt,ready);
 });
}
it('근접 소환수는 살아 있고 사거리 안인 추격 대상을 유지하고 죽으면 새 적을 찾는다',()=>{
 const {g,add}=setup('sockpuppet');const first=add(250,0,1e8);update(g,1/60);const unit=g.summons[0];
 const closer=add(80,0,1e8);update(g,1/60);assert.equal(unit.targetId,first.id);
 first.dead=true;update(g,1/60);assert.equal(unit.targetId,closer.id);
});
it('네 근접 소환수의 최대 피해·공격 주기·이동 속도를 함께 상향한다',()=>{
 for(const [id,damage,cd,speed] of [['sockpuppet',40,.65,205],['plushbear',63,.792,225],['toyknight',68,1.05,220],['toyaxe',80,1.152,225]]) {
  assert.ok(WEAPONS[id].damage[4]>damage);assert.ok(WEAPONS[id].cooldown[4]<cd);assert.ok(WEAPONS[id].speed[4]>speed);
 }
});

it('가습기 지속 피해로 적을 처치해도 피니시는 발동하지 않는다',()=>{
 const {g,add}=setup('plushbear');const e=add(40,0,1);g.relics.humidifier=true;
 g.summons=Array.from({length:3},()=>({id:g.nextId++,weapon:'plushbear',x:e.x,y:e.y,angle:0,attackIn:Infinity}));
 for(let i=0;i<15;i++)update(g,1/60);
 assert.ok(e.dead);assert.ok(!g.effects.some(f=>f.finisher));assert.equal(g.summons[0].finisherReadyAt,undefined);
});
it('피니시 쿨타임이 지나면 새로운 직접 처치로 다시 발동한다',()=>{
 const {g,add}=setup('plushbear');add(40,0,1);update(g,1/60);const unit=g.summons[0],previous=unit.finisherReadyAt;
 for(let i=0;i<151;i++)update(g,1/60);
 const e=add(unit.x-g.player.x+20,unit.y-g.player.y,1);unit.attackIn=0;update(g,1/60);
 assert.ok(e.dead);assert.ok(unit.finisherReadyAt>previous);assert.ok(g.effects.some(f=>f.finisher));
});

for (const id of ['toyknight','toyaxe','plushbear']) {
 it(`${id}: 기본 1~5레벨은 피니시가 없고 완성형과 합체에서만 발동한다`,()=>{
  for (const level of [1,2,3,4,5]) {
   const {g,add}=setup(id,false);g.weapons[id]=level;const e=add(40,0,1);update(g,1/60);
   assert.ok(e.dead);assert.ok(!g.effects.some(f=>f.finisher));assert.ok(g.summons.every(u=>u.finisherReadyAt===undefined));
  }
  const {g,add}=setup(id);const [fid,recipe]=Object.entries(FUSIONS).find(([,r])=>r.primary===id) ?? [];
  if (fid) { g.fusions[fid]=true;for(const material of recipe.from){g.weapons[material]=5;g.evolved[material]=true;} }
  add(40,0,1);update(g,1/60);assert.ok(g.effects.some(f=>f.finisher));
 });
}
