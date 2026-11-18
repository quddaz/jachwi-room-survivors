// 판정·피해·발사 주기와 분리한 전투 그림. 작은 색 묶음과 반 칸 도트만 쓴다.
export const VFX = {
  fire: ['#8f4036', '#ed9551', '#ffe0a3'],
  electric: ['#355c89', '#68cddd', '#e2f9ed'],
  poison: ['#45664b', '#92c578', '#dfedb2'],
  water: ['#487996', '#9bcfda', '#edf5e7'],
  physical: ['#805e53', '#d7ae78', '#fff0c7'],
  summon: ['#665689', '#b9acd9', '#f3eedf'],
};

const noise = (seed, n) => {
  const value = Math.sin((seed || 0) * 12.9898 + n * 78.233) * 43758.5453;
  return value - Math.floor(value);
};
const dot = (ctx, x, y, w = 1, h = w) => ctx.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, w, h);
function stroke(ctx, x0, y0, x1, y1, color, width = .5) {
  ctx.fillStyle = color;
  const steps = Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0)) * 2);
  for(let n=0;n<=steps;n++) dot(ctx,x0+(x1-x0)*n/Math.max(1,steps),y0+(y1-y0)*n/Math.max(1,steps),width);
}
function arc(ctx, x, y, radius, start, end, color, width = .5) {
  const steps = Math.max(4,Math.ceil(Math.abs(end-start)*radius*1.5));
  ctx.fillStyle = color;
  for(let n=0;n<=steps;n++) {
    const a = start+(end-start)*n/steps;
    dot(ctx,x+Math.cos(a)*radius,y+Math.sin(a)*radius,width);
  }
}

export function drawCombatBeam(ctx,x,y,angle,reach,halfWidth,palette,seed,progress) {
  const [edge,body,core]=palette, half=Math.max(.75,halfWidth);
  const fade=Math.min(1,(1-progress)*2.5), length=Math.max(0,reach-8);
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(angle);
  // 흰 면을 넓게 덮지 않고 얇은 중심선과 색 있는 외피로 굵기를 읽힌다.
  ctx.globalAlpha*=fade*.25;ctx.fillStyle=edge;ctx.fillRect(8,-half-2,length,half*2+4);
  ctx.globalAlpha=fade*.55;ctx.fillStyle=body;ctx.fillRect(8,-half,length,half*2);
  ctx.globalAlpha=fade*.9;ctx.fillStyle=body;ctx.fillRect(8,-half*.45,length,half*.9);
  ctx.fillStyle=core;ctx.fillRect(8,-Math.min(1.5,half*.25),length,Math.min(3,half*.5));
  // 양쪽 가장자리에 짧은 빛줄기가 흐르고 흰 파편은 중심 밖으로 흩뿌리지 않는다.
  ctx.globalAlpha=fade*.8;
  for(let n=0;n<6;n++) {
    const at=8+((noise(seed,n)*.7+progress*.8)%1)*length;
    ctx.fillStyle=n%2?body:core;
    ctx.fillRect(at,(n%2?1:-1)*(half*.8),Math.min(10+n*2,reach-at),.5);
  }
  ctx.globalAlpha=fade;ctx.fillStyle=core;ctx.fillRect(6,-2,3,4);
  ctx.restore();
}

