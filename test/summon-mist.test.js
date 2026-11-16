import assert from 'node:assert/strict';
import { it } from 'node:test';
import { applyBuild, createGame, rollRelics, statsOf, summonMistSources, update } from '../src/engine.js';
import { RELICS } from '../src/rules.js';
import { ITEM_IDS } from '../src/sprites.js';
function scene(count = 1) {
  const g = createGame(() => .99);
  g.weapons = count ? { sockpuppet: 1 } : {};
  g.passives = count > 1 ? { summonwhistle: count - 1 } : {};
  g.relics = { humidifier: true };
  g.spawnCarry = -1e9; g.nextBossAt = g.nextSwarmAt = g.nextXp = Infinity;
  const e = { id: g.nextId++, kind: 'roach', x: g.player.x + 100, y: g.player.y, hp: 1e8, maxHp: 1e8, radius: 10, speed: 0, damage: 0, xp: 0, timer: 0, kx: 0, ky: 0 };
  g.enemies.push(e);
  g.summons = Array.from({ length: count }, () => ({ id: g.nextId++, weapon: 'sockpuppet', x: e.x, y: e.y, angle: 0, attackIn: Infinity }));
  return { g, e };
}
function run(g, seconds = 1, dt = 1/60) { for (let n=0;n<Math.round(seconds/dt);n++) update(g,dt); }
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-4, `${a} != ${b}`);
it('휴대용 가습기는 소환 20점부터 보물로 등장하고 전용 아이콘이 있다', () => {
  for (const points of [19,20]) {
    const {g} = scene(); applyBuild(g,{summon:points});
    g.relics = Object.fromEntries(Object.keys(RELICS).filter(id=>id!=='humidifier').map(id=>[id,true]));
    assert.equal(rollRelics(g).some(c=>c.id==='humidifier'),points===20);
  }
  assert.ok(ITEM_IDS.includes('humidifier'));
});
it('소환수가 없으면 피해가 없고 한 적에게 안개는 최대 3개만 겹친다', () => {
  for (const count of [0,1,2,3,4]) {
    const {g,e}=scene(count); run(g);
    close(e.maxHp-e.hp,24*Math.min(count,3));
  }
});
it('범위 밖 적은 피해를 받지 않으며 범위 증가가 적용된다', () => {
  const plain=scene(), large=scene();
  for(const {g,e} of [plain,large]) { e.x=g.player.x+220; g.summons[0].x=g.player.x; }
  // 소환수와 적이 이동하지 않도록 테스트 구간을 한 프레임으로 한정한다.
  plain.g.summonMistElapsed=large.g.summonMistElapsed=.24;
  large.g.relics.bigpot=true;
  plain.e.x=large.e.x=plain.g.player.x+100;
  update(plain.g,.01);update(large.g,.01);
  close(plain.e.maxHp-plain.e.hp,0); assert.ok(large.e.hp<large.e.maxHp);
});
it('소환·보물·지속 피해 증가를 받고 고정 피해와 타격 효과는 발동하지 않는다', () => {
  const {g,e}=scene(); applyBuild(g,{summon:20});
  g.passives={polish:5,protein:10,precision:5}; g.relics.thermos=true;g.relics.match=true;g.relics.icetray=true;g.random=()=>0;
  const stats=statsOf(g);run(g);
  close(e.maxHp-e.hp,24*stats.might*stats.relicPower*stats.summonPower*1.4);
  assert.equal(e.burnUntil,undefined);assert.equal(e.freezeUntil,undefined);
});
it('공속과 우상 추가 발동에 영향받지 않고 프레임 간격이 달라도 같은 피해를 준다', () => {
  for(const dt of [1/30,1/60,1/120]) {
    const {g,e}=scene();g.passives.idol=1;g.passives.battery=5;
    const stats=statsOf(g);run(g,1,dt);
    close(e.maxHp-e.hp,24*stats.might*stats.relicPower*stats.summonPower);
  }
});
it('로봇·마린·레이저 드론·용은 개체 단위로 안개를 만들고 비활성 재료는 제외한다', () => {
  const {g}=scene();g.weapons={robot:5,toydragon:5};g.summons=[{weapon:'toydragon',spine:Array(20).fill({})},{weapon:'sockpuppet'}];g.robots=[{marine:true}];g.drones=[{}];
  assert.equal(summonMistSources(g).length,2);
  g.fusions.dronebase=true;assert.equal(summonMistSources(g).length,3);
  delete g.relics.humidifier;assert.equal(summonMistSources(g).length,0);
});
it('소환수나 보물을 제거하면 즉시 피해가 멈춘다', () => {
  for(const remove of ['weapon','relic']) {
    const {g,e}=scene();run(g);const hp=e.hp;
    if(remove==='weapon')g.weapons={};else delete g.relics.humidifier;
    run(g);close(e.hp,hp);assert.equal(summonMistSources(g).length,0);
  }
});
