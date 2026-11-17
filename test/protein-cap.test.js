import assert from 'node:assert/strict';
import { it } from 'node:test';
import { createGame, rollChoices, choose, statsOf, describeChoice } from '../src/engine.js';
import { WEAPONS, EVOLUTIONS, FUSIONS, PASSIVES, passiveMaxLevel } from '../src/rules.js';
it('프로틴 10레벨 이후에도 강화하고 20레벨에서 선택지가 끝난다',()=>{
 const g=createGame(()=>.99);
 g.weapons=Object.fromEntries(Object.keys(WEAPONS).map(id=>[id,5]));
 g.evolved=Object.fromEntries(Object.keys(EVOLUTIONS).map(id=>[id,true]));
 g.fusions=Object.fromEntries(Object.keys(FUSIONS).map(id=>[id,true]));
 g.passives=Object.fromEntries(Object.keys(PASSIVES).map(id=>[id,passiveMaxLevel(id)]));
 for(let level=10;level<20;level++){
  g.passives.protein=level;const c=rollChoices(g).find(c=>c.id==='protein');assert.equal(c.level,level+1);
 }
 g.passives.protein=19;g.choices=rollChoices(g);choose(g,g.choices.findIndex(c=>c.id==='protein'));
 assert.equal(g.passives.protein,20);assert.ok(!rollChoices(g).some(c=>c.id==='protein'));
});
it('프로틴은 20레벨에 공격력 +200%이고 마지막 카드도 190%에서 200%로 표시한다',()=>{
 const g=createGame();g.passives.protein=20;assert.equal(statsOf(g).might,3);
 assert.deepEqual(describeChoice(g,{kind:'passive',id:'protein',level:20}),['공격력 +190% → +200%']);
});