const flameFrames = new Map();
const flamePixels = new Map();
const projectedFlames = new Map();
const FIRE_SHAPES = [
  ['#d64c2c',[[0,13],[7,10],[12,8],[16,4],[16,8],[22,2],[21,7],[27,5],[28,1],[31,5],[30,9],[34,7],[37,11],[35,15],[38,17],[33,21],[29,19],[27,24],[23,20],[19,21],[17,17],[12,18],[8,15]]],
  ['#f78c28',[[1,13],[9,10],[14,9],[18,5],[17,11],[23,7],[24,4],[27,9],[30,7],[29,12],[34,11],[32,16],[35,18],[29,18],[27,21],[23,17],[19,18],[15,15],[9,15]]],
  ['#ffce50',[[1,13],[9,11],[14,9],[18,7],[17,12],[23,9],[21,14],[28,14],[25,17],[19,16],[16,14],[11,15],[7,14]]],
  ['#fff1bd',[[0,13],[5,11],[10,12],[12,10],[11,14],[7,14],[4,15]]],
];
function insidePolygon(x,y,points) {
  let inside=false;
  for(let a=0,b=points.length-1;a<points.length;b=a++) {
    const [ax,ay]=points[a],[bx,by]=points[b];
    if((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside;
}
function flameFrame(frame) {
  if(flameFrames.has(frame))return flameFrames.get(frame);
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=84;
  const g=canvas.getContext('2d'),pixels=Array(128*84).fill(null);
  for(const [color,shape] of FIRE_SHAPES) {
    const points=shape.map(([x,y],n)=>[x,y+(x>10?Math.sin(n*2.3+frame*1.57)*.8:0)]);
    g.fillStyle=color;
    for(let y=0;y<84;y++)for(let x=0;x<128;x++) {
      if(insidePolygon(x/3.2,y/3.2,points)){g.fillRect(x,y,1,1);pixels[y*128+x]=color;}
    }
  }
  flamePixels.set(frame,pixels);flameFrames.set(frame,canvas);return canvas;
}

function projectedFlame(frame,reach,spread) {
  const r=Math.max(1,Math.round(reach)),arc=Math.max(.01,Math.min(Math.PI/2,Math.round(spread*100)/100));
  const key=`${frame}|${r}|${arc}`;
  if(projectedFlames.has(key))return projectedFlames.get(key);
  flameFrame(frame);
  const side=Math.ceil(Math.sin(arc)*r),canvas=document.createElement('canvas');
  canvas.width=(r+3)*2;canvas.height=(side*2+6)*2;
  const g=canvas.getContext('2d'),pixels=flamePixels.get(frame);
  // 넓은 부채꼴도 세로로 잡아늘리지 않고 원화의 좌표를 실제 극좌표에 투영한다.
  for(let y=0;y<84;y++)for(let x=0;x<128;x++) {
    const color=pixels[y*128+x];if(!color)continue;
    const radius=x/127*r,angle=(y-42)/42*arc;
    g.fillStyle=color;
    g.fillRect(Math.round(Math.cos(angle)*radius*2),Math.round((side+3+Math.sin(angle)*radius)*2),Math.ceil(r/127*2)+1,Math.ceil(radius*arc/42*2)+1);
  }
  const result={canvas,side};
  if(projectedFlames.size>=24)projectedFlames.clear();
  projectedFlames.set(key,result);return result;
}

export function drawFlameJet(ctx,x,y,angle,reach,spread,time) {
  const frame=Math.floor(time*12)%4,{canvas,side}=projectedFlame(frame,Math.max(1,reach-7),spread);
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(angle);
  ctx.globalAlpha*=.76;
  ctx.drawImage(canvas,7,-side-3,canvas.width/2,canvas.height/2);
  ctx.globalAlpha=.7;
  for(let n=0;n<5;n++) {
    const travel=(time*1.1+n*.21)%1,radius=reach*(.65+travel*.35),a=(noise(n,2)-.5)*spread*1.7;
    ctx.fillStyle=n%2?'#ffce50':'#f78c28';dot(ctx,Math.cos(a)*radius,Math.sin(a)*radius-travel*3,1,.5);
  }
  ctx.restore();
}

export function drawSwordScar(ctx,x,y,radius,angle,sweep,progress,evolved=false,seed=0) {
  const swing=Math.min(1,progress/.28), head=angle-sweep/2+sweep*(1-(1-swing)**3);
  const tail=head-sweep*Math.min(.72,swing), fade=Math.max(0,1-progress)**1.1;
  const segments=Math.min(90,Math.max(16,Math.ceil(radius*(head-tail)*1.5)));
  ctx.save();
  // 얇은 초승달 검흔: 날 끝은 흰색, 안쪽에만 차가운 푸른 잔광.
  for(let n=0;n<=segments;n++) {
    const t=n/segments,a=tail+(head-tail)*t;
    const taper=Math.sin(t*Math.PI)**.7, thick=(evolved?3.5:2.5)*taper;
    const r=radius*(.95+.05*t);
    const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;
    const ix=x+Math.cos(a)*(r-thick),iy=y+Math.sin(a)*(r-thick);
    ctx.globalAlpha=fade*.75;
    stroke(ctx,ix-.5,iy-.5,px+.5,py+.5,'#405779',1);
    ctx.globalAlpha=fade*(.55+t*.45);
    stroke(ctx,ix,iy,px,py,evolved?'#a9dcfa':'#81cbe5',1);
    ctx.globalAlpha=fade*(.8+t*.2);ctx.fillStyle='#ffffff';dot(ctx,px,py,1,.75);
    if(evolved && t>.3) {
      ctx.globalAlpha=fade*.5;ctx.fillStyle='#c2addf';
      dot(ctx,x+Math.cos(a+.06)*radius*.82,y+Math.sin(a+.06)*radius*.82,.5);
    }
  }
  // 검이 지나간 곡선은 어둡고 짧게 남겨 배경을 덮지 않는다.
  if(progress>.28) {
    ctx.globalAlpha=fade*.25;
    arc(ctx,x,y,radius*.94,angle-sweep/2,angle+sweep/2,'#57748a',.5);
  }
  if(progress<.28) {
    const tx=x+Math.cos(head)*radius,ty=y+Math.sin(head)*radius;
    ctx.globalAlpha=(1-progress/.28)*.85;
    const flash=2+noise(seed,2)*2;
    stroke(ctx,tx-flash,ty+flash,tx+flash,ty-flash,'#f8f4d9',.75);
    stroke(ctx,tx-flash*.6,ty-flash*.6,tx+flash*.6,ty+flash*.6,'#a9d0db',.5);
  }
  ctx.restore();
}

export function drawCombatPulse(ctx,x,y,radius,progress,kind='fire',seed=0) {
  const palette=VFX[kind]??VFX.fire, ease=1-(1-progress)**3;
  const reach=Math.max(1,radius*ease), fade=(1-progress)**1.3;
  ctx.save();
  // 적이 보이도록 중심을 비우고 끊어진 이중 충격파와 적은 파편만 남긴다.
  ctx.globalAlpha=fade*.85;
  for(let n=0;n<8;n++) {
    const start=n*Math.PI/4+.08;
    arc(ctx,x,y,reach,start,start+.62,palette[1],1);
    arc(ctx,x,y,Math.max(1,reach-2),start+.07,start+.48,palette[2],.5);
  }
  for(let n=0;n<8;n++) {
    const a=n*Math.PI/4+noise(seed,n)*.25, at=reach*(.8+noise(seed,n+8)*.25);
    const px=x+Math.cos(a)*at, py=y+Math.sin(a)*at-Math.sin(progress*Math.PI)*(kind==='fire'?5:2);
    ctx.globalAlpha=fade;ctx.fillStyle=palette[0];dot(ctx,px-1,py,3,2);
    ctx.fillStyle=palette[1];dot(ctx,px-1,py-1,2,2);ctx.fillStyle=palette[2];dot(ctx,px,py-1,.5,1);
  }
  if(progress<.15) {
    const size=2+progress*16;
    ctx.globalAlpha=(1-progress/.15)*.85;
    stroke(ctx,x-size,y,x+size,y,palette[2],1);
    stroke(ctx,x,y-size,x,y+size,palette[2],1);
  }
  ctx.restore();
}

export function drawCombatLightning(ctx,points,progress,seed,mega=false) {
  const [edge,body,core]=VFX.electric;
  ctx.save();ctx.globalAlpha=(1-progress)**.7;
  for(let n=1;n<points.length;n++) {
    const [x0,y0]=points[n-1],[x1,y1]=points[n], dx=x1-x0,dy=y1-y0;
    const len=Math.hypot(dx,dy)||1, count=Math.min(12,Math.max(3,Math.ceil(len/12)));
    let previous=[x0,y0];
    for(let part=1;part<=count;part++) {
      const t=part/count, bend=part===count?0:(noise(seed,n*37+part)-.5)*Math.min(10,len*.18);
      const next=[x0+dx*t-dy/len*bend,y0+dy*t+dx/len*bend];
      stroke(ctx,previous[0],previous[1]+.5,next[0],next[1]+.5,edge,mega?1.5:1);
      stroke(ctx,...previous,...next,body,1);stroke(ctx,...previous,...next,core,.5);
      if(part===Math.floor(count*.6) && mega) {
        stroke(ctx,...next,next[0]-dy/len*6,next[1]+dx/len*6,body,.5);
      }
      previous=next;
    }
    ctx.fillStyle=core;dot(ctx,x1-1,y1,3,.5);dot(ctx,x1,y1-1,.5,3);
  }
  ctx.restore();
}

export function drawCombatTrail(ctx,x,y,vx,vy,kind='physical',scale=1,time=0) {
  const palette=VFX[kind]??VFX.physical, pace=Math.hypot(vx,vy)||1;
  const dx=vx/pace,dy=vy/pace, tail=Math.min(14,4+pace*.008)*scale;
  ctx.save();
  for(let n=3;n>0;n--) {
    ctx.globalAlpha=.12+(3-n)*.12;
    stroke(ctx,x-dx*tail*n*.4,y-dy*tail*n*.4,x-dx*tail*(n-1)*.4,y-dy*tail*(n-1)*.4,palette[1],n===1?1:.5);
  }
  ctx.globalAlpha=1;
  stroke(ctx,x-dx*2*scale,y-dy*2*scale,x+dx*scale,y+dy*scale,palette[0],Math.max(1,scale*1.5));
  stroke(ctx,x-dx*scale,y-dy*scale,x+dx*scale,y+dy*scale,palette[1],Math.max(.5,scale));
  ctx.fillStyle=palette[2];dot(ctx,x,y,.5,.5);
  if(kind==='poison' && Math.floor(time*10)%3===0) {
    ctx.globalAlpha=.5;ctx.fillStyle=palette[1];dot(ctx,x-dx*tail*.7-dy*2,y-dy*tail*.7+dx*2,.5,.5);
  }
  ctx.restore();
}

export function drawCombatDebris(ctx,x,y,progress,colors,seed,count=6,big=false) {
  ctx.save();ctx.globalAlpha=Math.min(1,(1-progress)*2);
  const reach=big?36:11, ease=1-(1-progress)**3;
  for(let n=0;n<Math.min(8,count);n++) {
    const a=noise(seed,n)*Math.PI*2, dist=reach*(.4+noise(seed,n+11)*.6)*ease;
    const px=x+Math.cos(a)*dist, py=y+Math.sin(a)*dist+progress*progress*5;
    ctx.fillStyle=colors[n%colors.length];dot(ctx,px,py,n%3?1:1.5,.5);
  }
  ctx.restore();
}
