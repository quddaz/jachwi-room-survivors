import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyBuild, applyCharacter, createGame, statsOf } from '../src/engine.js';
import { fetchRanking, rankBest, submitRecord } from '../src/leaderboard.js';
import { captureRunBuild, normalizeRunBuild, runBuildWeapons } from '../src/run-build.js';

function build() {
  const game = createGame(() => 0.99);applyCharacter(game, 'summoner');applyBuild(game, { summon:20, haste:10 });
  game.weapons = { stapler:5, spray:5, toydragon:5, robot:3 };
  game.evolved = { stapler:true, spray:true, toydragon:true };
  game.fusions = { poisongun:true };
  game.passives = { summonwhistle:3, clover:4 };game.relics = { baton:true, marchdrum:true };
  return game;
}
const snapshot = () => { const game = build();return captureRunBuild(game, statsOf(game)); };

describe('최고 기록에 함께 저장하는 조합', () => {
  it('캐릭터·배분·장비와 당시 수치를 복사해 이후 게임 상태가 변해도 유지한다', () => {
    const game = build(), saved = captureRunBuild(game, statsOf(game));
    assert.equal(saved.character, 'summoner');assert.equal(saved.build.summon, 20);
    assert.deepEqual(saved.fusions, ['poisongun']);assert.equal(saved.stats.summonCount, 4);
    assert.deepEqual(saved.weapons.find(weapon => weapon.id === 'toydragon'), {id:'toydragon',level:5,evolved:true});
    game.build.summon = 0;game.weapons.toydragon = 1;game.relics.baton = false;game.passives.summonwhistle = 0;
    assert.equal(saved.build.summon, 20);assert.equal(saved.weapons.find(weapon => weapon.id === 'toydragon').level, 5);
    assert.ok(saved.relics.includes('baton'));assert.equal(saved.stats.summonCount, 4);
  });
  it('합체 재료를 중복 표시하지 않고 작동하는 합체와 독립 무기만 표시한다', () => {
    const items = runBuildWeapons(snapshot());
    assert.deepEqual(items.map(item => item.id), ['poisongun','toydragon','robot']);
    assert.equal(items[1].label, '청룡');assert.equal(items[1].icon, 'azuredragon');assert.equal(items[2].badge, 'Lv 3');
  });
  it('알 수 없는 ID·중복·범위 밖 레벨·임의 문자열 수치를 걸러 표시한다', () => {
    const saved = snapshot();saved.weapons.push({id:'<img onerror=alert(1)>',level:5},{id:'robot',level:1});
    saved.passives.push({id:'summonwhistle',level:99},{id:'protein',level:99});saved.relics.push('baton','unknown');
    saved.stats.critChance = '100%';saved.stats.flatDamage = Infinity;saved.stats.secret = 'private';
    const safe = normalizeRunBuild(saved);
    assert.equal(safe.weapons.length, 4);assert.equal(safe.passives.find(item => item.id === 'protein').level, 10);
    assert.deepEqual(safe.relics, ['baton','marchdrum']);
    assert.equal(safe.stats.critChance, undefined);assert.equal(safe.stats.flatDamage, undefined);assert.equal(safe.stats.secret, undefined);
  });
  it('이전 기록과 잘못된 형식은 오리나 배분을 추측하지 않는다', () => {
    for (const value of [null,undefined,[],{}, {version:2}, {...snapshot(),character:'constructor'}]) assert.equal(normalizeRunBuild(value), null);
    const saved = snapshot();saved.weapons = saved.weapons.filter(weapon => weapon.id !== 'spray');
    assert.deepEqual(normalizeRunBuild(saved).fusions, []);
  });
  it('나중에 더 짧게 버틴 판의 조합으로 최고 기록의 조합을 덮지 않는다', () => {
    const best = snapshot(), later = {...snapshot(),character:'gunner'};
    const rows = rankBest([
      {crewName:'쿠다',survivedMs:600000,kills:1000,createdAt:'2026-11-15T00:00:00Z',loadout:best},
      {crewName:'쿠다',survivedMs:300000,kills:2000,createdAt:'2026-11-15T01:00:00Z',loadout:later},
    ]);
    assert.equal(rows.length, 1);assert.equal(rows[0].loadout.character, 'summoner');assert.equal(rows[0].survivedMs, 600000);
  });
  it('공유 랭킹 저장·조회 요청에 같은 조합 정보를 포함한다', async () => {
    const saved = snapshot(), calls = [], original = globalThis.fetch;
    globalThis.fetch = async (url, options = {}) => {
      calls.push({url:String(url),body:options.body && JSON.parse(options.body)});
      return {ok:true,json:async()=>[{crew_name:'쿠다',best_survived_ms:600000,kills:1000,level:40,created_at:'2026-11-15T00:00:00Z',loadout:saved},
        {crew_name:'이전 기록',best_survived_ms:300000,kills:500,level:20,created_at:'2026-11-15T00:00:00Z'}]};
    };
    try {
      await submitRecord({crewName:'쿠다',survivedMs:600000,kills:1000,level:40,loadout:saved});
      const ranking = await fetchRanking(4);
      assert.equal(calls[0].body.season, 4);assert.deepEqual(calls[0].body.loadout, saved);
      assert.ok(calls[1].url.includes('created_at,loadout'));assert.ok(calls[1].url.includes('season=eq.4'));
      assert.deepEqual(ranking[0].loadout, saved);assert.equal(ranking[1].loadout, null);
    } finally {globalThis.fetch = original;}
  });
});

describe('조합 열을 추가하기 전의 기록 호환',()=>{
 it('조합 열만 없는 경우 점수 저장과 기존 랭킹 조회를 유지한다',async()=>{
  const original=globalThis.fetch,calls=[];
  globalThis.fetch=async(url,options={})=>{
   const body=options.body?JSON.parse(options.body):null;calls.push({url:String(url),body});
   const missing=body ? 'loadout' in body : String(url).includes(',loadout');
   if(missing)return {ok:false,status:400,clone:()=>({json:async()=>({code:body?'PGRST204':'42703',message:'loadout column does not exist'})})};
   return {ok:true,json:async()=>[{crew_name:'이전',best_survived_ms:500000,kills:100,level:10,created_at:'2026-11-15'}]};
  };
  try{
   assert.deepEqual(await submitRecord({crewName:'검증',survivedMs:1,kills:1,level:1,loadout:snapshot()}),{loadoutSaved:false});
   const rows=await fetchRanking();assert.equal(rows[0].loadout,null);assert.equal(calls.length,4);assert.ok(!('loadout' in calls[1].body));
  }finally{globalThis.fetch=original;}
 });
 it('권한·연결 오류는 재시도하거나 조합 정보 없음으로 숨기지 않는다',async()=>{
  const original=globalThis.fetch;let count=0;
  globalThis.fetch=async()=>{count++;return {ok:false,status:403};};
  try{await assert.rejects(()=>fetchRanking(),/403/);assert.equal(count,1);}finally{globalThis.fetch=original;}
 });
});
