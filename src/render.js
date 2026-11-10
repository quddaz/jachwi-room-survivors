import { coilOrbs, statsOf } from './engine.js';
import { ARENA, WEAPONS } from './rules.js';
import { DIGITS, icon, sprite } from './sprites.js';

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
  bubble: ['#ffffff', '#cfe8ff', '#e3c8ff'],
  dust: ['#e9dcc6', '#cdb892', '#ffffff'], gold: ['#ffe08a', '#ffb21f', '#ffffff'], teal: ['#7ad3c8', '#ffffff', '#b9efe7'],
};
const SHOTS = {
  rust: { core: '#ffcf8a', body: '#d9742b', edge: '#8c4f22', trail: 'rgba(217,116,43,0.45)' },
  steam: { core: '#ffffff', body: '#bfe3f5', edge: '#6fa8c9', trail: 'rgba(191,227,245,0.5)' },
  egg: { core: '#fff6d8', body: '#e6c97a', edge: '#8a6a2a', trail: 'rgba(230,201,122,0.45)' },
};

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
      ring(ctx, x, y, 4 + progress * 8, '#ffe08a');
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
    if (visible(point, 4)) drawCentered(ctx, sprite(gem.value >= 5 ? 'gemBig' : 'gem'), point[0], point[1]);
  }
  for (const drop of game.drops) {
    const [x, y] = toBuffer(drop);
    if (!visible([x, y])) continue;
    const bob = Math.round(Math.sin(time * 5 + drop.x) * 1.5);
    disc(ctx, x, y + 6, 4, 'rgba(120, 80, 40, 0.2)');
    ring(ctx, x, y + bob, 8, '#ffe08a', 2, Math.floor(time * 10));
    drawCentered(ctx, icon(drop.type), x, y + bob);
  }

  const enemies = game.enemies
    .map((enemy) => ({ enemy, point: toBuffer(enemy) }))
    .filter(({ point, enemy }) => visible(point, enemy.boss ? 60 : 16))
    .sort((a, b) => a.enemy.y - b.enemy.y);
  for (const { enemy, point } of enemies) drawEnemy(ctx, enemy, point[0], point[1], time);
  const [duckX, duckY] = toBuffer(player);
  drawDuck(ctx, game, duckX, duckY, time);

  if (game.weapons.dryer && game.dryerOn) {
    const reach = game.dryerRange / WORLD_PER_PIXEL;
    const tick = Math.floor(time * 24);
    for (let puff = 0; puff < 26; puff += 1) {
      const travel = ((hash(puff, 3) + time * 2.2) % 1);
      const angle = game.dryerAngle + (hash(puff, 5) - 0.5) * 2 * game.dryerSpread * (0.3 + travel * 0.7);
      const size = travel > 0.6 ? 2 : 1;
      ctx.fillStyle = travel < 0.3 ? '#fff3c4' : travel < 0.65 ? '#ffb21f' : (puff + tick) % 2 ? 'rgba(232,135,26,0.8)' : 'rgba(224,100,91,0.7)';
      ctx.fillRect(Math.round(duckX + Math.cos(angle) * (6 + travel * reach)), Math.round(duckY + Math.sin(angle) * (6 + travel * reach)),
        size, size);
    }
  }
  for (const orb of coilOrbs(game)) {
    const [x, y] = toBuffer(orb);
    disc(ctx, x, y, 3, '#e8871a');
    disc(ctx, x, y, 1, '#ffe08a');
    ctx.fillStyle = 'rgba(200,200,200,0.7)';
    ctx.fillRect(x - 1, y - 5 - (Math.floor(time * 8) % 3), 1, 2);
  }
  for (const shot of game.shots) {
    const [x, y] = toBuffer(shot);
    if (shot.kind === 'bubble') {
      const wobble = Math.round(Math.sin(time * 6 + shot.seed) * 1.5);
      const size = shot.mega ? 5 : 4;
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
    const trail = shot.mega ? 'rgba(170, 240, 190, ' : 'rgba(220, 235, 255, ';
    for (let step = 4; step >= 1; step -= 1) {
      ctx.fillStyle = `${trail}${0.7 - step * 0.14})`;
      const size = step < 3 ? 2 : 1;
      ctx.fillRect(Math.round(x - shot.vx * 0.011 * step + Math.sin(time * 30 + step) * 0.8),
        Math.round(y - shot.vy * 0.011 * step + Math.cos(time * 30 + step) * 0.8), size, size);
    }
    disc(ctx, x, y, shot.mega ? 3 : 2, shot.mega ? '#8fe6a8' : '#dcebff');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 1, y - 1, 1, 1);
  }
  for (const slipper of game.slippers) {
    const [x, y] = toBuffer(slipper);
    const turn = Math.floor(slipper.spin / (Math.PI / 2)) % 4;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((turn * Math.PI) / 2);
    drawCentered(ctx, sprite('slipper'), 0, 0);
    ctx.restore();
  }
  for (const shot of game.enemyShots) {
    const [x, y] = toBuffer(shot);
    const look = SHOTS[shot.kind] ?? SHOTS.rust;
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
