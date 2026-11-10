import { coilOrbs, statsOf } from './engine.js';
import { ARENA, WEAPONS } from './rules.js';
import { icon, sprite } from './sprites.js';

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
  mold: ['moldA', 'moldB'], fly: ['flyA', 'flyB'], kingRoach: ['roachA', 'roachB'],
  garbageGiant: ['trashA', 'trashB'], rustBoiler: ['boiler', 'boiler'],
};
const FRAME_RATE = { roach: 10, fly: 18, trash: 3, rust: 4, mold: 3, kingRoach: 8, garbageGiant: 2.5, rustBoiler: 1 };
const SCALE = { kingRoach: 3, garbageGiant: 3, rustBoiler: 2 };

function drawEnemy(ctx, enemy, x, y, time) {
  const frames = FRAMES[enemy.kind];
  const rate = FRAME_RATE[enemy.kind] ?? 1;
  const frame = enemy.frozen ? 0 : Math.floor(time * rate + enemy.id) % 2;
  const tint = enemy.hitFlash > 0 ? FLASH : enemy.frozen ? FROZEN : null;
  const image = sprite(frames[frame], { flip: (enemy.vx ?? 1) < 0, tint, scale: SCALE[enemy.kind] ?? 1 });
  // 그림자
  ctx.fillStyle = 'rgba(120, 80, 40, 0.25)';
  const shadow = Math.round(image.width * 0.35);
  ctx.fillRect(Math.round(x) - shadow, Math.round(y + image.height / 2) - 1, shadow * 2, 2);
  drawCentered(ctx, image, x, y);
  if (enemy.kind === 'kingRoach') {
    drawCentered(ctx, sprite('crown', { scale: 2 }), x + ((enemy.vx ?? 1) < 0 ? -12 : 12), y - image.height / 2 - 2);
  }
  if (enemy.kind === 'rustBoiler') {
    const puff = Math.floor(time * 6) % 8;
    disc(ctx, Math.round(x - 6), Math.round(y - image.height / 2 - 3 - puff), 2, 'rgba(255,255,255,0.8)');
    disc(ctx, Math.round(x + 5), Math.round(y - image.height / 2 - 1 - ((puff + 4) % 8)), 1, 'rgba(255,255,255,0.7)');
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
  drawCentered(ctx, image, x, y);
  if (game.time < game.shieldUntil) ring(ctx, Math.round(x), Math.round(y), 12, '#c9965c', 3, Math.floor(time * 20));
}

function drawEffects(ctx, game, toBuffer) {
  for (const effect of game.effects) {
    const progress = effect.age / effect.life;
    if (effect.type === 'banner') continue;
    const [x, y] = effect.points ? [0, 0] : toBuffer(effect);
    if (effect.type === 'sweep') {
      const radius = (effect.radius / WORLD_PER_PIXEL) * (0.6 + progress * 0.4);
      const start = progress * Math.PI * 2;
      ctx.fillStyle = '#c9965c';
      for (let step = 0; step < 26; step += 1) {
        const angle = start + (step / 26) * Math.PI * 1.2;
        ctx.fillRect(Math.round(x + Math.cos(angle) * radius), Math.round(y + Math.sin(angle) * radius), 2, 2);
      }
    } else if (effect.type === 'swat') {
      const half = Math.round(effect.radius / WORLD_PER_PIXEL);
      const color = progress < 0.5 ? '#e0645b' : 'rgba(224,100,91,0.5)';
      for (let offset = -half; offset <= half; offset += 4) {
        line(ctx, x - half, y + offset, x + half, y + offset, color);
        line(ctx, x + offset, y - half, x + offset, y + half, color);
      }
    } else if (effect.type === 'pop') {
      const reach = (effect.radius / WORLD_PER_PIXEL) * (0.5 + progress);
      ctx.fillStyle = progress < 0.6 ? '#ffffff' : 'rgba(255,255,255,0.5)';
      for (let index = 0; index < 6; index += 1) {
        const angle = (index / 6) * Math.PI * 2 + effect.x;
        ctx.fillRect(Math.round(x + Math.cos(angle) * reach), Math.round(y + Math.sin(angle) * reach), 1, 1);
      }
    } else if (effect.type === 'bomb') {
      ring(ctx, x, y, (effect.radius / WORLD_PER_PIXEL) * progress, '#ffffff');
      ring(ctx, x, y, (effect.radius / WORLD_PER_PIXEL) * progress - 2, 'rgba(255,255,255,0.6)');
    } else if (effect.type === 'pickup') {
      ring(ctx, x, y, 4 + progress * 8, '#ffe08a');
    } else if (effect.type === 'bolt') {
      const color = progress < 0.5 ? '#fff6b0' : '#ffb21f';
      for (let index = 1; index < effect.points.length; index += 1) {
        const [x0, y0] = toBuffer(effect.points[index - 1]);
        const [x1, y1] = toBuffer(effect.points[index]);
        const midX = Math.round((x0 + x1) / 2 + ((index * 7) % 5) - 2);
        const midY = Math.round((y0 + y1) / 2 + ((index * 5) % 5) - 2);
        line(ctx, x0, y0, midX, midY, color);
        line(ctx, midX, midY, x1, y1, color);
        disc(ctx, x1, y1, 2, color);
      }
    } else if (effect.type === 'gust') {
      const reach = (effect.range / WORLD_PER_PIXEL) * (0.3 + progress * 0.7);
      for (let lane = -2; lane <= 2; lane += 1) {
        const angle = effect.angle + lane * 0.28;
        const from = reach - 8;
        line(ctx, Math.round(x + Math.cos(angle) * from), Math.round(y + Math.sin(angle) * from),
          Math.round(x + Math.cos(angle) * reach), Math.round(y + Math.sin(angle) * reach), 'rgba(255,255,255,0.85)');
      }
    }
  }
}

export function render(ctx, game, width, height, time) {
  if (!floor) floor = makeFloor();
  ctx.imageSmoothingEnabled = false;
  const { player } = game;
  const cameraX = Math.round(player.x / WORLD_PER_PIXEL - width / 2);
  const cameraY = Math.round(player.y / WORLD_PER_PIXEL - height / 2);
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

  for (const orb of coilOrbs(game)) {
    const [x, y] = toBuffer(orb);
    disc(ctx, x, y, 3, '#e8871a');
    disc(ctx, x, y, 1, '#ffe08a');
    ctx.fillStyle = 'rgba(200,200,200,0.7)';
    ctx.fillRect(x - 1, y - 5 - (Math.floor(time * 8) % 3), 1, 2);
  }
  for (const shot of game.shots) {
    const [x, y] = toBuffer(shot);
    ctx.fillStyle = '#dcebff';
    ctx.fillRect(x - 1, y - 1, 3, 3);
    ctx.fillStyle = 'rgba(220, 235, 255, 0.6)';
    ctx.fillRect(Math.round(x - shot.vx * 0.012), Math.round(y - shot.vy * 0.012), 2, 2);
    ctx.fillRect(Math.round(x - shot.vx * 0.024), Math.round(y - shot.vy * 0.024), 1, 1);
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
    disc(ctx, x, y, 2, '#8c4f22');
    ctx.fillStyle = '#e8a468';
    ctx.fillRect(x - 1, y - 1, 1, 1);
  }
  drawEffects(ctx, game, toBuffer);

  if (game.time < game.freezeUntil) {
    ctx.fillStyle = 'rgba(190, 225, 255, 0.12)';
    ctx.fillRect(0, 0, width, height);
  }
  if (player.hurtFlash > 0) {
    ctx.fillStyle = `rgba(224, 100, 91, ${player.hurtFlash * 1.5})`;
    ctx.fillRect(0, 0, width, height);
  }
}
