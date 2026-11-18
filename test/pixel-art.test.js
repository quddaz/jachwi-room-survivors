import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ART_DENSITY, IMPACT_ART, PIXEL_ACTORS, WALK_FRAMES, materialPixels } from '../src/pixel-art.js';
import { CHARACTERS, ENEMIES } from '../src/rules.js';

describe('도트 원본과 월드 크기', () => {
  it('모든 직업의 걷기·대기 프레임이 같은 크기이고 화면 밖으로 잘리지 않는다', () => {
    for (const role of Object.keys(CHARACTERS)) {
      const frames = Array.from({ length: WALK_FRAMES }, (_, n) => PIXEL_ACTORS[`character_${role}_duckWalk${n}`]);
      assert.ok(new Set(frames.map(rows => rows.join('\n'))).size >= 4, `${role} 걷기 동작`);
      for (const rows of [...frames, ...Array.from({ length: 4 }, (_, n) => PIXEL_ACTORS[`character_${role}_duckIdle${n}`])]) {
        assert.equal(rows.length, 44);
        assert.ok(rows.every(row => row.length === 44));
        assert.ok(rows[43].split('').every(pixel => pixel === '.'));
        assert.equal((rows.length + ART_DENSITY * 2) / ART_DENSITY, 24);
      }
    }
  });
  it('일반 적 전부에 애니메이션 원본이 있으며 빈 프레임이 없다', () => {
    for (const kind of Object.keys(ENEMIES)) {
      if (kind === 'scrap') { assert.ok(PIXEL_ACTORS.scrap); continue; }
      for (const suffix of 'ABCD') {
        const rows = PIXEL_ACTORS[`${kind}${suffix}`];
        assert.ok(rows && rows.some(row => /[^.]/.test(row)), `${kind}${suffix}`);
        assert.ok(rows.every(row => row.length === rows[0].length), `${kind}${suffix} 격자`);
      }
    }
  });
  it('타격 섬광은 짧게 끝나고 후반 파편은 중심의 적을 가리지 않는다', () => {
    for (const frames of Object.values(IMPACT_ART)) {
      assert.notEqual(frames[0][16][16], '.');
      for (const rows of frames.slice(2)) {
        for (let y = 12; y <= 20; y++) assert.ok(/^\.+$/.test(rows[y].slice(12, 21)));
      }
    }
  });
  it('재질 명암은 투명 영역과 물건의 실루엣·월드 크기를 바꾸지 않는다', () => {
    const rows = ['..BB.', '.BWB.', '..BB.'];
    const source = structuredClone(rows);
    for (const shaded of [true, false]) {
      const refined = materialPixels(rows, shaded);
      assert.equal(refined.length / ART_DENSITY, rows.length);
      for (let y = 0; y < refined.length; y++) for (let x = 0; x < refined[y].length; x++) {
        assert.equal(refined[y][x] === '.', rows[Math.floor(y / ART_DENSITY)][Math.floor(x / ART_DENSITY)] === '.');
      }
    }
    assert.deepEqual(rows, source);
  });
});
