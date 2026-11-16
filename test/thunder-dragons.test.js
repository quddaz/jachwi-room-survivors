import assert from 'node:assert/strict';
import { it } from 'node:test';
import { applyBuild, choose, createGame, rollChoices, summonMistSources, update } from '../src/engine.js';
import { FUSIONS } from '../src/rules.js';
import { ITEM_IDS } from '../src/sprites.js';
function setup(fused=true) {
  const g=createGame(()=>.7);g.weapons={toydragon:5,zapper:5};g.evolved={toydragon:true,zapper:true};
  g.spawnCarry=-1e9;g.nextBossAt=g.nextSwarmAt=g.nextXp=Infinity;
  if(fused)g.fusions.thunderdragons=true;
  for(let i=0;i<8;i++)g.enemies.push({id:g.nextId++,kind:'roach',x:g.player.x+100+i*20,y:g.player.y+20,hp:1e8,maxHp:1e8,radius:10,speed:0,damage:0,xp:0,timer:0,kx:0,ky:0});
  return g;
}
function run(g,n=180){for(let i=0;i<n;i++)update(g,1/60);}
it('청룡과 전기 모기채의 완성형으로 쌍룡 뇌우 합체를 선택한다',()=>{
 const g=setup(false);const c=rollChoices(g).find(c=>c.id==='thunderdragons');assert.ok(c);g.choices=[c];choose(g,0);run(g,1);
 assert.equal(g.summons.length,2);assert.equal(g.cooldowns.zapper,undefined);assert.ok(ITEM_IDS.includes(FUSIONS.thunderdragons.icon));
});
it('두 용은 독립적으로 이동하고 증원은 머리 대신 각 몸통을 늘린다',()=>{
 const g=setup();run(g,1);const before=g.summons[0].spine.length;applyBuild(g,{summon:20});g.passives.summonwhistle=3;run(g);
 assert.equal(g.summons.length,2);assert.ok(g.summons.every(u=>u.spine.length>before));
 assert.notEqual(g.summons[0].x,g.summons[1].x);assert.ok(g.summons.every(u=>[u,...u.spine].every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))));
 g.relics.humidifier=true;assert.equal(summonMistSources(g).length,2);
});
it('하늘에서 내리는 낙뢰가 실제 범위 피해를 주고 전기 모기채 공격은 대체한다',()=>{
 const g=setup();run(g);assert.ok(g.enemies.some(e=>e.hp<e.maxHp));
 assert.ok(g.effects.some(f=>f.weapon==='toydragon'&&f.type==='bolt'&&f.points[0].y<f.points[1].y));
 assert.ok(g.effects.every(f=>f.weapon!=='zapper'));assert.ok(g.enemies.some(e=>Object.keys(e.dragonHits??{}).length===2));
 assert.ok(g.effects.length<=240);
});
it('합체가 없으면 용은 한 마리이고 낙뢰를 떨어뜨리지 않는다',()=>{
 const g=setup(false);delete g.weapons.zapper;run(g);assert.equal(g.summons.length,1);assert.ok(!g.effects.some(f=>f.weapon==='toydragon'&&f.type==='bolt'));
});
