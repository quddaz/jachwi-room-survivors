import assert from 'node:assert/strict';
import { it } from 'node:test';
import { applyBuild, choose, createGame, outletFieldRadius, rollRelics, statsOf, update } from '../src/engine.js';
import { RELICS } from '../src/rules.js';
import { ITEM_IDS } from '../src/sprites.js';
function setup(split=true, adapters=0, count=12) {
 const g=createGame(()=>.99);applyBuild(g,{treasure:20});g.weapons={};g.relics={outlet:true,...(split?{splitplug:true}:{}),...(adapters?{adapter:adapters}:{})};g.outletIn=0;
 g.spawnCarry=-1e9;g.nextBossAt=g.nextSwarmAt=g.nextXp=Infinity;
 for(let n=0;n<count;n++)g.enemies.push({id:g.nextId++,kind:'roach',x:g.player.x+80+n*30,y:g.player.y,hp:1e8,maxHp:1e8,radius:8,speed:0,damage:0,xp:0,timer:0,kx:0,ky:0});
 return g;
}
it('분배기가 있으면 3줄, 없으면 기존 1줄이 나가고 각 줄 안에서는 대상이 중복되지 않는다',()=>{
 for(const split of [false,true]){const g=setup(split);update(g,1/60);const chains=g.relicAttacks.filter(a=>a.type==='chain');
 assert.equal(chains.length,split?3:1);for(const a of chains){assert.equal(a.targets.length,4);assert.equal(new Set(a.targets.map(t=>t.id)).size,4);}
 assert.equal(new Set(chains.map(a=>a.targets[0].id)).size,chains.length);}
});
it('대상이 하나뿐이어도 세 줄이 실제로 피해를 준다',()=>{
 const g=setup(true,0,1),e=g.enemies[0],base=setup(false,0,1),single=base.enemies[0];
 update(g,1/60);update(base,1/60);assert.ok(single.hp<single.maxHp);assert.ok(Math.abs(e.maxHp-e.hp-(single.maxHp-single.hp)*3)<1e-4);
});
it('어댑터 대상 증가가 세 줄에 각각 적용되고 전기 구체는 한 개로 유지된다',()=>{
 const g=setup(true,5,60);update(g,1/60);const chains=g.relicAttacks.filter(a=>a.type==='chain');
 assert.equal(chains.length,3);assert.ok(chains.every(a=>a.targets.length===54));assert.equal(g.relicAttacks.filter(a=>a.type==='orb').length,1);
});
it('보물 20점과 멀티탭이 있어야 등장하며 중복으로 나오지 않는다',()=>{
 for(const [points,outlet,owned,expected] of [[19,true,false,false],[20,false,false,false],[20,true,false,true],[20,true,true,false]]) {
  const g=setup();applyBuild(g,{treasure:points});g.relics=Object.fromEntries(Object.keys(RELICS).filter(id=>!['outlet','splitplug'].includes(id)).map(id=>[id,true]));
  if(outlet)g.relics.outlet=true;if(owned)g.relics.splitplug=true;assert.equal(rollRelics(g).some(c=>c.id==='splitplug'),expected);
 }
 assert.ok(ITEM_IDS.includes('splitplug'));
});

it('멀티탭을 교체하면 분배기와 어댑터도 함께 제거된다',()=>{
 const g=setup(true,5);g.swapIn='energy';g.choices=[{kind:'relic-swap',id:'outlet'}];choose(g,0);
 assert.equal(g.relics.outlet,undefined);assert.equal(g.relics.splitplug,undefined);assert.equal(g.relics.adapter,undefined);assert.equal(g.relics.energy,true);
});

it('어댑터 5개일 때만 오리 주변에 자기장이 생기고 이동 속도가 증가한다', () => {
 const game = setup(false, 4, 1), enemy = game.enemies[0];
 game.outletIn = Infinity;
 const before = statsOf(game).speed;
 update(game, 1 / 60);
 assert.equal(outletFieldRadius(game), 0);
 assert.equal(enemy.hp, enemy.maxHp);
 game.relics.adapter = 5;
 assert.equal(statsOf(game).speed, before * 1.25);
 assert.ok(outletFieldRadius(game) > 0);
 update(game, 1 / 60);
 const damaged = enemy.hp;
 assert.ok(damaged < enemy.maxHp);
 update(game, 1 / 60);
 assert.equal(enemy.hp, damaged);
 game.relics.adapter = 4;
 assert.equal(outletFieldRadius(game), 0);
 assert.equal(statsOf(game).speed, before);
});
