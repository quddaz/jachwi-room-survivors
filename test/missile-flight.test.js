import assert from 'node:assert/strict';
import { it } from 'node:test';
import { applyBuild, createGame, statsOf, update } from '../src/engine.js';
import { RELICS } from '../src/rules.js';
const DT=1/60;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function scene(points=0){const g=createGame(()=>.99);applyBuild(g,{treasure:points});g.weapons={};g.relics={firecracker:true};g.fireIn=0;g.spawnCarry=-1e9;g.nextBossAt=g.nextSwarmAt=g.nextXp=Infinity;return g;}
function fire(g){update(g,DT);return g.relicAttacks.filter(a=>a.type==='firework');}
it('보물 20점의 범위 +28%와 낙하 속도 +56%가 함께 반영된다',()=>{
 const base=scene(),treasure=scene(20),plain=fire(base),boosted=fire(treasure);
 near(statsOf(treasure).relicArea,1.28);near(statsOf(treasure).relicFlightSpeed,1.56);
 near(boosted[0].radius/plain[0].radius,1.28);assert.ok(boosted[0].life<plain[0].life);
 near(plain[0].life,RELICS.firecracker.aimSec);
});
it('물티슈와 고성능 화약으로 범위를 넓히면 첫 착탄과 후속 간격이 모두 빨라진다',()=>{
 const a=scene(20),b=scene(20),c=scene(20);b.passives.wipes=5;c.passives.wipes=5;c.relics.gunpowder=true;
 const shots=[a,b,c].map(fire);
 for(let n=1;n<shots.length;n++){
  assert.ok(shots[n][0].radius>shots[n-1][0].radius);assert.ok(shots[n][0].life<shots[n-1][0].life);
  assert.ok(shots[n][1].life-shots[n][0].life<shots[n-1][1].life-shots[n-1][0].life);
 }
});
it('보물 20점의 5중첩 미사일 28발은 모두 0.73초 안에 착탄한다',()=>{
 const g=scene(20);g.relics.mlrs=5;const shots=fire(g);assert.equal(shots.length,28);
 assert.ok(Math.max(...shots.map(s=>s.life))<.73);
 for(let n=0;n<45;n++)update(g,DT);assert.equal(g.relicAttacks.filter(a=>a.type==='firework').length,0);
});
it('달려오는 적이 예전 조준 위치를 벗어나기 전에 미사일이 맞는다',()=>{
 const g=scene(20);const e={id:g.nextId++,kind:'roach',x:g.player.x+300,y:g.player.y,hp:1e6,maxHp:1e6,radius:10,speed:200,damage:0,xp:0,timer:0,kx:0,ky:0};g.enemies.push(e);
 for(let n=0;n<14;n++)update(g,DT);assert.ok(e.hp<e.maxHp);
});
