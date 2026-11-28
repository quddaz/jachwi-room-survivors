import assert from 'node:assert/strict';
import { it } from 'node:test';
import { applyBuild, createGame, update } from '../src/engine.js';
import { RELICS } from '../src/rules.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function volley({treasure=20,area=false,stacks=0}={}){
 const g=createGame(()=>.99);applyBuild(g,{treasure});g.weapons={};g.relics={firecracker:true,...(stacks?{mlrs:stacks}:{})};
 if(area)g.passives.wipes=5;g.fireIn=0;g.spawnCarry=-1e9;g.nextBossAt=g.nextSwarmAt=g.nextXp=Infinity;
 update(g,1/60);return g.relicAttacks.filter(a=>a.type==='firework');
}
const fall=1+RELICS.firecracker.fallSpeed;
it('폭죽은 기본으로 넓게 터지고 30% 빨리 떨어진다',()=>{
 const shots=volley({treasure:0});
 assert.equal(RELICS.firecracker.radius,135);
 for(let n=0;n<shots.length;n++)near(shots[n].life,(RELICS.firecracker.aimSec+n*RELICS.firecracker.gapSec)/fall);
});
it('보물 점수와 물티슈는 범위만 바꾸고 착탄 시간은 그대로다',()=>{
 const plain=volley({treasure:0}),treasure=volley(),wide=volley({area:true});
 for(const shots of [plain,treasure,wide])for(let n=0;n<shots.length;n++)near(shots[n].life,plain[n].life);
 assert.ok(wide[0].radius>treasure[0].radius);near(plain[0].radius,treasure[0].radius);
});
it('다연장 중첩의 마지막 로켓까지 빠른 낙하를 적용한다',()=>{
 const shots=volley({stacks:4});
 assert.equal(shots.length,20);near(shots.at(-1).life,(RELICS.firecracker.aimSec+(shots.length-1)*RELICS.firecracker.gapSec)/fall);
});
it('다음 주기 폭죽이 쌓여도 앞서 쏜 로켓은 사라지지 않고 모두 터진다',()=>{
 const g=createGame(()=>.99);applyBuild(g,{treasure:20});g.weapons={};g.relics={firecracker:true,mlrs:6};g.passives.idol=1;
 g.fireIn=0;g.spawnCarry=-1e9;g.nextBossAt=g.nextSwarmAt=g.nextXp=Infinity;
 const queued=new Set();let blasts=0;
 // 주기마다 바로 다시 쏘게 해서 앞 주기 로켓이 떨어지기 전에 새 로켓이 쌓이게 한다.
 for(let frame=0;frame<60*8;frame++){
  if(frame%60===0)g.fireIn=0;
  update(g,1/60);
  for(const attack of g.relicAttacks)if(attack.type==='firework')queued.add(attack.seed);
  blasts+=g.effects.filter(effect=>effect.type==='nova'&&effect.age===0).length;
 }
 g.fireIn=1e9;
 for(let frame=0;frame<60*6;frame++){update(g,1/60);blasts+=g.effects.filter(effect=>effect.type==='nova'&&effect.age===0).length;}
 assert.ok(queued.size>64);
 assert.equal(blasts,queued.size);
});
