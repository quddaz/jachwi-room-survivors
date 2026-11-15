import assert from 'node:assert/strict';
import { it } from 'node:test';
import { applyBuild, createGame, damageEnemy, update } from '../src/engine.js';
import { BUILD } from '../src/rules.js';
function game(points=20,random=0){const g=createGame(()=>random);applyBuild(g,{treasure:points});g.weapons={};g.spawnCarry=-1e9;g.nextBossAt=g.nextSwarmAt=g.nextXp=Infinity;return g;}
function kill(g,boss=false){const e={id:g.nextId++,kind:'roach',label:'보스',x:g.player.x+100,y:g.player.y,hp:1,maxHp:1,radius:10,speed:0,damage:0,xp:0,timer:0,kx:0,ky:0,boss};g.enemies.push(e);damageEnemy(g,e,100);}
const bonusChests=g=>g.drops.filter(d=>d.type==='chest'&&d.source==='treasure');
it('보물 20점에서만 확률보다 낮은 추첨으로 일반 적의 보물상자가 나온다',()=>{
 for(const points of [0,19,20]){const g=game(points);kill(g);assert.equal(bonusChests(g).length,points===20?1:0);}
 const g=game(20,BUILD.treasure.perks[20].chestChance);kill(g);assert.equal(bonusChests(g).length,0);
});
it('우상의 소모품 드랍 보너스가 상자 확률을 높이지 않는다',()=>{
 const g=game(20,.001);g.passives.idol=1;kill(g);assert.equal(bonusChests(g).length,0);
});
it('미수거 보너스 상자는 2개까지만 쌓이고 보스 확정 상자는 계속 나온다',()=>{
 const g=game();for(let n=0;n<4;n++)kill(g);assert.equal(bonusChests(g).length,2);
 kill(g,true);assert.equal(g.drops.filter(d=>d.type==='chest').length,3);
 const lower=game(19);kill(lower,true);assert.equal(lower.drops.filter(d=>d.type==='chest').length,1);
});
it('추가 상자를 주우면 보물 선택창이 열리고 다시 드랍될 자리가 생긴다',()=>{
 const g=game();kill(g);const chest=bonusChests(g)[0];g.drops=[chest];chest.x=g.player.x;chest.y=g.player.y;
 update(g,1/60);assert.equal(g.pendingRelics,1);assert.ok(g.choices.every(c=>c.kind==='relic'));assert.equal(bonusChests(g).length,0);
 g.choices=null;g.pendingRelics=0;kill(g);assert.equal(bonusChests(g).length,1);
});
