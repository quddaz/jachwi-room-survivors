import { coilOrbs, sawBlades, statsOf } from './engine.js';
import { ARENA, WEAPONS } from './rules.js';
import { DIGITS, ITEM_FRAMES, icon, sprite } from './sprites.js';

// 저해상도 버퍼에 그리고 화면에서 정수 배로 키워 도트 느낌을 낸다. 버퍼 1픽셀이 월드 2칸이다.
export const PIXEL = 3;
const WORLD_PER_PIXEL = 2;
const FROZEN = 'rgba(190, 225, 255, 0.75)';
const FLASH = 'rgba(255, 255, 255, 0.85)';

let floor = null;

function makeFloor() {
  const tile = document.createElement('canvas');
  tile.width = 48;
  tile.height = 32;
  const t = tile.getContext('2d');
  const shades = ['#ecd3ad', '#e7cba1', '#eed8b6', '#e3c598'];
  for (let row = 0; row < 4; row += 1) {
    const offset = row % 2 === 0 ? 0 : 24;
    for (let column = -1; column < 2; column += 1) {
      t.fillStyle = shades[(row * 2 + column + 4) % shades.length];
      t.fillRect(column * 48 + offset, row * 8, 48, 8);
      t.fillStyle = '#d2b185';
      t.fillRect(column * 48 + offset, row * 8, 1, 8);
    }
    t.fillStyle = '#d2b185';
    t.fillRect(0, row * 8 + 7, 48, 1);
  }
  t.fillStyle = '#dcbd92';
  [[9, 3], [30, 12], [18, 20], [40, 27], [4, 26]].forEach(([x, y]) => t.fillRect(x, y, 2, 1));
  return tile;
}

function disc(ctx, cx, cy, radius, color) {
  ctx.fillStyle = color;
  const r = Math.max(1, Math.round(radius));
  for (let y = -r; y <= r; y += 1) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    ctx.fillRect(cx - half, cy + y, half * 2 + 1, 1);
  }
}

function ring(ctx, cx, cy, radius, color, dash = 0, phase = 0) {
  ctx.fillStyle = color;
  const r = Math.max(1, Math.round(radius));
  const steps = Math.max(12, Math.round(r * 6.3));
  for (let step = 0; step < steps; step += 1) {
    if (dash && Math.floor((step + phase) / dash) % 2 === 1) continue;
    const angle = (step / steps) * Math.PI * 2;
    ctx.fillRect(Math.round(cx + Math.cos(angle) * r), Math.round(cy + Math.sin(angle) * r), 1, 1);
  }
}

function line(ctx, x0, y0, x1, y1, color) {
  ctx.fillStyle = color;
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let step = 0; step <= steps; step += 1) {
    ctx.fillRect(Math.round(x0 + ((x1 - x0) * step) / steps), Math.round(y0 + ((y1 - y0) * step) / steps), 1, 1);
  }
}

function drawCentered(ctx, image, x, y) {
  ctx.drawImage(image, Math.round(x - image.width / 2), Math.round(y - image.height / 2));
}

const FRAMES = {
  roach: ['roachA', 'roachB'], trash: ['trashA', 'trashB'], scrap: ['scrap', 'scrap'], rust: ['rustA', 'rustB'],
  mold: ['moldA', 'moldB'], fly: ['flyA', 'flyB'], kingRoach: ['kingRoachA', 'kingRoachB'],
  garbageGiant: ['garbageGiantA', 'garbageGiantB'], rustBoiler: ['rustBoilerA', 'rustBoilerB'],
};
const FRAME_RATE = { roach: 10, fly: 18, trash: 3, rust: 4, mold: 3, kingRoach: 8, garbageGiant: 2.5, rustBoiler: 5 };
const PARTICLES = {
  roach: ['#6b3f1d', '#a8703d', '#3c2414'], kingRoach: ['#6b3f1d', '#ffcf3f', '#3c2414'],
  trash: ['#5c6470', '#8f99a6', '#7fb069'], scrap: ['#8f99a6', '#5c6470', '#d9dee5'], garbageGiant: ['#5c6470', '#7fb069', '#d9dee5'],
  rust: ['#b5651d', '#e8a468', '#8c4f22'], rustBoiler: ['#b5651d', '#ffb21f', '#e8e8e8'],
  mold: ['#6f9646', '#a9c77f', '#4c6b2f'], fly: ['#4a4a55', '#c8d6e8', '#2c2c33'],
  spark: ['#7fe9ff', '#ffffff', '#fff6b0'], bubble: ['#ffffff', '#cfe8ff', '#e3c8ff'], ball: ['#ff9bb0', '#ffffff', '#f0608a'],
  dust: ['#e9dcc6', '#cdb892', '#ffffff'], gold: ['#ffe08a', '#ffb21f', '#ffffff'], teal: ['#7ad3c8', '#ffffff', '#b9efe7'],
};
// 적이 쏘는 탄막은 종류와 상관없이 모두 빨간색이라 한눈에 피할 것이 보인다.
const ENEMY_SHOT = { core: '#ffe3de', body: '#f0463a', edge: '#8f1712', trail: 'rgba(240,70,58,0.5)' };

// 바닥 아이템마다 다른 빛깔. [밝은 빛, 짙은 빛]
const DROP_GLOW = {
  ramen: ['#ffe08a', '#ff8a3d'], vacuumBag: ['#dcebff', '#8fb1e9'], bugBomb: ['#ffb3bf', '#e0645b'],
  coffee: ['#d3f3ff', '#c9965c'], chicken: ['#fff4c2', '#ffb21f'], icepack: ['#ffffff', '#7fe9ff'],
  box: ['#ffe08a', '#c9965c'], chest: ['#fff4c2', '#ffb21f'],
};

function sparkle(ctx, x, y, color, big) {
  ctx.fillStyle = color;
  if (big) {
    ctx.fillRect(x - 1, y, 3, 1);
    ctx.fillRect(x, y - 1, 1, 3);
    ctx.fillStyle = '#ffffff';
  }
  ctx.fillRect(x, y, 1, 1);
}

