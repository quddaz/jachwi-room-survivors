import { ARENA, WEAPONS } from './rules.js';

// 테마 색: 크림색 방, 나무 바닥, 하늘색 이불, 노란 부리
const COLOR = {
  wall: '#f6ede0',
  baseboard: '#ffffff',
  floorA: '#ecd3ad',
  floorB: '#e5c89e',
  seam: 'rgba(150, 105, 60, 0.18)',
  sky: '#8fb1e9',
  beak: '#ffb21f',
  ink: '#3a2f28',
};

let floorPattern = null;

function makeFloor(ctx) {
  const tile = document.createElement('canvas');
  tile.width = 240;
  tile.height = 240;
  const t = tile.getContext('2d');
  for (let row = 0; row < 6; row += 1) {
    t.fillStyle = row % 2 === 0 ? COLOR.floorA : COLOR.floorB;
    t.fillRect(0, row * 40, 240, 40);
    t.fillStyle = COLOR.seam;
    t.fillRect(0, row * 40 + 39, 240, 1);
    const offset = (row * 97) % 240;
    t.fillRect(offset, row * 40, 1, 40);
    t.fillRect((offset + 120) % 240, row * 40, 1, 40);
  }
  return ctx.createPattern(tile, 'repeat');
}

const RUGS = [
  { x: 900, y: 1100, rx: 170, ry: 110, color: 'rgba(143, 177, 233, 0.55)' },
  { x: 2100, y: 1900, rx: 140, ry: 140, color: 'rgba(255, 214, 160, 0.6)' },
  { x: 1500, y: 2500, rx: 200, ry: 90, color: 'rgba(143, 177, 233, 0.4)' },
  { x: 2400, y: 700, rx: 120, ry: 80, color: 'rgba(255, 190, 150, 0.45)' },
];

