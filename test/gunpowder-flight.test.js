import assert from 'node:assert/strict';
import { it } from 'node:test';
import { applyBuild, createGame, update } from '../src/engine.js';
import { RELICS } from '../src/rules.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function volley({powder=false,treasure=20,area=false,stacks=0}={}){
 const g=createGame(()=>.99);applyBuild(g,{treasure});g.weapons={};g.relics={firecracker:true,...(powder?{gunpowder:true}:{}),...(stacks?{mlrs:stacks}:{})};
 if(area)g.passives.wipes=5;g.fireIn=0;g.spawnCarry=-1e9;g.nextBossAt=g.nextSwarmAt=g.nextXp=Infinity;
 update(g,1/60);return g.relicAttacks.filter(a=>a.type==='firework');
}
it('고성능 화약 하나가 폭발 반경 50%와 낙하 속도 30%를 함께 높인다',()=>{
 const plain=volley(),powder=volley({powder:true});
 near(powder[0].radius/plain[0].radius,1.5);
 for(let n=0;n<plain.length;n++)near(powder[n].life,plain[n].life/1.3);
 near(powder[1].life-powder[0].life,RELICS.firecracker.gapSec/1.3);
});
it('화약이 없으면 보물 점수와 물티슈가 올라도 기존 착탄 시간을 유지한다',()=>{
 const plain=volley({treasure:0}),treasure=volley(),wide=volley({area:true});
 for(const shots of [plain,treasure,wide])for(let n=0;n<shots.length;n++)near(shots[n].life,RELICS.firecracker.aimSec+n*RELICS.firecracker.gapSec);
 assert.ok(wide[0].radius>treasure[0].radius);near(plain[0].radius,treasure[0].radius);
});
it('다연장 중첩의 마지막 로켓까지 화약 속도 보너스를 적용하고 발수는 유지한다',()=>{
 const plain=volley({stacks:5}),powder=volley({stacks:5,powder:true});
 assert.equal(plain.length,28);assert.equal(powder.length,28);near(powder.at(-1).life,plain.at(-1).life/1.3);
});