// 빙글빙글 도는 빛줄기 위에서 아이템이 둥실 떠 있고, 반짝임이 주위를 돈다.
function drawDrop(ctx, drop, x, y, time) {
  const [light, deep] = DROP_GLOW[drop.type] ?? DROP_GLOW.box;
  const chest = drop.type === 'chest';
  const phase = drop.x * 0.013 + drop.y * 0.007;
  const float = Math.sin(time * 4 + phase);
  const bob = Math.round(float * 2) - 2;
  const pulse = (Math.sin(time * 6 + phase) + 1) / 2;
  disc(ctx, x, y + 9, 5 - (float > 0.4 ? 1 : 0), 'rgba(120, 80, 40, 0.22)');

  const rays = chest ? 12 : 8;
  ctx.globalAlpha = 0.35 + pulse * 0.3;
  for (let ray = 0; ray < rays; ray += 1) {
    const angle = (ray / rays) * Math.PI * 2 + time * (chest ? 1.4 : 0.9) + phase;
    const from = 10;
    const to = (ray % 2 === 0 ? 15 : 12) + (chest ? 4 : 0) + pulse * 2;
    line(ctx, Math.round(x + Math.cos(angle) * from), Math.round(y + bob + Math.sin(angle) * from),
      Math.round(x + Math.cos(angle) * to), Math.round(y + bob + Math.sin(angle) * to), ray % 2 === 0 ? light : deep);
  }
  ctx.globalAlpha = 0.18 + pulse * 0.12;
  disc(ctx, x, y + bob, 10, light);
  ctx.globalAlpha = 1;
  ring(ctx, x, y + bob, 10 + Math.round(pulse), deep, 2, Math.floor(time * 12));

  drawCentered(ctx, icon(drop.type, Math.floor(time * 7 + phase * 10) % ITEM_FRAMES), x, y + bob);

  for (let orbit = 0; orbit < (chest ? 4 : 2); orbit += 1) {
    const angle = time * 3 + phase + (orbit / (chest ? 4 : 2)) * Math.PI * 2;
    sparkle(ctx, Math.round(x + Math.cos(angle) * 12), Math.round(y + bob + Math.sin(angle) * 7), light,
      Math.floor(time * 6 + orbit) % 2 === 0);
  }
  for (let mote = 0; mote < 3; mote += 1) {
    const rise = (time * 0.9 + hash(drop.x, mote)) % 1;
    ctx.fillStyle = rise < 0.6 ? light : deep;
    ctx.fillRect(Math.round(x - 7 + hash(drop.y, mote) * 14 + Math.sin(time * 5 + mote) * 1.5), Math.round(y + 6 - rise * 20), 1, 1);
  }
}

const BEAM = {
  green: ['rgba(62,220,120,0.45)', '#8dffb0', '#ffffff'],
  show: ['rgba(240,96,138,0.45)', '#ffb3d0', '#ffffff'],
  spin: ['rgba(127,233,255,0.5)', '#b9f3ff', '#ffffff'],
};

// 가운데는 하얗고 바깥은 빛깔이 도는 굵은 빛줄기. 비스듬한 줄기에 구멍이 나지 않게 반 칸씩 겹쳐 긋는다.
function drawBeam(ctx, x, y, angle, reach, halfWidth, [edge, glow, core], seed, progress) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const half = Math.max(1, Math.round(halfWidth));
  for (let offset = -half - 1; offset <= half + 1; offset += 0.5) {
    const depth = Math.abs(offset);
    const color = depth > half ? edge : depth > half * 0.45 ? glow : core;
    line(ctx, Math.round(x + dx * 8 - dy * offset), Math.round(y + dy * 8 + dx * offset),
      Math.round(x + dx * reach - dy * offset), Math.round(y + dy * reach + dx * offset), color);
  }
  disc(ctx, Math.round(x + dx * 8), Math.round(y + dy * 8), Math.max(2, half - 1), core);
  for (let spark = 0; spark < 26; spark += 1) {
    const along = 12 + hash(seed, spark) * Math.min(reach, 420);
    const side = (hash(seed, spark + 40) - 0.5) * (half * 2 + 10 + progress * 18);
    sparkle(ctx, Math.round(x + dx * along - dy * side), Math.round(y + dy * along + dx * side),
      spark % 2 === 0 ? glow : core, spark % 5 === 0 && progress < 0.6);
  }
}