function drawRoom(ctx) {
  ctx.fillStyle = COLOR.wall;
  ctx.fillRect(-600, -600, ARENA.width + 1200, ARENA.height + 1200);
  ctx.fillStyle = floorPattern;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  for (const rug of RUGS) {
    ctx.fillStyle = rug.color;
    ctx.beginPath();
    ctx.ellipse(rug.x, rug.y, rug.rx, rug.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = COLOR.baseboard;
  ctx.lineWidth = 14;
  ctx.strokeRect(-7, -7, ARENA.width + 14, ARENA.height + 14);
}

function eyes(ctx, x, y, gap, size, angry = false) {
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + side * gap, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1b1410';
    ctx.beginPath();
    ctx.arc(x + side * gap, y + size * 0.15, size * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  if (angry) {
    ctx.strokeStyle = '#1b1410';
    ctx.lineWidth = Math.max(1.5, size * 0.4);
    ctx.beginPath();
    ctx.moveTo(x - gap - size, y - size * 1.4);
    ctx.lineTo(x - gap * 0.3, y - size * 0.8);
    ctx.moveTo(x + gap + size, y - size * 1.4);
    ctx.lineTo(x + gap * 0.3, y - size * 0.8);
    ctx.stroke();
  }
}

function drawRoach(ctx, enemy, time, scale = 1, crown = false) {
  const angle = Math.atan2(enemy.vy ?? 0, enemy.vx ?? 1);
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.scale(scale, scale);
  const wiggle = Math.sin(time * 30 + enemy.id) * 2;
  ctx.strokeStyle = '#3a1f0d';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (const side of [-1, 1]) {
    for (const leg of [-4, 1, 6]) {
      ctx.moveTo(side * 4, leg);
      ctx.lineTo(side * 11, leg + (side * wiggle) + 3);
    }
    ctx.moveTo(side * 2, -9);
    ctx.quadraticCurveTo(side * 6, -18, side * 12, -20);
  }
  ctx.stroke();
  const shell = ctx.createRadialGradient(-2, -3, 1, 0, 0, 12);
  shell.addColorStop(0, '#a5602b');
  shell.addColorStop(1, '#4a250e');
  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.ellipse(0, 1, 7, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a1f0d';
  ctx.beginPath();
  ctx.ellipse(0, -8, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  eyes(ctx, 0, -8, 2.4, 1.6);
  if (crown) {
    ctx.fillStyle = COLOR.beak;
    ctx.beginPath();
    ctx.moveTo(-6, -12);
    ctx.lineTo(-6, -18);
    ctx.lineTo(-3, -15);
    ctx.lineTo(0, -19);
    ctx.lineTo(3, -15);
    ctx.lineTo(6, -18);
    ctx.lineTo(6, -12);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawTrash(ctx, enemy, time, scale = 1) {
  const r = 19 * scale;
  const bob = Math.sin(time * 6 + enemy.id) * 1.5 * scale;
  ctx.save();
  ctx.translate(enemy.x, enemy.y + bob);
  ctx.fillStyle = '#3d3d42';
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.6);
  ctx.quadraticCurveTo(-r * 1.1, -r * 0.5, -r * 0.3, -r * 0.8);
  ctx.lineTo(r * 0.3, -r * 0.8);
  ctx.quadraticCurveTo(r * 1.1, -r * 0.5, r, r * 0.6);
  ctx.quadraticCurveTo(0, r * 1.05, -r, r * 0.6);
  ctx.fill();
  ctx.fillStyle = '#5a5a62';
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.1, r * 0.25, r * 0.4, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLOR.beak;
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, -r * 0.85);
  ctx.lineTo(0, -r * 1.25);
  ctx.lineTo(r * 0.35, -r * 0.85);
  ctx.fill();
  eyes(ctx, 0, r * 0.05, r * 0.32, r * 0.17, true);
  ctx.restore();
}

function drawScrap(ctx, enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(enemy.id);
  ctx.fillStyle = '#efece6';
  ctx.strokeStyle = '#b9b2a6';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-9, -4);
  ctx.lineTo(-3, -9);
  ctx.lineTo(6, -7);
  ctx.lineTo(9, 1);
  ctx.lineTo(4, 8);
  ctx.lineTo(-6, 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  eyes(ctx, enemy.x, enemy.y, 3, 1.8);
}

function drawRust(ctx, enemy, time) {
  const squash = 1 + Math.sin(time * 8 + enemy.id) * 0.06;
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.scale(1 / squash, squash);
  const body = ctx.createRadialGradient(-4, -5, 2, 0, 0, 15);
  body.addColorStop(0, '#e4954f');
  body.addColorStop(1, '#a24d18');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.bezierCurveTo(9, -6, 13, 2, 13, 5);
  ctx.arc(0, 5, 13, 0, Math.PI);
  ctx.bezierCurveTo(-13, 2, -9, -6, 0, -17);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(-5, -1, 2.5, 4, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  eyes(ctx, enemy.x, enemy.y + 4, 4.5, 2.6, true);
}

function drawMold(ctx, enemy, time) {
  const r = 15;
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.fillStyle = '#6f8a4a';
  ctx.beginPath();
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const bump = r + Math.sin(time * 4 + index * 2 + enemy.id) * 2 + (index % 2) * 3;
    ctx.lineTo(Math.cos(angle) * bump, Math.sin(angle) * bump);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4b6330';
  for (const [x, y, s] of [[-7, -6, 2.5], [6, -8, 2], [8, 5, 2.8], [-5, 8, 2]]) {
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  eyes(ctx, enemy.x, enemy.y, 4, 2.6);
}

function drawFly(ctx, enemy, time) {
  const flap = Math.sin(time * 60 + enemy.id) * 0.5 + 0.5;
  ctx.fillStyle = `rgba(220, 235, 255, ${0.5 + flap * 0.3})`;
  ctx.beginPath();
  ctx.ellipse(enemy.x - 5, enemy.y - 4, 5, 3 + flap * 2, -0.5, 0, Math.PI * 2);
  ctx.ellipse(enemy.x + 5, enemy.y - 4, 5, 3 + flap * 2, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2b30';
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d0402f';
  ctx.beginPath();
  ctx.arc(enemy.x - 2, enemy.y - 2, 1.4, 0, Math.PI * 2);
  ctx.arc(enemy.x + 2, enemy.y - 2, 1.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawGarbageGiant(ctx, enemy, time) {
  drawTrash(ctx, enemy, time, enemy.radius / 19);
  ctx.fillStyle = '#efece6';
  for (const [x, y] of [[-26, 22], [24, 26], [-6, 34]]) {
    ctx.fillRect(enemy.x + x - 6, enemy.y + y - 4, 12, 8);
  }
}

function drawRustBoiler(ctx, enemy, time) {
  const r = enemy.radius;
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.fillStyle = '#b8743f';
  ctx.fillRect(-r * 0.8, -r, r * 1.6, r * 1.9);
  ctx.fillStyle = '#8c4f22';
  ctx.fillRect(-r * 0.8, -r, r * 1.6, r * 0.25);
  ctx.fillStyle = '#d29a5f';
  ctx.fillRect(-r * 0.55, -r * 0.55, r * 1.1, r * 0.5);
  ctx.strokeStyle = '#6d3a15';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(r * 0.8, -r * 0.4);
  ctx.lineTo(r * 1.15, -r * 0.4);
  ctx.lineTo(r * 1.15, r * 0.7);
  ctx.stroke();
  const steam = (time * 30) % 20;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.arc(-r * 0.3, -r - 6 - steam, 6, 0, Math.PI * 2);
  ctx.arc(r * 0.2, -r - 14 - steam * 0.7, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  eyes(ctx, enemy.x, enemy.y - r * 0.3, r * 0.25, r * 0.14, true);
}

function drawEnemy(ctx, enemy, time) {
  switch (enemy.kind) {
    case 'roach': drawRoach(ctx, enemy, time); break;
    case 'kingRoach': drawRoach(ctx, enemy, time, enemy.radius / 11, true); break;
    case 'trash': drawTrash(ctx, enemy, time); break;
    case 'scrap': drawScrap(ctx, enemy); break;
    case 'rust': drawRust(ctx, enemy, time); break;
    case 'mold': drawMold(ctx, enemy, time); break;
    case 'fly': drawFly(ctx, enemy, time); break;
    case 'garbageGiant': drawGarbageGiant(ctx, enemy, time); break;
    case 'rustBoiler': drawRustBoiler(ctx, enemy, time); break;
    default: break;
  }
  if (enemy.hitFlash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDuck(ctx, player, time) {
  const step = player.moving ? Math.sin(time * 16) : 0;
  const blink = player.invulnerable > 0 && Math.floor(time * 20) % 2 === 0;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalAlpha = blink ? 0.55 : 1;
  ctx.fillStyle = 'rgba(120, 80, 40, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 17, 15, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.scale(player.facing, 1);
  ctx.fillStyle = COLOR.beak;
  ctx.beginPath();
  ctx.ellipse(-5, 15 + step * 2, 5, 3, 0, 0, Math.PI * 2);
  ctx.ellipse(5, 15 - step * 2, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(step * 0.08);
  const body = ctx.createRadialGradient(-4, -2, 3, 0, 4, 18);
  body.addColorStop(0, '#ffffff');
  body.addColorStop(1, '#f1e7d8');
  ctx.fillStyle = player.hurtFlash > 0 ? '#ffd0c8' : body;
  ctx.beginPath();
  ctx.ellipse(0, 5, 15, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(3, -9, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#efe3d1';
  ctx.beginPath();
  ctx.ellipse(-6, 6, 7, 5, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLOR.sky;
  ctx.fillRect(-3, 2, 7, 10);
  ctx.fillStyle = COLOR.beak;
  ctx.beginPath();
  ctx.ellipse(13, -8, 7, 3.6, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f08a5d';
  ctx.beginPath();
  ctx.ellipse(13, -6.5, 4, 1.6, 0.15, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#1b1410';
  ctx.beginPath();
  ctx.arc(6, -12, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAura(ctx, game, time) {
  const level = game.weapons.dehumidifier;
  if (!level) return;
  const radius = WEAPONS.dehumidifier.radius[level - 1];
  const { x, y } = game.player;
  const glow = ctx.createRadialGradient(x, y, radius * 0.3, x, y, radius);
  glow.addColorStop(0, 'rgba(143,177,233,0)');
  glow.addColorStop(1, 'rgba(143,177,233,0.28)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(95,135,210,0.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 10]);
  ctx.lineDashOffset = -time * 40;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawSlipper(ctx, slipper) {
  ctx.save();
  ctx.translate(slipper.x, slipper.y);
  ctx.rotate(slipper.spin);
  ctx.fillStyle = '#5f86cf';
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-7, -4, 14, 4);
  ctx.restore();
}

const DROP_ICON = { ramen: '🍜', vacuumBag: '🧺', bugBomb: '💨', coffee: '🧋', chest: '🎁' };

function drawEffects(ctx, game) {
  for (const effect of game.effects) {
    const progress = effect.age / effect.life;
    ctx.globalAlpha = 1 - progress;
    if (effect.type === 'sweep') {
      ctx.strokeStyle = '#c9965c';
      ctx.lineWidth = 10 * (1 - progress) + 2;
      ctx.beginPath();
      const start = effect.facing > 0 ? -Math.PI * 0.9 : Math.PI * 0.1;
      ctx.arc(effect.x, effect.y, effect.radius * (0.7 + progress * 0.3), start + progress * Math.PI * 1.6,
        start + progress * Math.PI * 1.6 + Math.PI);
      ctx.stroke();
    } else if (effect.type === 'swat') {
      const size = effect.radius * (1.4 - progress * 0.4);
      ctx.strokeStyle = '#ff7a59';
      ctx.lineWidth = 3;
      ctx.strokeRect(effect.x - size / 2, effect.y - size / 2, size, size);
      ctx.beginPath();
      for (let line = 1; line < 4; line += 1) {
        ctx.moveTo(effect.x - size / 2 + (size * line) / 4, effect.y - size / 2);
        ctx.lineTo(effect.x - size / 2 + (size * line) / 4, effect.y + size / 2);
        ctx.moveTo(effect.x - size / 2, effect.y - size / 2 + (size * line) / 4);
        ctx.lineTo(effect.x + size / 2, effect.y - size / 2 + (size * line) / 4);
      }
      ctx.stroke();
    } else if (effect.type === 'pop') {
      ctx.fillStyle = '#ffffff';
      for (let index = 0; index < 5; index += 1) {
        const angle = (index / 5) * Math.PI * 2;
        const reach = effect.radius * (0.6 + progress * 1.2);
        ctx.beginPath();
        ctx.arc(effect.x + Math.cos(angle) * reach, effect.y + Math.sin(angle) * reach, 3 * (1 - progress) + 1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (effect.type === 'bomb') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius * progress, 0, Math.PI * 2);
      ctx.stroke();
    } else if (effect.type === 'pickup') {
      ctx.fillStyle = COLOR.ink;
      ctx.font = '700 14px Pretendard, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(effect.text, effect.x, effect.y - 20 - progress * 30);
    }
  }
  ctx.globalAlpha = 1;
}

// 휴대폰에서는 살짝 확대해 캐릭터가 잘 보이게 한다.
export function zoomOf(width) {
  return width < 520 ? 1.2 : 1;
}

export function render(ctx, game, screenWidth, screenHeight, time) {
  if (!floorPattern) floorPattern = makeFloor(ctx);
  const { player } = game;
  const zoom = zoomOf(screenWidth);
  const width = screenWidth / zoom;
  const height = screenHeight / zoom;
  ctx.save();
  ctx.scale(zoom, zoom);
  ctx.translate(Math.round(width / 2 - player.x), Math.round(height / 2 - player.y));
  drawRoom(ctx);
  const view = { left: player.x - width / 2 - 60, right: player.x + width / 2 + 60,
    top: player.y - height / 2 - 60, bottom: player.y + height / 2 + 60 };
  const visible = (item) => item.x > view.left && item.x < view.right && item.y > view.top && item.y < view.bottom;

  for (const slime of game.slimes) {
    ctx.fillStyle = `rgba(111, 150, 70, ${0.18 + 0.2 * Math.min(1, slime.life / 2)})`;
    ctx.beginPath();
    ctx.arc(slime.x, slime.y, slime.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const puddle of game.puddles) {
    const alpha = Math.min(1, puddle.life / 0.6);
    ctx.fillStyle = `rgba(170, 225, 230, ${0.45 * alpha})`;
    ctx.beginPath();
    ctx.arc(puddle.x, puddle.y, puddle.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${0.7 * alpha})`;
    for (let index = 0; index < 4; index += 1) {
      const angle = time * 2 + index * 1.7;
      ctx.beginPath();
      ctx.arc(puddle.x + Math.cos(angle) * puddle.radius * 0.5, puddle.y + Math.sin(angle * 1.3) * puddle.radius * 0.5,
        3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  drawAura(ctx, game, time);

  for (const gem of game.gems) {
    if (!visible(gem)) continue;
    const big = gem.value >= 5;
    ctx.fillStyle = big ? COLOR.beak : '#9aa7b8';
    ctx.beginPath();
    ctx.arc(gem.x, gem.y, big ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(gem.x - 1.2, gem.y - 1.2, big ? 2 : 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const drop of game.drops) {
    const bob = Math.sin(time * 4 + drop.x) * 3;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(drop.x, drop.y + bob, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(DROP_ICON[drop.type], drop.x, drop.y + bob + 1);
  }

  const enemies = game.enemies.filter(visible).sort((a, b) => a.y - b.y);
  for (const enemy of enemies) drawEnemy(ctx, enemy, time);
  drawDuck(ctx, player, time);

  ctx.fillStyle = 'rgba(160, 205, 255, 0.9)';
  for (const shot of game.shots) {
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, 5, 0, Math.PI * 2);
    ctx.arc(shot.x - shot.vx * 0.02, shot.y - shot.vy * 0.02, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const slipper of game.slippers) drawSlipper(ctx, slipper);
  for (const shot of game.enemyShots) {
    ctx.fillStyle = '#b55a1e';
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(shot.x - 2, shot.y - 2, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  drawEffects(ctx, game);
  ctx.restore();

  if (player.hurtFlash > 0) {
    ctx.fillStyle = `rgba(224, 100, 91, ${player.hurtFlash})`;
    ctx.fillRect(0, 0, screenWidth, screenHeight);
  }
}

export const ICONS = {
  spray: '🧴', broom: '🧹', bleach: '🧪', dehumidifier: '💧', swatter: '🏓', slipper: '🩴',
  gloves: '🧤', sneakers: '👟', vacuum: '🌪️', vitamin: '💊', battery: '🔋', heal: '🍜',
};


