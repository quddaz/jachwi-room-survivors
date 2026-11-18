import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { VFX, drawCombatBeam, drawFlameJet, drawCombatPulse, drawCombatLightning, drawCombatTrail, drawCombatDebris, drawSwordScar } from '../src/combat-vfx.js';

function context() {
  const stack = [];
  return {
    globalAlpha: .7, fillStyle: '#123456',
    save() { stack.push([this.globalAlpha, this.fillStyle]); },
    restore() { [this.globalAlpha, this.fillStyle] = stack.pop(); },
    translate(...args) { assert.ok(args.every(Number.isFinite)); },
    rotate(angle) { assert.ok(Number.isFinite(angle)); },
    fillRect(...args) { assert.ok(args.every(Number.isFinite), `유효하지 않은 도트: ${args}`); },
    drawImage(image, ...args) { assert.ok(image); assert.ok(args.every(Number.isFinite)); },
  };
}

describe('전투 연출의 렌더링 경계', () => {
  it('작은 범위·큰 범위·시작과 종료 프레임에서 좌표가 유효하고 후속 그림의 상태를 보존한다', () => {
    const original = globalThis.document;
    globalThis.document = { createElement: () => ({ getContext: context }) };
    try {
      for (const progress of [0,.01,.25,.5,.8,1]) for (const radius of [1,24,160]) {
        const paints = [
          ctx => drawCombatBeam(ctx,20,20,.8,radius,radius/4,VFX.electric,7,progress),
          ctx => drawFlameJet(ctx,20,20,-2,radius,.4,progress*12),
          ctx => drawCombatPulse(ctx,20,20,radius,progress,'water',12),
          ctx => drawCombatLightning(ctx,[[0,0],[radius,20],[20,radius]],progress,12,true),
          ctx => drawCombatTrail(ctx,20,20,0,0,'poison',2,progress),
          ctx => drawCombatDebris(ctx,20,20,progress,VFX.physical,7,20,true),
          ctx => drawSwordScar(ctx,20,20,radius,-1,Math.PI*1.4,progress,true,4),
        ];
        for (const paint of paints) {
          const ctx = context();paint(ctx);
          assert.equal(ctx.globalAlpha,.7);
          assert.equal(ctx.fillStyle,'#123456');
        }
      }
    } finally {
      if (original === undefined) delete globalThis.document;
      else globalThis.document = original;
    }
  });
  it('완성형의 넓은 화염도 공격 반경보다 큰 직사각형으로 늘어나지 않는다', () => {
    const original=globalThis.document;
    globalThis.document={createElement:()=>({getContext:context})};
    try {
      for(const spread of [.5,.75,1.3]) {
        const ctx=context();let calls=0;
        ctx.drawImage=(image,x,y,width,height)=>{
          assert.ok(width<=170);
          assert.ok(height<=330);
          calls++;
        };
        drawFlameJet(ctx,0,0,0,160,spread,0);
        assert.equal(calls,1);
      }
    } finally {
      if(original===undefined)delete globalThis.document;else globalThis.document=original;
    }
  });

});