function hash(seed, index) {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function drawNumber(ctx, value, x, y, color) {
  const text = String(value);
  let left = Math.round(x - text.length * 2.5);
  for (const digit of text) {
    const rows = DIGITS[digit];
    const cells = rows.flatMap((row, rowIndex) => [...row].map((cell, column) => (cell === '1' ? [column, rowIndex] : null)))
      .filter(Boolean);
    ctx.fillStyle = '#3a2a1a';
    for (const [column, rowIndex] of cells) {
      ctx.fillRect(left + column - 1, y + rowIndex, 3, 1);
      ctx.fillRect(left + column, y + rowIndex - 1, 1, 3);
    }
    ctx.fillStyle = color;
    for (const [column, rowIndex] of cells) ctx.fillRect(left + column, y + rowIndex, 1, 1);
    left += 5;
  }
}

function drawEnemy(ctx, enemy, x, y, time) {
  const frames = FRAMES[enemy.kind];
  const rate = FRAME_RATE[enemy.kind] ?? 1;
  const frame = enemy.frozen ? 0 : Math.floor(time * rate + enemy.id) % 2;
  const tint = enemy.hitFlash > 0 ? FLASH : enemy.frozen ? FROZEN : null;
  const image = sprite(frames[frame], { flip: (enemy.vx ?? 1) < 0, tint });
  const bob = enemy.boss && !enemy.dashing ? Math.round(Math.sin(time * 4 + enemy.id)) : 0;
  ctx.fillStyle = 'rgba(120, 80, 40, 0.25)';
  const shadow = Math.round(image.width * 0.35);
  ctx.fillRect(Math.round(x) - shadow, Math.round(y + image.height / 2) - 1, shadow * 2, 2);
  if (enemy.boss) {
    ring(ctx, Math.round(x), Math.round(y + image.height / 2 - 1), shadow + 3, 'rgba(224, 100, 91, 0.55)', 3, Math.floor(time * 12));
    if (enemy.dashing) {
      ctx.globalAlpha = 0.3;
      drawCentered(ctx, image, x - (enemy.dashX ?? 0) * 10, y - (enemy.dashY ?? 0) * 10);
      ctx.globalAlpha = 0.15;
      drawCentered(ctx, image, x - (enemy.dashX ?? 0) * 20, y - (enemy.dashY ?? 0) * 20);
      ctx.globalAlpha = 1;
    }
  }
  drawCentered(ctx, image, x, y + bob);
  ctx.globalAlpha = 1;
  if (enemy.poisoned) {
    for (let bubble = 0; bubble < 2; bubble += 1) {
      const rise = (time * 1.6 + hash(enemy.id, bubble)) % 1;
      ctx.fillStyle = rise < 0.6 ? '#8fe6a8' : '#3e9f6a';
      ctx.fillRect(Math.round(x - 4 + bubble * 7 + Math.sin(time * 6 + bubble) * 1.5), Math.round(y - image.height / 2 - rise * 7), bubble + 1, bubble + 1);
    }
  }
  if (enemy.kind === 'rustBoiler') {
    for (let puff = 0; puff < 3; puff += 1) {
      const rise = (time * 9 + puff * 4) % 12;
      disc(ctx, Math.round(x - 6 + puff * 6 + Math.sin(time * 3 + puff) * 2), Math.round(y - image.height / 2 - rise),
        rise < 6 ? 2 : 1, `rgba(255,255,255,${0.85 - rise * 0.06})`);
    }
  }
}

function drawDuck(ctx, game, x, y, time) {
  const { player } = game;
  if (player.invulnerable > 0 && Math.floor(time * 16) % 2 === 0) return;
  let name = 'duckA';
  if (player.moving) name = Math.floor(time * 9) % 2 === 0 ? 'duckA' : 'duckB';
  else if (Math.floor(time * 2) % 5 === 0) name = 'duckBlink';
  const tint = player.hurtFlash > 0 ? 'rgba(255, 120, 110, 0.7)' : null;
  const image = sprite(name, { flip: player.facing < 0, tint });
  ctx.fillStyle = 'rgba(120, 80, 40, 0.28)';
  ctx.fillRect(Math.round(x) - 6, Math.round(y) + 7, 12, 2);
  if (game.time < game.coffeeUntil && player.moving) {
    ctx.globalAlpha = 0.3;
    drawCentered(ctx, image, x - player.facing * 5, y);
    ctx.globalAlpha = 0.15;
    drawCentered(ctx, image, x - player.facing * 10, y);
    ctx.globalAlpha = 1;
  }
  drawCentered(ctx, image, x, y);
  if (game.time < game.shieldUntil) ring(ctx, Math.round(x), Math.round(y), 12, '#c9965c', 3, Math.floor(time * 20));
}

function drawEffects(ctx, game, toBuffer) {
  for (const effect of game.effects) {
    const progress = effect.age / effect.life;
    if (effect.type === 'banner' || effect.type === 'flash') continue;
    const [x, y] = effect.points ? [0, 0] : toBuffer(effect);
    if (effect.type === 'sweep') {
      const radius = (effect.radius / WORLD_PER_PIXEL) * (0.6 + progress * 0.4);
      const start = progress * Math.PI * 2.4;
      const shades = effect.mega ? ['#fff3c4', '#ffcf3f', '#e8871a'] : ['#f3dfb8', '#c9965c', '#9a6b3a'];
      for (let layer = 0; layer < 3; layer += 1) {
        ctx.fillStyle = shades[layer];
        const reach = radius - layer * 3;
        for (let step = 0; step < 34 - layer * 8; step += 1) {
          const angle = start - layer * 0.35 + (step / 34) * Math.PI * 1.3;
          ctx.fillRect(Math.round(x + Math.cos(angle) * reach), Math.round(y + Math.sin(angle) * reach), 2, 2);
        }
      }
      ctx.fillStyle = '#ffffff';
      for (let dust = 0; dust < 8; dust += 1) {
        const angle = hash(effect.seed, dust) * Math.PI * 2;
        const reach = radius * (0.7 + progress * 0.5);
        ctx.fillRect(Math.round(x + Math.cos(angle) * reach), Math.round(y + Math.sin(angle) * reach - progress * 3), 1, 1);
      }
    } else if (effect.type === 'swat') {
      const half = Math.round(effect.radius / WORLD_PER_PIXEL);
      const squash = progress < 0.25 ? progress * 4 : 1;
      const color = effect.mega ? (progress < 0.5 ? '#ffcf3f' : 'rgba(255,207,63,0.5)') : progress < 0.5 ? '#e0645b' : 'rgba(224,100,91,0.5)';
      const size = Math.round(half * squash);
      for (let offset = -size; offset <= size; offset += 3) {
        line(ctx, x - size, y + offset, x + size, y + offset, color);
        line(ctx, x + offset, y - size, x + offset, y + size, color);
      }
      if (progress > 0.2) ring(ctx, x, y, half + (progress - 0.2) * 14, 'rgba(255,255,255,0.8)');
      if (progress < 0.3) {
        ctx.fillStyle = '#ffffff';
        for (let ray = 0; ray < 8; ray += 1) {
          const angle = (ray / 8) * Math.PI * 2;
          ctx.fillRect(Math.round(x + Math.cos(angle) * (half + 4)), Math.round(y + Math.sin(angle) * (half + 4)), 2, 2);
        }
      }
    } else if (effect.type === 'burst') {
      const colors = PARTICLES[effect.color] ?? PARTICLES.dust;
      const reach = effect.big ? 46 : 14;
      for (let index = 0; index < effect.count; index += 1) {
        const angle = hash(effect.seed, index) * Math.PI * 2;
        const speed = 0.35 + hash(effect.seed, index + 50) * 0.65;
        const travel = reach * speed * (1 - (1 - progress) ** 2);
        const size = progress < 0.6 && hash(effect.seed, index + 90) > 0.5 ? 2 : 1;
        ctx.fillStyle = colors[index % colors.length];
        ctx.fillRect(Math.round(x + Math.cos(angle) * travel), Math.round(y + Math.sin(angle) * travel + progress * progress * 8), size, size);
      }
    } else if (effect.type === 'number') {
      const color = effect.value >= 60 ? '#ffcf3f' : effect.value >= 25 ? '#ffe9a8' : '#ffffff';
      if (progress < 0.85 || Math.floor(effect.age * 30) % 2 === 0) drawNumber(ctx, effect.value, x, Math.round(y - 4 - progress * 10), color);
    } else if (effect.type === 'ring') {
      const colors = PARTICLES[effect.color] ?? PARTICLES.dust;
      const radius = (effect.radius / WORLD_PER_PIXEL) * (1 - (1 - progress) ** 2);
      ring(ctx, x, y, radius, colors[0]);
      if (progress < 0.7) ring(ctx, x, y, radius - 2, colors[1], 2, 0);
    } else if (effect.type === 'slam') {
      const radius = effect.radius / WORLD_PER_PIXEL;
      disc(ctx, x, y, radius * (1 - progress * 0.3), `rgba(92, 100, 112, ${0.6 * (1 - progress)})`);
      ring(ctx, x, y, radius * (1 + progress * 0.5), 'rgba(255,255,255,0.8)');
    } else if (effect.type === 'levelup') {
      const colors = effect.gold ? ['#ffcf3f', '#ffffff', '#ff8a3d'] : ['#ffe08a', '#ffffff', '#9be28f'];
      ring(ctx, x, y, 6 + progress * 34, colors[0]);
      ring(ctx, x, y, 2 + progress * 24, colors[1], 2, 0);
      for (let spark = 0; spark < (effect.gold ? 18 : 10); spark += 1) {
        const angle = hash(effect.seed, spark) * Math.PI * 2;
        ctx.fillStyle = colors[spark % 3];
        ctx.fillRect(Math.round(x + Math.cos(angle) * (6 + hash(effect.seed, spark + 9) * 14)),
          Math.round(y + Math.sin(angle) * 8 - progress * (14 + hash(effect.seed, spark + 30) * 22)), spark % 4 === 0 ? 2 : 1, spark % 4 === 0 ? 2 : 1);
      }
    } else if (effect.type === 'pop') {
      const reach = (effect.radius / WORLD_PER_PIXEL) * (0.5 + progress);
      ctx.fillStyle = progress < 0.6 ? '#ffffff' : 'rgba(255,255,255,0.5)';
      for (let index = 0; index < 6; index += 1) {
        const angle = (index / 6) * Math.PI * 2 + effect.x;
        ctx.fillRect(Math.round(x + Math.cos(angle) * reach), Math.round(y + Math.sin(angle) * reach), 1, 1);
      }
    } else if (effect.type === 'bomb') {
      const reach = (effect.radius / WORLD_PER_PIXEL) * (1 - (1 - progress) ** 2);
      disc(ctx, x, y, reach, `rgba(255,255,255,${0.35 * (1 - progress)})`);
      ring(ctx, x, y, reach, '#ffffff');
      ring(ctx, x, y, reach - 2, 'rgba(200,235,200,0.8)');
      ring(ctx, x, y, reach * 0.6, 'rgba(255,255,255,0.5)', 3, 0);
    } else if (effect.type === 'pickup') {
      const ease = 1 - (1 - progress) ** 2;
      ring(ctx, x, y, 5 + ease * 16, '#ffe08a');
      ring(ctx, x, y, 3 + ease * 10, '#ffffff', 2, Math.floor(effect.age * 30));
      if (progress < 0.35) disc(ctx, x, y, 7 - progress * 12, 'rgba(255, 244, 194, 0.7)');
      for (let spark = 0; spark < 12; spark += 1) {
        const angle = (spark / 12) * Math.PI * 2 + hash(effect.seed, spark);
        const reach = (8 + hash(effect.seed, spark + 20) * 16) * ease;
        sparkle(ctx, Math.round(x + Math.cos(angle) * reach), Math.round(y + Math.sin(angle) * reach - progress * 6),
          ['#ffe08a', '#ffffff', '#ffb21f'][spark % 3], spark % 3 === 0 && progress < 0.7);
      }
    } else if (effect.type === 'bolt') {
      const color = effect.mega ? (progress < 0.5 ? '#ffffff' : '#8fd0ff') : progress < 0.5 ? '#fff6b0' : '#ffb21f';
      const jitter = Math.floor(effect.age * 40);
      for (let index = 1; index < effect.points.length; index += 1) {
        let [x0, y0] = toBuffer(effect.points[index - 1]);
        const [x1, y1] = toBuffer(effect.points[index]);
        for (let part = 1; part <= 3; part += 1) {
          const wobble = part === 3 ? 0 : 1;
          const nextX = Math.round(x0 + (x1 - x0) / (4 - part) + (hash(effect.seed + jitter, index * 4 + part) - 0.5) * 8 * wobble);
          const nextY = Math.round(y0 + (y1 - y0) / (4 - part) + (hash(effect.seed + jitter, index * 4 + part + 40) - 0.5) * 8 * wobble);
          line(ctx, x0, y0, nextX, nextY, color);
          if (effect.mega) line(ctx, x0, y0 + 1, nextX, nextY + 1, 'rgba(143,208,255,0.6)');
          [x0, y0] = [nextX, nextY];
        }
        disc(ctx, x1, y1, progress < 0.5 ? 3 : 2, color);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x1 - 4 + Math.floor(hash(effect.seed + jitter, index) * 8), y1 - 4 + Math.floor(hash(effect.seed + jitter, index + 7) * 8), 1, 1);
      }
    } else if (effect.type === 'laser') {
      const half = (effect.width / WORLD_PER_PIXEL / 2) * (progress < 0.25 ? 1.3 : 1 - (progress - 0.25) * 1.1);
      drawBeam(ctx, x, y, effect.angle, effect.length / WORLD_PER_PIXEL, half, effect.mega ? BEAM.show : BEAM.green, effect.seed, progress);
    } else if (effect.type === 'nova') {
      // 화염이 고리 모양으로 퍼져 나간다.
      const reach = (effect.radius / WORLD_PER_PIXEL) * (1 - (1 - progress) ** 2);
      disc(ctx, x, y, reach, `rgba(255, 138, 61, ${0.28 * (1 - progress)})`);
      ring(ctx, x, y, reach, '#fff7d6');
      ring(ctx, x, y, reach - 1, '#ffd23f');
      ring(ctx, x, y, reach - 3, '#f08a1d', 2, Math.floor(effect.age * 40));
      for (let flame = 0; flame < 36; flame += 1) {
        const angle = (flame / 36) * Math.PI * 2 + hash(effect.seed, flame);
        const at = reach * (0.82 + hash(effect.seed, flame + 60) * 0.22);
        disc(ctx, Math.round(x + Math.cos(angle) * at), Math.round(y + Math.sin(angle) * at - progress * 5),
          (1 - progress) * (2 + hash(effect.seed, flame + 90) * 3), ['#d9452b', '#f08a1d', '#ffd23f'][flame % 3]);
      }
    } else if (effect.type === 'gust') {
      const reach = (effect.range / WORLD_PER_PIXEL) * (0.3 + progress * 0.7);
      const lanes = effect.mega ? 22 : 7;
      for (let lane = 0; lane < lanes; lane += 1) {
        const spread = effect.mega ? (lane / lanes) * Math.PI * 2 : (lane - 3) * 0.2;
        const angle = effect.angle + spread + Math.sin(progress * 6 + lane) * 0.06;
        const tip = reach * (0.75 + hash(effect.seed, lane) * 0.25);
        const from = tip - 6 - hash(effect.seed, lane + 20) * 8;
        line(ctx, Math.round(x + Math.cos(angle) * from), Math.round(y + Math.sin(angle) * from),
          Math.round(x + Math.cos(angle) * tip), Math.round(y + Math.sin(angle) * tip),
          lane % 2 === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(200,230,255,0.7)');
      }
    }
  }
}

export function render(ctx, game, width, height, time) {
  if (!floor) floor = makeFloor();
  ctx.imageSmoothingEnabled = false;
  const { player } = game;
  const shake = game.shake > 0 ? Math.min(4, game.shake * 10) : 0;
  const cameraX = Math.round(player.x / WORLD_PER_PIXEL - width / 2 + Math.sin(time * 90) * shake);
  const cameraY = Math.round(player.y / WORLD_PER_PIXEL - height / 2 + Math.cos(time * 70) * shake);
  const toBuffer = (item) => [Math.round(item.x / WORLD_PER_PIXEL - cameraX), Math.round(item.y / WORLD_PER_PIXEL - cameraY)];
  const visible = ([x, y], margin = 30) => x > -margin && x < width + margin && y > -margin && y < height + margin;

  // 벽과 바닥
  ctx.fillStyle = '#f6ede0';
  ctx.fillRect(0, 0, width, height);
  const arenaW = ARENA.width / WORLD_PER_PIXEL;
  const arenaH = ARENA.height / WORLD_PER_PIXEL;
  const left = Math.max(0, -cameraX);
  const top = Math.max(0, -cameraY);
  const right = Math.min(width, arenaW - cameraX);
  const bottom = Math.min(height, arenaH - cameraY);
  for (let y = top - ((top + cameraY) % 32 + 32) % 32; y < bottom; y += 32) {
    for (let x = left - ((left + cameraX) % 48 + 48) % 48; x < right; x += 48) ctx.drawImage(floor, x, y);
  }
  ctx.fillStyle = '#f6ede0';
  ctx.fillRect(0, 0, left, height);
  ctx.fillRect(right, 0, width - right, height);
  ctx.fillRect(0, 0, width, top);
  ctx.fillRect(0, bottom, width, height - bottom);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(left - 3, top - 3, right - left + 6, 3);
  ctx.fillRect(left - 3, bottom, right - left + 6, 3);
  ctx.fillRect(left - 3, top, 3, bottom - top);
  ctx.fillRect(right, top, 3, bottom - top);

  for (const slime of game.slimes) {
    const [x, y] = toBuffer(slime);
    disc(ctx, x, y, slime.radius / WORLD_PER_PIXEL, `rgba(111, 150, 70, ${slime.life > 1 ? 0.4 : 0.2})`);
  }
  for (const puddle of game.puddles) {
    const [x, y] = toBuffer(puddle);
    const radius = puddle.radius / WORLD_PER_PIXEL;
    disc(ctx, x, y, radius, `rgba(122, 211, 200, ${puddle.life > 0.6 ? 0.45 : 0.2})`);
    ring(ctx, x, y, radius, 'rgba(255,255,255,0.7)', 2, Math.floor(time * 12));
    ctx.fillStyle = '#ffffff';
    for (let bubble = 0; bubble < 3; bubble += 1) {
      const angle = time * 2 + bubble * 2.1;
      ctx.fillRect(Math.round(x + Math.cos(angle) * radius * 0.5), Math.round(y + Math.sin(angle * 1.3) * radius * 0.5), 1, 1);
    }
  }
  if (game.weapons.dehumidifier) {
    const radius = (WEAPONS.dehumidifier.radius[game.weapons.dehumidifier - 1] * statsOf(game).area) / WORLD_PER_PIXEL;
    const [x, y] = toBuffer(player);
    disc(ctx, x, y, radius, 'rgba(143, 177, 233, 0.14)');
    ring(ctx, x, y, radius, 'rgba(95, 134, 207, 0.8)', 3, Math.floor(time * 14));
  }

  for (const hazard of game.hazards) {
    const [x, y] = toBuffer(hazard);
    const radius = hazard.radius / WORLD_PER_PIXEL;
    const closing = 1 - hazard.delay / hazard.total;
    disc(ctx, x, y, radius, `rgba(224, 100, 91, ${0.12 + closing * 0.22})`);
    ring(ctx, x, y, radius, '#e0645b', 2, Math.floor(time * 16));
    ring(ctx, x, y, radius * closing, 'rgba(255,255,255,0.8)');
    drawCentered(ctx, sprite('trashA'), x, y - Math.round((1 - closing) * 70) - 4);
  }

  for (const gem of game.gems) {
    const point = toBuffer(gem);
    if (!visible(point, 4)) continue;
    const big = gem.value >= 5;
    drawCentered(ctx, sprite(big ? 'gemBig' : 'gem'), point[0], point[1]);
    // 먼지가 돌아가며 한 번씩 반짝인다.
    const blink = Math.floor(time * 5 + gem.x * 0.31 + gem.y * 0.17) % (big ? 4 : 9);
    if (blink === 0) sparkle(ctx, point[0] + (big ? 1 : 0), point[1] - 1, big ? '#fff4c2' : '#ffffff', true);
    else if (blink === 1) sparkle(ctx, point[0] + 1, point[1] - 2, '#ffffff', false);
  }
  for (const drop of game.drops) {
    const [x, y] = toBuffer(drop);
    if (!visible([x, y])) continue;
    drawDrop(ctx, drop, x, y, time);
  }

  const enemies = game.enemies
    .map((enemy) => ({ enemy, point: toBuffer(enemy) }))
    .filter(({ point, enemy }) => visible(point, enemy.boss ? 60 : 16))
    .sort((a, b) => a.enemy.y - b.enemy.y);
  for (const { enemy, point } of enemies) drawEnemy(ctx, enemy, point[0], point[1], time);
  const [duckX, duckY] = toBuffer(player);
  drawDuck(ctx, game, duckX, duckY, time);

  if (game.weapons.dryer && game.dryerOn) {
    // 화염방사기처럼 안쪽은 밝고 바깥은 붉게, 끝에서는 연기와 불티가 흩어진다.
    const reach = game.dryerRange / WORLD_PER_PIXEL;
    const spread = game.dryerSpread;
    const layers = [
      { count: 14, color: 'rgba(90, 70, 60, 0.35)', from: 0.75, to: 1.2, width: 1.1, size: 3 },
      { count: 44, color: '#d9452b', from: 0.1, to: 1.0, width: 1.0, size: 4 },
      { count: 38, color: '#f08a1d', from: 0.05, to: 0.85, width: 0.75, size: 3 },
      { count: 26, color: '#ffd23f', from: 0, to: 0.65, width: 0.5, size: 2 },
      { count: 12, color: '#fff7d6', from: 0, to: 0.35, width: 0.3, size: 1.5 },
    ];
    layers.forEach((layer, layerIndex) => {
      for (let puff = 0; puff < layer.count; puff += 1) {
        const seed = layerIndex * 100 + puff;
        const travel = (hash(seed, 3) + time * (1.6 + hash(seed, 4))) % 1;
        const along = layer.from + (layer.to - layer.from) * travel;
        const flicker = Math.sin(time * 18 + seed * 1.7) * 0.08;
        const angle = game.dryerAngle + ((hash(seed, 5) - 0.5) * 2 * spread * layer.width + flicker) * (0.25 + along * 0.75);
        const grow = 0.4 + Math.sin(Math.min(1, along) * Math.PI) * 0.8;
        const lift = layerIndex === 0 ? -travel * 8 : 0;
        disc(ctx, Math.round(duckX + Math.cos(angle) * (7 + along * reach)),
          Math.round(duckY + Math.sin(angle) * (7 + along * reach) + lift), layer.size * grow, layer.color);
      }
    });
    for (let ember = 0; ember < 10; ember += 1) {
      const travel = (hash(ember, 21) + time * 1.3) % 1;
      const angle = game.dryerAngle + (hash(ember, 22) - 0.5) * 2.6 * spread;
      ctx.fillStyle = travel < 0.5 ? '#fff0a8' : '#ff8a3d';
      ctx.fillRect(Math.round(duckX + Math.cos(angle) * reach * (0.6 + travel * 0.6)),
        Math.round(duckY + Math.sin(angle) * reach * (0.6 + travel * 0.6) - travel * 6), 1, 1);
    }
    disc(ctx, Math.round(duckX + Math.cos(game.dryerAngle) * 7), Math.round(duckY + Math.sin(game.dryerAngle) * 7),
      2 + (Math.floor(time * 20) % 2), '#fff7d6');
  }
  for (const orb of coilOrbs(game)) {
    const [x, y] = toBuffer(orb);
    const grow = statsOf(game).projectile;
    disc(ctx, x, y, 3 * grow, '#e8871a');
    disc(ctx, x, y, grow, '#ffe08a');
    ctx.fillStyle = 'rgba(200,200,200,0.7)';
    ctx.fillRect(x - 1, y - 5 - (Math.floor(time * 8) % 3), 1, 2);
  }
  for (const shot of game.shots) {
    const [x, y] = toBuffer(shot);
    if (shot.kind === 'bubble') {
      const wobble = Math.round(Math.sin(time * 6 + shot.seed) * 1.5);
      const size = Math.round((shot.mega ? 5 : 4) * (shot.scale ?? 1));
      ring(ctx, x, y + wobble, size, shot.mega ? '#e3c8ff' : '#cfe8ff');
      disc(ctx, x, y + wobble, size - 1, 'rgba(255,255,255,0.35)');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 2, y + wobble - 2, 2, 1);
      continue;
    }
    if (shot.kind === 'roller') {
      const half = Math.round(shot.radius / WORLD_PER_PIXEL);
      const along = Math.atan2(shot.vy, shot.vx);
      const sideX = -Math.sin(along);
      const sideY = Math.cos(along);
      const stripe = Math.floor(time * 14) % 3;
      for (let depth = -2; depth <= 2; depth += 1) {
        const color = (depth + 2 + stripe) % 3 === 0 ? (shot.mega ? '#ffcf3f' : '#d9d2c4') : '#ffffff';
        const cx = x + Math.cos(along) * depth;
        const cy = y + Math.sin(along) * depth;
        line(ctx, Math.round(cx - sideX * half), Math.round(cy - sideY * half), Math.round(cx + sideX * half),
          Math.round(cy + sideY * half), color);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let dust = 1; dust <= 3; dust += 1) {
        ctx.fillRect(Math.round(x - Math.cos(along) * dust * 4 + sideX * (hash(dust, Math.floor(time * 20)) - 0.5) * half * 2),
          Math.round(y - Math.sin(along) * dust * 4 + sideY * (hash(dust + 9, Math.floor(time * 20)) - 0.5) * half * 2), 1, 1);
      }
      continue;
    }
    if (shot.kind === 'staple') {
      // 심은 날아가는 방향으로 길쭉한 빛줄기다.
      const pace = Math.hypot(shot.vx, shot.vy) || 1;
      const tail = Math.round((shot.mega ? 6 : 4) * (shot.scale ?? 1));
      const thick = (shot.scale ?? 1) >= 1.4 ? 1 : 0;
      for (let side = -thick; side <= thick; side += 1) {
        line(ctx, Math.round(x - (shot.vx / pace) * tail - (shot.vy / pace) * side), Math.round(y - (shot.vy / pace) * tail + (shot.vx / pace) * side),
          Math.round(x - (shot.vy / pace) * side), Math.round(y + (shot.vx / pace) * side), shot.poison ? '#5dff9a' : shot.mega ? '#ffb21f' : '#c4c9d1');
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, 1, 1);
      if (shot.mega) ctx.fillRect(Math.round(x - (shot.vx / pace) * 2), Math.round(y - (shot.vy / pace) * 2), 1, 1);
      continue;
    }
    const trail = shot.mega ? 'rgba(170, 240, 190, ' : 'rgba(220, 235, 255, ';
    for (let step = 4; step >= 1; step -= 1) {
      ctx.fillStyle = `${trail}${0.7 - step * 0.14})`;
      const size = step < 3 ? 2 : 1;
      ctx.fillRect(Math.round(x - shot.vx * 0.011 * step + Math.sin(time * 30 + step) * 0.8),
        Math.round(y - shot.vy * 0.011 * step + Math.cos(time * 30 + step) * 0.8), size, size);
    }
    disc(ctx, x, y, (shot.mega ? 3 : 2) * (shot.scale ?? 1), shot.mega ? '#8fe6a8' : '#dcebff');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 1, y - 1, 1, 1);
  }
  if (game.fusions.spinlaser && game.spinLaser) {
    const { count, length, width } = game.spinLaser;
    const pulse = 1 + Math.sin(time * 22) * 0.15;
    for (let index = 0; index < count; index += 1) {
      drawBeam(ctx, duckX, duckY, game.spinAngle + (index / count) * Math.PI * 2, length / WORLD_PER_PIXEL,
        (width / WORLD_PER_PIXEL / 2) * 0.7 * pulse, BEAM.spin, index * 31 + Math.floor(time * 20), 0.3);
    }
  }
  for (const blade of sawBlades(game)) {
    const [x, y] = toBuffer(blade);
    const radius = Math.round(blade.radius / WORLD_PER_PIXEL);
    const turn = time * 16;
    ring(ctx, x, y, radius + 4, 'rgba(255,255,255,0.55)', 4, Math.floor(time * 40));
    // 톱니
    for (let tooth = 0; tooth < 10; tooth += 1) {
      const angle = turn + (tooth / 10) * Math.PI * 2;
      disc(ctx, Math.round(x + Math.cos(angle) * (radius + 1)), Math.round(y + Math.sin(angle) * (radius + 1)), 2, '#2a1c14');
      disc(ctx, Math.round(x + Math.cos(angle) * (radius + 1)), Math.round(y + Math.sin(angle) * (radius + 1)), 1, '#dcebff');
    }
    disc(ctx, x, y, radius + 1, '#2a1c14');
    disc(ctx, x, y, radius, '#8fb1e9');
    disc(ctx, x - 1, y - 1, radius - 2, '#dcebff');
    disc(ctx, x, y, Math.max(2, Math.round(radius * 0.45)), '#5f86cf');
    for (let spoke = 0; spoke < 4; spoke += 1) {
      const angle = turn * 0.6 + (spoke / 4) * Math.PI * 2;
      line(ctx, x, y, Math.round(x + Math.cos(angle) * (radius - 2)), Math.round(y + Math.sin(angle) * (radius - 2)), '#5f86cf');
    }
    disc(ctx, x, y, 1, '#ffffff');
    ctx.fillStyle = '#fff6b0';
    for (let spark = 0; spark < 4; spark += 1) {
      const angle = hash(Math.floor(time * 30), spark) * Math.PI * 2;
      ctx.fillRect(Math.round(x + Math.cos(angle) * (radius + 5)), Math.round(y + Math.sin(angle) * (radius + 5)), 1, 1);
    }
  }
  if (game.weapons.stapler && game.time - (game.staplerAt ?? -9) < 0.12) {
    // 총구 불꽃
    const forward = player.heading ?? (player.facing > 0 ? 0 : Math.PI);
    const flicker = Math.floor(time * 40) % 3;
    disc(ctx, Math.round(duckX + Math.cos(forward) * 9), Math.round(duckY + Math.sin(forward) * 9), 1 + flicker, flicker === 0 ? '#ffffff' : '#ffe08a');
    ctx.fillStyle = '#ffb21f';
    ctx.fillRect(Math.round(duckX + Math.cos(forward) * (12 + flicker)), Math.round(duckY + Math.sin(forward) * (12 + flicker)), 1, 1);
  }
  for (const ball of game.balls) {
    const [x, y] = toBuffer(ball);
    const radius = Math.max(3, Math.round(ball.radius / WORLD_PER_PIXEL));
    const [dark, body, light] = ball.thunder ? ['#3a5a9c', '#7fe9ff', '#ffffff'] : ball.mega ? ['#c9692a', '#ffb21f', '#fff4c2']
      : ['#c2305a', '#f0608a', '#ffb3bf'];
    for (let ghost = 3; ghost >= 1; ghost -= 1) {
      ctx.globalAlpha = 0.34 - ghost * 0.08;
      disc(ctx, Math.round(x - ball.dx * ghost * 5), Math.round(y - ball.dy * ghost * 5), radius - (ghost > 1 ? 1 : 0), body);
    }
    ctx.globalAlpha = 1;
    // 벽에 부딪힌 직후에는 살짝 납작해진다.
    const squash = ball.bounce > 0 ? 1 : 0;
    disc(ctx, x, y, radius + 1 - squash, '#2a1c14');
    disc(ctx, x, y, radius - squash, dark);
    disc(ctx, x - 1, y - 1, radius - 1 - squash, body);
    const turn = time * 9 + ball.id;
    ctx.fillStyle = '#ffffff';
    for (let stripe = -radius + 1; stripe < radius; stripe += 1) {
      const sx = Math.round(x + Math.cos(turn) * stripe);
      const sy = Math.round(y + Math.sin(turn) * stripe);
      ctx.fillRect(sx, sy, 1, 1);
    }
    disc(ctx, x - Math.ceil(radius / 2), y - Math.ceil(radius / 2), radius > 5 ? 1 : 0.5, light);
    if (ball.bounce > 0) ring(ctx, x, y, radius + 3, '#ffffff', 2, Math.floor(time * 30));
    if (ball.thunder) {
      // 공 둘레에서 전기가 튄다.
      const jitter = Math.floor(time * 24);
      for (let arc = 0; arc < 4; arc += 1) {
        const angle = hash(ball.id + jitter, arc) * Math.PI * 2;
        const from = radius + 1;
        const to = radius + 4 + hash(ball.id + jitter, arc + 9) * 5;
        line(ctx, Math.round(x + Math.cos(angle) * from), Math.round(y + Math.sin(angle) * from),
          Math.round(x + Math.cos(angle + 0.4) * to), Math.round(y + Math.sin(angle + 0.4) * to), arc % 2 === 0 ? '#fff6b0' : '#ffffff');
      }
    }
  }
  for (const robot of game.robots) {
    const [x, y] = toBuffer(robot);
    const fx = Math.cos(robot.angle);
    const fy = Math.sin(robot.angle);
    ctx.fillStyle = 'rgba(120, 80, 40, 0.25)';
    ctx.fillRect(x - 6, y + 6, 12, 2);
    // 돌아가는 솔과 빨려 들어오는 먼지
    for (let brush = 0; brush < 2; brush += 1) {
      const side = brush === 0 ? 1 : -1;
      const bx = x + fx * 5 - fy * side * 5;
      const by = y + fy * 5 + fx * side * 5;
      for (let hair = 0; hair < 3; hair += 1) {
        const spin = time * 22 * side + (hair / 3) * Math.PI * 2;
        ctx.fillStyle = '#ffe08a';
        ctx.fillRect(Math.round(bx + Math.cos(spin) * 2), Math.round(by + Math.sin(spin) * 2), 1, 1);
      }
    }
    disc(ctx, x, y, 7, '#2a1c14');
    disc(ctx, x, y, 6, '#8a8f98');
    disc(ctx, x, y - 1, 5, '#eef1f5');
    disc(ctx, x, y - 1, 2, '#c4c9d1');
    ctx.fillStyle = robot.busy ? (Math.floor(time * 10) % 2 === 0 ? '#ff6a2a' : '#ffe08a') : '#5dff9a';
    ctx.fillRect(x, y - 1, 1, 1);
    ctx.fillStyle = '#2a2a30';
    ctx.fillRect(Math.round(x + fx * 5) - 1, Math.round(y - 1 + fy * 5), 2, 1);
    ctx.fillRect(Math.round(x + fx * 5), Math.round(y - 1 + fy * 5) - 1, 1, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let puff = 1; puff <= 2; puff += 1) {
      ctx.fillRect(Math.round(x - fx * (7 + puff * 3) + Math.sin(time * 12 + puff) * 2), Math.round(y - fy * (7 + puff * 3) + Math.cos(time * 9 + puff) * 2), 1, 1);
    }
  }
  for (const slipper of game.slippers) {
    const [x, y] = toBuffer(slipper);
    const turn = Math.floor(slipper.spin / (Math.PI / 2)) % 4;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((turn * Math.PI) / 2);
    ctx.scale(slipper.scale ?? 1, slipper.scale ?? 1);
    drawCentered(ctx, sprite('slipper'), 0, 0);
    ctx.restore();
  }
  for (const shot of game.enemyShots) {
    const [x, y] = toBuffer(shot);
    const look = ENEMY_SHOT;
    ctx.fillStyle = look.trail;
    ctx.fillRect(Math.round(x - shot.vx * 0.02) - 1, Math.round(y - shot.vy * 0.02) - 1, 2, 2);
    ctx.fillRect(Math.round(x - shot.vx * 0.04), Math.round(y - shot.vy * 0.04), 1, 1);
    const pulse = Math.floor((shot.age ?? 0) * 10) % 2;
    disc(ctx, x, y, 3, look.edge);
    disc(ctx, x, y, 2, look.body);
    disc(ctx, x, y, pulse ? 1 : 0.5, look.core);
  }
  drawEffects(ctx, game, toBuffer);

  if (game.time < game.freezeUntil) {
    ctx.fillStyle = 'rgba(190, 225, 255, 0.12)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let flake = 0; flake < 26; flake += 1) {
      const fx = Math.round((hash(7, flake) * width + Math.sin(time * 2 + flake) * 4) % width);
      const fy = Math.round((hash(11, flake) * height + time * (14 + (flake % 5) * 5)) % height);
      ctx.fillRect(fx, fy, flake % 3 === 0 ? 2 : 1, flake % 3 === 0 ? 2 : 1);
    }
  }
  for (const effect of game.effects) {
    if (effect.type !== 'flash') continue;
    const strength = 0.5 * (1 - effect.age / effect.life);
    ctx.fillStyle = effect.color === 'red' ? `rgba(224, 100, 91, ${strength})` : `rgba(255, 255, 255, ${strength})`;
    ctx.fillRect(0, 0, width, height);
  }
  if (player.hurtFlash > 0) {
    ctx.fillStyle = `rgba(224, 100, 91, ${player.hurtFlash * 1.5})`;
    ctx.fillRect(0, 0, width, height);
  }
}
