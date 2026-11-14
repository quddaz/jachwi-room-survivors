import { activeWeapon, coilOrbs, sawBlades, statsOf, topSpinners } from './engine.js';

const maxHpOf = (game) => statsOf(game).maxHp;
import { ARENA, EVOLUTIONS, FUSIONS, RELICS, WEAPONS } from './rules.js';
import { DIGITS, ITEM_FRAMES, icon, sprite } from './sprites.js';

// 저해상도 버퍼를 기존 3배의 80% 배율로 확대한다. 버퍼 1픽셀이 월드 2칸이다.
export const PIXEL = 2.4;
const WORLD_PER_PIXEL = 2;
const FROZEN = 'rgba(190, 225, 255, 0.75)';
const FLASH = 'rgba(255, 255, 255, 0.85)';

// 맵마다 바닥 무늬(반복되는 타일)만 다르다. 바닥 위 소품은 두지 않는다.
const floors = new Map();

function tileCanvas(width, height, paint) {
  const tile = document.createElement('canvas');
  tile.width = width;
  tile.height = height;
  paint(tile.getContext('2d'));
  return tile;
}

const FLOOR = {
  // 자취방: 엇갈린 마룻바닥
  room: () => tileCanvas(48, 32, (t) => {
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
  }),
  // 욕실: 하얀 정사각 타일, 하늘색 줄눈, 가끔 파란 타일
  bathroom: () => tileCanvas(48, 48, (t) => {
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        const accent = (row === 1 && column === 2) || (row === 3 && column === 0);
        t.fillStyle = accent ? '#cfe6f7' : (row + column) % 2 ? '#f4fbff' : '#eef7fd';
        t.fillRect(column * 12, row * 12, 12, 12);
        t.fillStyle = 'rgba(255,255,255,0.9)';
        t.fillRect(column * 12 + 1, row * 12 + 1, 3, 1);
      }
    }
    t.fillStyle = '#b9d9ee';
    for (let line = 0; line < 4; line += 1) {
      t.fillRect(0, line * 12 + 11, 48, 1);
      t.fillRect(line * 12 + 11, 0, 1, 48);
    }
  }),
  // 부엌: 크림과 민트 체크무늬 장판
  kitchen: () => tileCanvas(32, 32, (t) => {
    for (let row = 0; row < 2; row += 1) {
      for (let column = 0; column < 2; column += 1) {
        t.fillStyle = (row + column) % 2 ? '#d7efe2' : '#fff1d6';
        t.fillRect(column * 16, row * 16, 16, 16);
      }
    }
    t.fillStyle = 'rgba(158, 211, 184, 0.6)';
    t.fillRect(0, 15, 32, 1);
    t.fillRect(15, 0, 1, 32);
    t.fillStyle = 'rgba(255,255,255,0.7)';
    [[3, 4], [22, 20], [9, 26]].forEach(([x, y]) => t.fillRect(x, y, 2, 1));
  }),
  // 옥상: 초록 방수 페인트를 칠한 큰 타일
  rooftop: () => tileCanvas(32, 32, (t) => {
    t.fillStyle = '#6fae7a';
    t.fillRect(0, 0, 32, 32);
    t.fillStyle = '#78b882';
    t.fillRect(1, 1, 30, 1);
    t.fillRect(1, 1, 1, 30);
    t.fillStyle = '#5f9a6b';
    t.fillRect(0, 31, 32, 1);
    t.fillRect(31, 0, 1, 32);
  }),
};

// 맵 바깥과 벽 색
const SURROUND = {
  room: { outside: '#f6ede0', wall: '#ffffff' },
  bathroom: { outside: '#e3f1fa', wall: '#ffffff' },
  kitchen: { outside: '#fbe9cc', wall: '#ffffff' },
  rooftop: { outside: '#cfe8ff', wall: '#c4c9d1' },
};

function floorOf(map) {
  if (!floors.has(map)) floors.set(map, (FLOOR[map] ?? FLOOR.room)());
  return floors.get(map);
}

// 원은 반지름과 색마다 한 번만 그려 두고 찍는다. 투명도는 그릴 때 globalAlpha로 준다(색 종류가 끝없이 늘지 않게).
const discCache = new Map();

function discImage(r, rgb) {
  const key = `${r}|${rgb}`;
  let image = discCache.get(key);
  if (!image) {
    if (discCache.size > 600) discCache.clear();
    image = document.createElement('canvas');
    image.width = r * 2 + 1;
    image.height = r * 2 + 1;
    const g = image.getContext('2d');
    g.fillStyle = rgb;
    for (let y = -r; y <= r; y += 1) {
      const half = Math.floor(Math.sqrt(r * r - y * y));
      g.fillRect(r - half, r + y, half * 2 + 1, 1);
    }
    discCache.set(key, image);
  }
  return image;
}

function splitAlpha(color) {
  const match = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.exec(color);
  return match ? [`rgb(${match[1]}, ${match[2]}, ${match[3]})`, Number(match[4])] : [color, 1];
}

function disc(ctx, cx, cy, radius, color) {
  const r = Math.max(1, Math.round(radius));
  if (r <= 3) {
    // 작은 원은 바로 그리는 편이 빠르다.
    ctx.fillStyle = color;
    for (let y = -r; y <= r; y += 1) {
      const half = Math.floor(Math.sqrt(r * r - y * y));
      ctx.fillRect(cx - half, cy + y, half * 2 + 1, 1);
    }
    return;
  }
  const [rgb, alpha] = splitAlpha(color);
  if (alpha <= 0) return;
  const previous = ctx.globalAlpha;
  ctx.globalAlpha = previous * alpha;
  ctx.drawImage(discImage(r, rgb), Math.round(cx) - r, Math.round(cy) - r);
  ctx.globalAlpha = previous;
}

// 고리도 반지름·색·점선 무늬마다 한 번 그려 두고 찍는다. 점선이 도는 무늬는 2×dash가지뿐이라 개수가 늘지 않는다.
const ringCache = new Map();

function ringImage(r, rgb, dash, phase) {
  const key = `${r}|${rgb}|${dash}|${phase}`;
  let image = ringCache.get(key);
  if (!image) {
    if (ringCache.size > 800) ringCache.clear();
    image = document.createElement('canvas');
    image.width = r * 2 + 3;
    image.height = r * 2 + 3;
    const g = image.getContext('2d');
    g.fillStyle = rgb;
    const steps = Math.max(12, Math.round(r * 6.3));
    for (let step = 0; step < steps; step += 1) {
      if (dash && Math.floor((step + phase) / dash) % 2 === 1) continue;
      const angle = (step / steps) * Math.PI * 2;
      g.fillRect(Math.round(r + 1 + Math.cos(angle) * r), Math.round(r + 1 + Math.sin(angle) * r), 1, 1);
    }
    ringCache.set(key, image);
  }
  return image;
}

function ring(ctx, cx, cy, radius, color, dash = 0, phase = 0) {
  const r = Math.max(1, Math.round(radius));
  if (r < 6 || r > 400) {
    ctx.fillStyle = color;
    const steps = Math.max(12, Math.round(r * 6.3));
    for (let step = 0; step < steps; step += 1) {
      if (dash && Math.floor((step + phase) / dash) % 2 === 1) continue;
      const angle = (step / steps) * Math.PI * 2;
      ctx.fillRect(Math.round(cx + Math.cos(angle) * r), Math.round(cy + Math.sin(angle) * r), 1, 1);
    }
    return;
  }
  const [rgb, alpha] = splitAlpha(color);
  if (alpha <= 0) return;
  const cycle = dash ? ((Math.floor(phase) % (dash * 2)) + dash * 2) % (dash * 2) : 0;
  const previous = ctx.globalAlpha;
  ctx.globalAlpha = previous * alpha;
  ctx.drawImage(ringImage(r, rgb, dash, cycle), Math.round(cx) - r - 1, Math.round(cy) - r - 1);
  ctx.globalAlpha = previous;
}

// 빛 번짐: 겹칠수록 밝아지는 부드러운 빛무리. [r, g, b]
function glow(ctx, cx, cy, radius, [red, green, blue], strength = 0.35) {
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  disc(ctx, cx, cy, radius, `rgba(${red}, ${green}, ${blue}, ${strength * 0.35})`);
  disc(ctx, cx, cy, radius * 0.6, `rgba(${red}, ${green}, ${blue}, ${strength * 0.55})`);
  ctx.globalCompositeOperation = previous;
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
  mold: ['moldA', 'moldB'], fly: ['flyA', 'flyB'], mosquito: ['mosquitoA', 'mosquitoB'], spider: ['spiderA', 'spiderB'],
  milk: ['milkA', 'milkB'], mouse: ['mouseA', 'mouseB'], moth: ['mothA', 'mothB'], ant: ['antA', 'antB'], slug: ['slugA', 'slugB'],
  sock: ['sockA', 'sockB'], dustbunny: ['dustbunnyA', 'dustbunnyB'], pigeon: ['pigeonA', 'pigeonB'], kingRoach: ['kingRoachA', 'kingRoachB'],
  garbageGiant: ['garbageGiantA', 'garbageGiantB'], rustBoiler: ['rustBoilerA', 'rustBoilerB'], kingFly: ['kingFlyA', 'kingFlyB'],
  washer: ['washerA', 'washerB'], riceCooker: ['riceCookerA', 'riceCookerB'], moldQueen: ['moldQueenA', 'moldQueenB'],
};
const FRAME_RATE = { washer: 6, riceCooker: 3, moldQueen: 2.5, ant: 14, slug: 2, sock: 4, dustbunny: 6, pigeon: 8, mosquito: 20, spider: 7, milk: 4, mouse: 11, moth: 9, roach: 10, fly: 18, trash: 3, rust: 4, mold: 3, kingRoach: 8, garbageGiant: 2.5, rustBoiler: 5, kingFly: 16 };
const PARTICLES = {
  washer: ['#efece6', '#7fb7e0', '#ffffff'], riceCooker: ['#ffb3bf', '#ffffff', '#e0645b'], moldQueen: ['#6f9646', '#a9c77f', '#ffcf3f'],
  kingFly: ['#3d3d42', '#e0645b', '#dcebff'], ant: ['#3c2414', '#6b3f1d', '#a8703d'], slug: ['#c9965c', '#e6c97a', '#8a6a2a'],
  sock: ['#efece6', '#e0645b', '#8fd19e'], dustbunny: ['#c4c9d1', '#8a8f98', '#ffffff'], pigeon: ['#8a8f98', '#55555d', '#3e9f6a'],
  trap: ['#c9965c', '#8a4a1e', '#dcebff'], water: ['#a9cdf5', '#ffffff', '#5f86cf'], roach: ['#6b3f1d', '#a8703d', '#3c2414'], kingRoach: ['#6b3f1d', '#ffcf3f', '#3c2414'],
  trash: ['#5c6470', '#8f99a6', '#7fb069'], scrap: ['#8f99a6', '#5c6470', '#d9dee5'], garbageGiant: ['#5c6470', '#7fb069', '#d9dee5'],
  rust: ['#b5651d', '#e8a468', '#8c4f22'], rustBoiler: ['#b5651d', '#ffb21f', '#e8e8e8'],
  mold: ['#6f9646', '#a9c77f', '#4c6b2f'], fly: ['#4a4a55', '#c8d6e8', '#2c2c33'],
  mosquito: ['#3d3d42', '#dcebff', '#e0645b'], spider: ['#3d3d42', '#55555d', '#e0645b'], milk: ['#ffffff', '#6f8a4a', '#5f86cf'],
  mouse: ['#8a8f98', '#c4c9d1', '#ffb3bf'], moth: ['#c9965c', '#8a4a1e', '#ffe08a'],
  spark: ['#7fe9ff', '#ffffff', '#fff6b0'], crit: ['#ff5a3c', '#ffcf3f', '#ffffff'], popcorn: ['#fff4c2', '#ffffff', '#ffcf3f'], bubble: ['#ffffff', '#cfe8ff', '#e3c8ff'], ball: ['#ff9bb0', '#ffffff', '#f0608a'],
  dust: ['#e9dcc6', '#cdb892', '#ffffff'], gold: ['#ffe08a', '#ffb21f', '#ffffff'], teal: ['#7ad3c8', '#ffffff', '#b9efe7'],
};
// 적이 쏘는 탄막은 종류와 상관없이 모두 빨간색이라 한눈에 피할 것이 보인다.
// 내 투사체 빛무리 색
const SHOT_GLOW = {
  spray: [150, 210, 255], megaSpray: [120, 255, 170], staple: [255, 230, 160], plane: [255, 255, 255],
  bubble: [200, 170, 255], laser: [120, 255, 140], ice: [150, 230, 255],
};
const ENEMY_SHOT = { core: '#ffffff', body: '#ff3b2f', edge: '#c0150d', outline: '#2a0a08', glow: 'rgba(255, 59, 47, 0.32)', trail: 'rgba(255,59,47,0.55)' };

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
  mega: ['rgba(127,233,255,0.5)', '#b9f3ff', '#ffffff'],
  steam: ['rgba(255, 90, 60, 0.35)', '#f4f6fa', '#ffffff'],
};

// 가운데는 하얗고 바깥은 빛깔이 도는 굵은 빛줄기.
// 픽셀을 하나씩 찍으면 줄기 하나에 수만 번을 그려서 느려지므로, 돌린 사각형 몇 겹으로 한 번에 그린다.
function drawBeam(ctx, x, y, angle, reach, halfWidth, [edge, glow, core], seed, progress) {
  const half = Math.max(1, Math.round(halfWidth));
  const length = Math.max(0, reach - 8);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = edge;
  ctx.fillRect(8, -half - 1.5, length, half * 2 + 3);
  ctx.fillStyle = glow;
  ctx.fillRect(8, -half, length, half * 2);
  ctx.fillStyle = core;
  ctx.fillRect(8, -Math.max(0.5, half * 0.45), length, Math.max(1, half * 0.9));
  ctx.restore();
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  disc(ctx, Math.round(x + dx * 8), Math.round(y + dy * 8), Math.max(2, half - 1), core);
  for (let spark = 0; spark < 14; spark += 1) {
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

// 피해 숫자 글자는 색마다 한 번 그려 두고 찍는다(숫자가 화면에 수십 개씩 떠도 가볍게).
const digitCache = new Map();

function digitImage(digit, color) {
  const key = `${digit}|${color}`;
  let image = digitCache.get(key);
  if (!image) {
    image = document.createElement('canvas');
    image.width = 5;
    image.height = 7;
    const g = image.getContext('2d');
    const cells = DIGITS[digit].flatMap((row, rowIndex) => [...row].map((cell, column) => (cell === '1' ? [column, rowIndex] : null)))
      .filter(Boolean);
    g.fillStyle = '#3a2a1a';
    for (const [column, rowIndex] of cells) {
      g.fillRect(column, rowIndex + 1, 3, 1);
      g.fillRect(column + 1, rowIndex, 1, 3);
    }
    g.fillStyle = color;
    for (const [column, rowIndex] of cells) g.fillRect(column + 1, rowIndex + 1, 1, 1);
    digitCache.set(key, image);
  }
  return image;
}

function drawNumber(ctx, value, x, y, color) {
  const text = String(value);
  let left = Math.round(x - text.length * 2.5);
  for (const digit of text) {
    if (DIGITS[digit]) ctx.drawImage(digitImage(digit, color), left - 1, y - 1);
    left += 5;
  }
}

function drawEnemy(ctx, enemy, x, y, time) {
  const frames = FRAMES[enemy.kind];
  const rate = FRAME_RATE[enemy.kind] ?? 1;
  const frame = enemy.frozen || enemy.crouching ? 0 : Math.floor(time * rate + enemy.id) % 2;
  const tint = enemy.hitFlash > 0 ? FLASH : enemy.frozen ? FROZEN : null;
  const image = sprite(frames[frame], { flip: (enemy.vx ?? 1) < 0, tint });
  const bob = enemy.boss && !enemy.dashing ? Math.round(Math.sin(time * 4 + enemy.id)) : 0;
  const shadow = Math.round(image.width * 0.35);
  if (enemy.elite) {
    // 정예: 금빛 테두리와 작은 왕관, 둘레에 붉은 기운
    const glow = sprite(frames[frame], { flip: (enemy.vx ?? 1) < 0, tint: Math.floor(time * 6 + enemy.id) % 2 ? '#ffcf3f' : '#ff8a3d' });
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) drawCentered(ctx, glow, x + ox, y + oy);
    drawCentered(ctx, sprite('crown'), x, Math.round(y - image.height / 2 - 3));
    const spark = Math.floor(time * 10 + enemy.id);
    ctx.fillStyle = '#ff5a3c';
    ctx.fillRect(Math.round(x + Math.cos(spark) * (image.width / 2 + 2)), Math.round(y + Math.sin(spark) * (image.height / 2 + 2)), 1, 1);
  }
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
  if (enemy.kind === 'sock') {
    // 냄새 구름: 가까이 있으면 진해진다.
    const reach = Math.round(42 + Math.sin(time * 3 + enemy.id) * 2);
    ring(ctx, Math.round(x), Math.round(y), reach, enemy.stinking ? 'rgba(111, 170, 70, 0.75)' : 'rgba(111, 170, 70, 0.35)', 3, Math.floor(time * 6));
    for (let puff = 0; puff < 3; puff += 1) {
      const angle = time * 1.5 + puff * 2.1 + enemy.id;
      disc(ctx, Math.round(x + Math.cos(angle) * 9), Math.round(y - 6 - ((time * 8 + puff * 5) % 10)), 1.5, 'rgba(143, 209, 158, 0.7)');
    }
  }
  if (enemy.kind === 'pigeon' && enemy.aiming) {
    // 내리꽂을 길을 빨간 점선으로 미리 보여 준다.
    const length = (enemy.swoopLen ?? 200) / 2;
    for (let step = 6; step < length; step += 4) {
      if (Math.floor(step / 4 + time * 20) % 2) continue;
      ctx.fillStyle = 'rgba(255, 59, 47, 0.85)';
      ctx.fillRect(Math.round(x + enemy.swoopX * step), Math.round(y + enemy.swoopY * step), 2, 2);
    }
  }
  if (enemy.burning) {
    for (let flame = 0; flame < 3; flame += 1) {
      const rise = (time * 2.2 + hash(enemy.id, flame)) % 1;
      ctx.fillStyle = rise < 0.5 ? '#ffd23f' : '#f08a1d';
      ctx.fillRect(Math.round(x - 4 + flame * 4 + Math.sin(time * 9 + flame) * 1.5), Math.round(y - image.height / 2 - rise * 6), 1, 2);
    }
  }
  if (enemy.poisoned) {
    for (let bubble = 0; bubble < 2; bubble += 1) {
      const rise = (time * 1.6 + hash(enemy.id, bubble)) % 1;
      ctx.fillStyle = rise < 0.6 ? '#8fe6a8' : '#3e9f6a';
      ctx.fillRect(Math.round(x - 4 + bubble * 7 + Math.sin(time * 6 + bubble) * 1.5), Math.round(y - image.height / 2 - rise * 7), bubble + 1, bubble + 1);
    }
  }
  if (enemy.kind === 'washer' && enemy.spinning) {
    // 탈수 중: 둘레에 물살이 빙글빙글 돈다.
    for (let swirl = 0; swirl < 10; swirl += 1) {
      const angle = time * 9 + (swirl / 10) * Math.PI * 2;
      const reach = image.width / 2 + 4 + (swirl % 2) * 3;
      ctx.fillStyle = swirl % 3 ? '#a9cdf5' : '#ffffff';
      ctx.fillRect(Math.round(x + Math.cos(angle) * reach), Math.round(y + Math.sin(angle) * reach * 0.8), 2, 1);
    }
  }
  if (enemy.kind === 'riceCooker') {
    for (let puff = 0; puff < 2; puff += 1) {
      const rise = (time * 7 + puff * 6) % 12;
      disc(ctx, Math.round(x + 4 + puff * 3 + Math.sin(time * 4 + puff) * 2), Math.round(y - image.height / 2 - rise), rise < 6 ? 2 : 1,
        `rgba(255,255,255,${0.85 - rise * 0.06})`);
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
  // 맞은 뒤 무적일 때는 사라지지 않고 반투명하게 깜빡인다(복잡한 화면에서 놓치지 않게).
  const blink = player.invulnerable > 0 && Math.floor(time * 16) % 2 === 0;
  let name = 'duckA';
  if (player.moving) name = Math.floor(time * 9) % 2 === 0 ? 'duckA' : 'duckB';
  else if (Math.floor(time * 2) % 5 === 0) name = 'duckBlink';
  const tint = player.hurtFlash > 0 ? 'rgba(255, 120, 110, 0.7)' : null;
  const image = sprite(name, { flip: player.facing < 0, tint });
  ctx.fillStyle = 'rgba(120, 80, 40, 0.28)';
  ctx.fillRect(Math.round(x) - 6, Math.round(y) + 7, 12, 2);
  if (blink) ctx.globalAlpha = 0.4;
  // 흰 테두리를 한 겹 둘러 어떤 배경 위에서도 오리가 보이게 한다.
  const rim = sprite(name, { flip: player.facing < 0, tint: '#ffffff' });
  for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) drawCentered(ctx, rim, x + ox, y + oy);
  if (game.time < game.coffeeUntil && player.moving) {
    ctx.globalAlpha = 0.3;
    drawCentered(ctx, image, x - player.facing * 5, y);
    ctx.globalAlpha = 0.15;
    drawCentered(ctx, image, x - player.facing * 10, y);
    ctx.globalAlpha = blink ? 0.4 : 1;
  }
  drawCentered(ctx, image, x, y);
  ctx.globalAlpha = 1;
  if (game.time < game.shieldUntil) ring(ctx, Math.round(x), Math.round(y), 12, '#c9965c', 3, Math.floor(time * 20));
  // 보물 효과가 켜져 있으면 오리 둘레에 보인다.
  if (game.relics?.blanket && !player.moving) {
    ring(ctx, Math.round(x), Math.round(y), 13, 'rgba(95, 134, 207, 0.85)', 2, Math.floor(time * 8));
    ring(ctx, Math.round(x), Math.round(y), 11, 'rgba(169, 205, 245, 0.7)');
  }
  if (game.relics?.lastcup && player.hp <= maxHpOf(game) * RELICS.lastcup.below) {
    const pulse = 14 + (Math.floor(time * 10) % 3);
    ring(ctx, Math.round(x), Math.round(y), pulse, 'rgba(240, 70, 58, 0.8)', 2, Math.floor(time * 16));
  }
  if (game.relics?.energy && player.moving) {
    ctx.fillStyle = Math.floor(time * 20) % 2 === 0 ? '#ffe08a' : '#ffffff';
    for (let spark = 0; spark < 3; spark += 1) {
      ctx.fillRect(Math.round(x - player.facing * (6 + spark * 3) + Math.sin(time * 30 + spark) * 2), Math.round(y + 4 - spark * 3), 1, 1);
    }
  }
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
      // 쓸고 지나가는 맨 앞 가장자리가 하얗게 빛난다.
      for (let step = 0; step < 10; step += 1) {
        const angle = start + Math.PI * 1.3 - step * 0.06;
        ctx.fillStyle = `rgba(255,255,255,${0.9 - step * 0.08})`;
        ctx.fillRect(Math.round(x + Math.cos(angle) * (radius + 1)), Math.round(y + Math.sin(angle) * (radius + 1)), 2, 2);
      }
      ctx.fillStyle = '#ffffff';
      for (let dust = 0; dust < 8; dust += 1) {
        const angle = hash(effect.seed, dust) * Math.PI * 2;
        const reach = radius * (0.7 + progress * 0.5);
        ctx.fillRect(Math.round(x + Math.cos(angle) * reach), Math.round(y + Math.sin(angle) * reach - progress * 3), 1, 1);
      }
    } else if (effect.type === 'punch') {
      // 고무장갑: 앞으로 뻗는 노란 충격파 띠와 맨 앞의 주먹 자국
      const dx = Math.cos(effect.angle);
      const dy = Math.sin(effect.angle);
      const reach = (effect.length / WORLD_PER_PIXEL) * Math.min(1, progress * 2.5);
      const half = (effect.width / WORLD_PER_PIXEL) / 2;
      const fade = 1 - progress;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(effect.angle);
      ctx.fillStyle = `rgba(255, 210, 63, ${0.22 * fade})`;
      ctx.fillRect(4, -half, reach, half * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * fade})`;
      ctx.fillRect(4, -half, reach, 1);
      ctx.fillRect(4, half - 1, reach, 1);
      ctx.restore();
      for (let arc = 0; arc < 4; arc += 1) {
        const at = reach * (0.4 + arc * 0.2);
        for (let side = -half; side <= half; side += 2) {
          const bend = (side / half) ** 2 * 4;
          ctx.fillStyle = arc === 3 ? `rgba(255, 255, 255, ${fade})` : `rgba(255, 207, 63, ${0.7 * fade})`;
          ctx.fillRect(Math.round(x + dx * (at - bend) - dy * side), Math.round(y + dy * (at - bend) + dx * side), 1, 1);
        }
      }
      glow(ctx, Math.round(x + dx * reach), Math.round(y + dy * reach), 8 * fade + 2, [255, 210, 63], 0.6 * fade);
    } else if (effect.type === 'swordscar') {
      const radius = effect.radius / WORLD_PER_PIXEL;
      const swing = Math.min(1, progress / 0.28);
      const fade = 1 - progress;
      const start = effect.angle - effect.arc / 2;
      const end = start + effect.arc * swing;
      // 외곽의 베기와 그 안쪽 잔상을 같은 부채꼴로 남긴다.
      for (let layer = 0; layer < 3; layer++) {
        const reach = radius * (1 - layer * 0.13);
        const steps = Math.ceil(effect.arc * reach * 1.5);
        ctx.fillStyle = layer === 0 ? `rgba(255,255,255,${fade})`
          : effect.evolved ? `rgba(189,160,255,${fade * 0.8})` : `rgba(112,204,255,${fade * 0.8})`;
        for (let point = 0; point <= steps; point++) {
          const angle = start + (end - start) * point / steps;
          ctx.fillRect(Math.round(x + Math.cos(angle) * reach), Math.round(y + Math.sin(angle) * reach), layer ? 1 : 2, 1);
        }
      }
      if (effect.evolved) {
        const cross = effect.angle + 0.5;
        line(ctx, Math.round(x + Math.cos(cross) * radius * 0.25), Math.round(y + Math.sin(cross) * radius * 0.25),
          Math.round(x + Math.cos(cross) * radius), Math.round(y + Math.sin(cross) * radius), `rgba(255,240,180,${fade * 0.75})`);
      }
      if (progress < 0.3) {
        const tipX = x + Math.cos(end) * radius, tipY = y + Math.sin(end) * radius;
        glow(ctx, tipX, tipY, 5, effect.evolved ? [189,160,255] : [112,204,255], 0.55 * fade);
      }
    } else if (effect.type === 'slash') {
      // 톱날이 벤 자리: 빛나는 사선 두 줄과 불똥
      const reach = 10 * (0.6 + progress * 0.6);
      const fade = 1 - progress;
      for (const [offset, color] of [[-1, `rgba(255,255,255,${fade})`], [1, `rgba(143,208,255,${fade})`]]) {
        const across = effect.angle + Math.PI / 2;
        line(ctx, Math.round(x - Math.cos(effect.angle + 0.6) * reach + Math.cos(across) * offset),
          Math.round(y - Math.sin(effect.angle + 0.6) * reach + Math.sin(across) * offset),
          Math.round(x + Math.cos(effect.angle + 0.6) * reach + Math.cos(across) * offset),
          Math.round(y + Math.sin(effect.angle + 0.6) * reach + Math.sin(across) * offset), color);
      }
      glow(ctx, x, y, 8 * fade + 2, [143, 208, 255], 0.6 * fade);
      for (let spark = 0; spark < 5; spark += 1) {
        const angle = effect.angle + Math.PI + (hash(effect.seed, spark) - 0.5) * 1.6;
        const travel = 4 + progress * 12 * hash(effect.seed, spark + 9);
        ctx.fillStyle = spark % 2 ? '#fff6b0' : '#ffffff';
        ctx.fillRect(Math.round(x + Math.cos(angle) * travel), Math.round(y + Math.sin(angle) * travel), 1, 1);
      }
    } else if (effect.type === 'swat') {
      const half = Math.round(effect.radius / WORLD_PER_PIXEL);
      // 내려친 충격파가 바닥을 타고 퍼진다.
      if (progress > 0.15) {
        ring(ctx, x, y, half * (1 + (progress - 0.15) * 1.6), `rgba(255, 240, 200, ${0.7 * (1 - progress)})`);
        glow(ctx, x, y, half * 0.9, effect.mega ? [255, 207, 63] : [255, 140, 120], 0.5 * (1 - progress));
      }
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
      if (effect.color === 'crit' && progress < 0.5) glow(ctx, x, y, 9 * (1 - progress * 2) + 2, [255, 120, 60], 0.8);
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
      const color = effect.crit ? (Math.floor(effect.age * 20) % 2 === 0 ? '#ff5a3c' : '#ffcf3f')
        : effect.value >= 60 ? '#ffcf3f' : effect.value >= 25 ? '#ffe9a8' : '#ffffff';
      // 치명타 숫자는 더 높이 튀어 오른다.
      const rise = effect.crit ? 4 + Math.sin(Math.min(1, progress * 2.5) * Math.PI) * 6 + progress * 10 : progress * 10;
      if (progress < 0.85 || Math.floor(effect.age * 30) % 2 === 0) drawNumber(ctx, effect.value, x, Math.round(y - 4 - rise), color);
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
        glow(ctx, x1, y1, 7 * (1 - progress) + 2, effect.mega ? [143, 208, 255] : [255, 240, 150], 0.7);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x1 - 4 + Math.floor(hash(effect.seed + jitter, index) * 8), y1 - 4 + Math.floor(hash(effect.seed + jitter, index + 7) * 8), 1, 1);
      }
    } else if (effect.type === 'laser') {
      const half = (effect.width / WORLD_PER_PIXEL / 2) * (progress < 0.25 ? 1.3 : 1 - (progress - 0.25) * 1.1);
      drawBeam(ctx, x, y, effect.angle, effect.length / WORLD_PER_PIXEL, half, effect.steam ? BEAM.steam : effect.mega ? BEAM.show : BEAM.green, effect.seed, progress);
      if (effect.focus && progress < 0.45) {
        const [tx, ty] = toBuffer(effect.focus);
        ring(ctx, tx, ty, 3 + progress * 10, effect.mega ? '#ffb3d0' : '#8dffb0', 2, 0);
      }
    } else if (effect.type === 'towel') {
      // 젖은 수건: 두꺼운 줄무늬 수건이 채찍처럼 앞으로 쫙 펴지며 물보라를 튀긴다.
      const unroll = Math.min(1, progress * 4);
      const length = (effect.length / WORLD_PER_PIXEL) * (0.35 + unroll * 0.65);
      const half = effect.height / WORLD_PER_PIXEL / 2;
      const [main, stripe, dark] = effect.mega ? ['#ffcf3f', '#ff6a8a', '#c9692a'] : ['#7ad3c8', '#ffffff', '#3f9d94'];
      const fade = 1 - Math.max(0, progress - 0.5) * 2;
      const thick = Math.max(2, Math.round(half * 0.55 * fade));
      // 휘두른 자리에 옅게 남는 바람 자국
      ctx.fillStyle = 'rgba(169, 205, 245, 0.25)';
      ctx.fillRect(Math.round(effect.dir > 0 ? x + 4 : x - length), Math.round(y - half), Math.round(length - 4), Math.round(half * 2));
      for (let along = 4; along < length; along += 1) {
        const tip = along / length;
        const wave = Math.sin(along * 0.28 - progress * 24) * half * 0.45 * tip;
        const px = Math.round(x + effect.dir * along);
        const top = Math.round(y + wave - thick);
        ctx.fillStyle = dark;
        ctx.fillRect(px, top - 1, 1, thick * 2 + 2);
        ctx.fillStyle = Math.floor(along / 5) % 2 ? main : stripe;
        ctx.fillRect(px, top, 1, thick * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(px, top, 1, 1);
      }
      // 끝에서 물보라가 튄다.
      for (let drop = 0; drop < 14; drop += 1) {
        const spread = hash(effect.seed, drop);
        const along = length * (0.55 + spread * 0.5);
        const rise = (hash(effect.seed, drop + 9) - 0.5) * half * 2.4 - progress * 6;
        sparkle(ctx, Math.round(x + effect.dir * along), Math.round(y + rise), drop % 3 ? '#a9cdf5' : '#ffffff', drop % 4 === 0 && progress < 0.6);
      }
    } else if (effect.type === 'nova') {
      // 화염이 고리 모양으로 퍼져 나간다(물파스는 시원한 민트빛).
      const cool = effect.color === 'mint';
      const flames = cool ? ['#3f9d94', '#7ad3c8', '#d3f3ff'] : ['#d9452b', '#f08a1d', '#ffd23f'];
      const reach = (effect.radius / WORLD_PER_PIXEL) * (1 - (1 - progress) ** 2);
      disc(ctx, x, y, reach, cool ? `rgba(122, 211, 200, ${0.26 * (1 - progress)})` : `rgba(255, 138, 61, ${0.28 * (1 - progress)})`);
      ring(ctx, x, y, reach, cool ? '#ffffff' : '#fff7d6');
      ring(ctx, x, y, reach - 1, flames[2]);
      ring(ctx, x, y, reach - 3, flames[1], 2, Math.floor(effect.age * 40));
      for (let flame = 0; flame < 36; flame += 1) {
        const angle = (flame / 36) * Math.PI * 2 + hash(effect.seed, flame);
        const at = reach * (0.82 + hash(effect.seed, flame + 60) * 0.22);
        disc(ctx, Math.round(x + Math.cos(angle) * at), Math.round(y + Math.sin(angle) * at - progress * 5),
          (1 - progress) * (2 + hash(effect.seed, flame + 90) * 3), flames[flame % 3]);
      }
    } else if (effect.type === 'mist') {
      // 방향제: 보랏빛 안개가 화면 가득 퍼지고 꽃잎이 흩날린다.
      const reach = (effect.radius / WORLD_PER_PIXEL) * (1 - (1 - progress) ** 3);
      ctx.fillStyle = `rgba(176, 139, 224, ${0.16 * (1 - progress)})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ring(ctx, x, y, reach, `rgba(255, 255, 255, ${0.9 * (1 - progress)})`);
      ring(ctx, x, y, reach - 3, `rgba(176, 139, 224, ${0.8 * (1 - progress)})`, 3, Math.floor(effect.age * 30));
      for (let petal = 0; petal < 40; petal += 1) {
        const angle = hash(effect.seed, petal) * Math.PI * 2;
        const at = reach * (0.2 + hash(effect.seed, petal + 40) * 0.8);
        const px = Math.round(x + Math.cos(angle) * at + Math.sin(progress * 6 + petal) * 3);
        const py = Math.round(y + Math.sin(angle) * at - progress * 10);
        sparkle(ctx, px, py, ['#ffb3bf', '#ffffff', '#b08be0'][petal % 3], petal % 5 === 0 && progress < 0.6);
      }
    } else if (effect.type === 'snap') {
      // 빨래집게: 양쪽 집게가 콱 닫히며 나무 조각이 튄다.
      const half = effect.radius / WORLD_PER_PIXEL;
      const close = Math.min(1, progress * 3);
      const gap = Math.round(half * (1 - close));
      ctx.fillStyle = '#8a4a1e';
      ctx.fillRect(x - gap - 3, y - 6, 3, 12);
      ctx.fillRect(x + gap, y - 6, 3, 12);
      ctx.fillStyle = '#e6c97a';
      ctx.fillRect(x - gap - 2, y - 5, 1, 10);
      ctx.fillRect(x + gap + 1, y - 5, 1, 10);
      if (close >= 1) {
        ring(ctx, x, y, 3 + progress * half, `rgba(255, 224, 138, ${1 - progress})`);
        for (let chip = 0; chip < 6; chip += 1) {
          const angle = (chip / 6) * Math.PI * 2 + effect.seed;
          ctx.fillStyle = chip % 2 ? '#c9965c' : '#ffffff';
          ctx.fillRect(Math.round(x + Math.cos(angle) * progress * half), Math.round(y + Math.sin(angle) * progress * half), 1, 1);
        }
      }
    } else if (effect.type === 'gust') {
      disc(ctx, x, y, 5, '#3a5a9c');
      for (let blade = 0; blade < 3; blade++) {
        const angle = progress * 15 + blade * Math.PI * 2 / 3;
        line(ctx, x, y, Math.round(x + Math.cos(angle) * 4), Math.round(y + Math.sin(angle) * 4), '#b9f3ff');
      }
      const reach = (effect.range / WORLD_PER_PIXEL) * (0.3 + progress * 0.7);
      const cone = effect.mega ? Math.PI : effect.cone;
      for (let band = 0; band < 2; band++) {
        const at = reach * (1 - band * 0.2);
        const segments = effect.mega ? 20 : 10;
        for (let segment = 0; segment < segments; segment++) {
          const a = effect.angle - cone + segment * cone * 2 / segments;
          const b = a + cone * 1.5 / segments;
          line(ctx, Math.round(x + Math.cos(a) * at), Math.round(y + Math.sin(a) * at),
            Math.round(x + Math.cos(b) * at), Math.round(y + Math.sin(b) * at), band ? '#dcebff' : '#8fb1e9');
        }
      }
      const lanes = effect.mega ? 22 : 11;
      for (let lane = 0; lane < lanes; lane += 1) {
        const spread = effect.mega ? (lane / lanes) * Math.PI * 2 : ((lane - 5) / 5) * (effect.cone ?? 0.6) * 0.95;
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

// 화면 밖에 있는 보스 쪽 가장자리에 화살표를 띄운다. 가까울수록 크게 보인다.
function drawBossArrows(ctx, game, toBuffer, width, height, time) {
  const cx = width / 2;
  const cy = height / 2;
  const inset = 12;
  for (const boss of game.enemies) {
    if (!boss.boss || boss.dead) continue;
    const [bx, by] = toBuffer(boss);
    if (bx > -6 && bx < width + 6 && by > -6 && by < height + 6) continue;
    const dx = bx - cx;
    const dy = by - cy;
    // 화면 가장자리(안쪽으로 inset)와 만나는 점
    const scale = Math.min((cx - inset) / Math.abs(dx || 1e-6), (cy - inset - 6) / Math.abs(dy || 1e-6));
    const x = Math.round(cx + dx * scale);
    const y = Math.round(cy + dy * scale + 4);
    const angle = Math.atan2(dy, dx);
    const far = Math.hypot(dx, dy);
    const size = far < Math.max(width, height) ? 7 : 5;
    const pulse = Math.floor(time * 6) % 2;
    const tip = [x + Math.cos(angle) * (size + pulse), y + Math.sin(angle) * (size + pulse)];
    const left = [x + Math.cos(angle + 2.4) * size, y + Math.sin(angle + 2.4) * size];
    const right = [x + Math.cos(angle - 2.4) * size, y + Math.sin(angle - 2.4) * size];
    ctx.beginPath();
    ctx.moveTo(...tip);
    ctx.lineTo(...left);
    ctx.lineTo(...right);
    ctx.closePath();
    ctx.fillStyle = '#2a1c14';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#2a1c14';
    ctx.stroke();
    ctx.fillStyle = pulse ? '#ff5a3c' : '#e0645b';
    ctx.fill();
    disc(ctx, Math.round(x - Math.cos(angle) * 6), Math.round(y - Math.sin(angle) * 6), 2, '#ffffff');
    disc(ctx, Math.round(x - Math.cos(angle) * 6), Math.round(y - Math.sin(angle) * 6), 1, '#e0645b');
  }
}

// 적의 공격 예고(빨간 원, 증기 줄기, 포자, 떨어지는 쓰레기). 내 무기와 이펙트 위에 그려서 가려지지 않게 한다.
function drawHazards(ctx, game, toBuffer, time) {
  for (const hazard of game.hazards) {
    const [x, y] = toBuffer(hazard);
    const radius = hazard.radius / WORLD_PER_PIXEL;
    const closing = 1 - hazard.delay / hazard.total;
    if (hazard.line) {
      // 증기 줄기 예고: 빨간 띠가 차오른다.
      const dx = Math.cos(hazard.angle);
      const dy = Math.sin(hazard.angle);
      const reach = hazard.length / WORLD_PER_PIXEL;
      // 띠는 돌린 사각형으로 한 번에 그린다(점을 하나씩 찍으면 느리다).
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(hazard.angle);
      ctx.fillStyle = `rgba(224, 100, 91, ${0.08 + closing * 0.2})`;
      ctx.fillRect(0, -radius, reach, radius * 2);
      ctx.fillStyle = '#e0645b';
      ctx.fillRect(0, -radius - 1, reach, 1);
      ctx.fillRect(0, radius, reach, 1);
      ctx.restore();
      line(ctx, x, y, Math.round(x + dx * reach * closing), Math.round(y + dy * reach * closing), 'rgba(255,255,255,0.9)');
      continue;
    }
    const [fill, edge] = hazard.spore ? [`rgba(111, 150, 70, ${0.15 + closing * 0.25})`, '#6f9646'] : [`rgba(224, 100, 91, ${0.12 + closing * 0.22})`, '#e0645b'];
    disc(ctx, x, y, radius, fill);
    ring(ctx, x, y, radius, edge, 2, Math.floor(time * 16));
    ring(ctx, x, y, radius * closing, 'rgba(255,255,255,0.8)');
    if (hazard.spore) {
      // 포자가 위에서 천천히 내려온다.
      disc(ctx, x, Math.round(y - (1 - closing) * 50 - 3), 3, '#a9c77f');
      disc(ctx, x, Math.round(y - (1 - closing) * 50 - 3), 1.5, '#6f9646');
    } else if (!hazard.blast) {
      drawCentered(ctx, sprite('trashA'), x, y - Math.round((1 - closing) * 70) - 4);
    }
  }
}

export function render(ctx, game, width, height, time) {
  const map = game.map ?? 'room';
  const floor = floorOf(map);
  const surround = SURROUND[map] ?? SURROUND.room;
  ctx.imageSmoothingEnabled = false;
  const { player } = game;
  const shake = game.shake > 0 ? Math.min(4, game.shake * 10) : 0;
  const cameraX = Math.round(player.x / WORLD_PER_PIXEL - width / 2 + Math.sin(time * 90) * shake);
  const cameraY = Math.round(player.y / WORLD_PER_PIXEL - height / 2 + Math.cos(time * 70) * shake);
  const toBuffer = (item) => [Math.round(item.x / WORLD_PER_PIXEL - cameraX), Math.round(item.y / WORLD_PER_PIXEL - cameraY)];
  const visible = ([x, y], margin = 30) => x > -margin && x < width + margin && y > -margin && y < height + margin;

  // 벽과 바닥
  ctx.fillStyle = surround.outside;
  ctx.fillRect(0, 0, width, height);
  const arenaW = ARENA.width / WORLD_PER_PIXEL;
  const arenaH = ARENA.height / WORLD_PER_PIXEL;
  const left = Math.max(0, -cameraX);
  const top = Math.max(0, -cameraY);
  const right = Math.min(width, arenaW - cameraX);
  const bottom = Math.min(height, arenaH - cameraY);
  const tw = floor.width;
  const th = floor.height;
  for (let y = top - ((top + cameraY) % th + th) % th; y < bottom; y += th) {
    for (let x = left - ((left + cameraX) % tw + tw) % tw; x < right; x += tw) ctx.drawImage(floor, x, y);
  }
  ctx.fillStyle = surround.outside;
  ctx.fillRect(0, 0, left, height);
  ctx.fillRect(right, 0, width - right, height);
  ctx.fillRect(0, 0, width, top);
  ctx.fillRect(0, bottom, width, height - bottom);
  ctx.fillStyle = surround.wall;
  ctx.fillRect(left - 3, top - 3, right - left + 6, 3);
  ctx.fillRect(left - 3, bottom, right - left + 6, 3);
  ctx.fillRect(left - 3, top, 3, bottom - top);
  ctx.fillRect(right, top, 3, bottom - top);

  for (const slime of game.slimes) {
    const [x, y] = toBuffer(slime);
    disc(ctx, x, y, slime.radius / WORLD_PER_PIXEL, `rgba(111, 150, 70, ${slime.life > 1 ? 0.4 : 0.2})`);
  }
  for (const trap of game.traps) {
    // 쥐덫: 납작한 연한 나무판에 은색 쇠고리와 치즈. 준비되면 쇠고리가 반짝인다(보물 상자와 헷갈리지 않게 낮고 밝게).
    const [x, y] = toBuffer(trap);
    const armed = trap.armIn <= 0;
    const ready = 1 - Math.max(0, trap.armIn) / (trap.armSec ?? 0.4);
    const trigger = trap.radius / WORLD_PER_PIXEL;
    disc(ctx, x, y, trigger, armed ? 'rgba(255,207,63,0.08)' : 'rgba(95,134,207,0.05)');
    ring(ctx, x, y, Math.max(2, trigger * ready), armed ? 'rgba(232,135,26,0.5)' : 'rgba(95,134,207,0.6)', 3, Math.floor(time * 10));
    const scale = trap.radius / 30;
    const w = Math.round(6 * scale);
    const h = Math.max(2, Math.round(2 * scale));
    ctx.fillStyle = 'rgba(120, 80, 40, 0.25)';
    ctx.fillRect(x - w, y + h, w * 2, 1);
    ctx.fillStyle = '#8a6a2a';
    ctx.fillRect(x - w - 1, y - h - 1, w * 2 + 2, h * 2 + 2);
    ctx.fillStyle = trap.mega ? '#ffe08a' : '#e6c97a';
    ctx.fillRect(x - w, y - h, w * 2, h * 2);
    const shine = trap.armIn > 0 ? '#8a8f98' : Math.floor(time * 6) % 2 ? '#ffffff' : '#c4c9d1';
    ctx.fillStyle = shine;
    ctx.fillRect(x - w + 1, y - h - 3, w * 2 - 2, 1);
    ctx.fillRect(x - w + 1, y - h - 3, 1, 3);
    ctx.fillRect(x + w - 2, y - h - 3, 1, 3);
    ctx.fillStyle = '#ffcf3f';
    ctx.fillRect(x + w - 4, y - 1, 3, 2);
    ctx.fillStyle = '#e8871a';
    ctx.fillRect(x + w - 3, y, 1, 1);
  }
  for (const pin of game.pins ?? []) {
    // 빨래집게 함정: 바닥에 벌어진 집게가 놓여 있다.
    const [x, y] = toBuffer(pin);
    const blink = pin.life < 1.5 && Math.floor(time * 8) % 2 === 0;
    ctx.fillStyle = 'rgba(120, 80, 40, 0.25)';
    ctx.fillRect(x - 4, y + 4, 9, 1);
    ctx.fillStyle = blink ? '#ffffff' : '#8a4a1e';
    ctx.fillRect(x - 4, y - 4, 2, 8);
    ctx.fillRect(x + 3, y - 4, 2, 8);
    ctx.fillStyle = '#e6c97a';
    ctx.fillRect(x - 3, y - 3, 1, 6);
    ctx.fillRect(x + 3, y - 3, 1, 6);
    ctx.fillStyle = '#c4c9d1';
    ctx.fillRect(x - 2, y, 5, 1);
  }
  for (const wave of game.waves) {
    // 전자레인지 파동: 노란빛 고리가 두 겹으로 퍼진다(건조 오븐의 두 번째 파동은 출발 전까지 안 보인다).
    if (wave.r <= 0) continue;
    const [x, y] = toBuffer(wave);
    const r = wave.r / WORLD_PER_PIXEL;
    const fade = 1 - wave.r / wave.max;
    ring(ctx, x, y, r, wave.mega ? `rgba(255, 106, 42, ${0.4 + fade * 0.6})` : `rgba(255, 207, 63, ${0.4 + fade * 0.6})`);
    ring(ctx, x, y, Math.max(1, r - 1), wave.mega ? 'rgba(255,106,42,0.4)' : 'rgba(255,207,63,0.4)');
    ring(ctx, x, y, r - 2, `rgba(255, 255, 255, ${0.3 + fade * 0.5})`, 2, Math.floor(time * 20));
    ring(ctx, x, y, Math.max(1, r - 6), `rgba(255, 138, 61, ${fade * 0.5})`, 3, 0);
    for (let spark = 0; spark < 8; spark++) {
      const angle = spark * Math.PI / 4 + time * 1.5;
      line(ctx, Math.round(x + Math.cos(angle) * (r - 5)), Math.round(y + Math.sin(angle) * (r - 5)),
        Math.round(x + Math.cos(angle + 0.04) * r), Math.round(y + Math.sin(angle + 0.04) * r), '#fff4c2');
    }
  }
  for (const splash of game.splashes) {
    // 샤워기: 떨어질 자리를 파란 원으로 보여 주고, 물줄기가 위에서 내려온다.
    const [x, y] = toBuffer(splash);
    const radius = splash.radius / WORLD_PER_PIXEL;
    const left = splash.delay / splash.total;
    ring(ctx, x, y, radius, 'rgba(95, 134, 207, 0.6)', 2, Math.floor(time * 16));
    const top = Math.round(y - 4 - left * 50);
    ctx.fillStyle = splash.mega ? '#7fe9ff' : '#a9cdf5';
    ctx.fillRect(x - 1, top - 8, 2, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, top - 8, 1, 3);
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
  if (activeWeapon(game, 'dehumidifier')) {
    // 완성형이면 범위가 넓어진 만큼 원도 크게 그린다.
    const radius = (WEAPONS.dehumidifier.radius[game.weapons.dehumidifier - 1] * statsOf(game).area
      * (game.evolved.dehumidifier ? EVOLUTIONS.dehumidifier.radius : 1)) / WORLD_PER_PIXEL;
    const [x, y] = toBuffer(player);
    disc(ctx, x, y, radius, 'rgba(143, 177, 233, 0.12)');
    if (game.evolved.dehumidifier) ring(ctx, x, y, radius * 0.78, 'rgba(127,233,255,0.5)', 3, Math.floor(-time * 14));
    for (let ribbon = 0; ribbon < 8; ribbon++) {
      const angle = ribbon * Math.PI / 4 + time * 0.7;
      const at = radius * (1 - ((time * 0.6 + ribbon * 0.17) % 1));
      const tip = Math.max(5, at - 5);
      line(ctx, Math.round(x + Math.cos(angle) * at), Math.round(y + Math.sin(angle) * at),
        Math.round(x + Math.cos(angle + 0.13) * tip), Math.round(y + Math.sin(angle + 0.13) * tip), '#a9cdf5');
    }
    ctx.drawImage(icon('dehumidifier', Math.floor(time * 6) % ITEM_FRAMES), Math.round(x - 17), Math.round(y + 5), 12, 12);
    ring(ctx, x, y, radius, 'rgba(95, 134, 207, 0.8)', 3, Math.floor(time * 14));
  }

  if (game.relics?.heatpad) {
    // 전기장판: 발밑에 뜨끈한 주황빛 장판과 일렁이는 아지랑이
    const radius = (RELICS.heatpad.radius * statsOf(game).area) / WORLD_PER_PIXEL;
    const [x, y] = toBuffer(player);
    disc(ctx, x, y, radius, `rgba(255, 138, 61, ${0.08 + Math.sin(time * 4) * 0.02})`);
    // 지질 때마다 장판 전체가 번쩍 달아오른다.
    const pulse = game.time - (game.heatPulse ?? -9);
    if (pulse < 0.3) {
      disc(ctx, x, y, radius, `rgba(255, 120, 40, ${0.3 * (1 - pulse / 0.3)})`);
      ring(ctx, x, y, radius * (0.6 + pulse * 1.3), `rgba(255, 236, 160, ${1 - pulse / 0.3})`);
    }
    ring(ctx, x, y, radius, 'rgba(255, 106, 42, 0.75)', 4, Math.floor(time * 10));
    ring(ctx, x, y, radius * 0.66, 'rgba(255, 207, 63, 0.45)', 2, Math.floor(-time * 8));
    ctx.fillStyle = 'rgba(255, 220, 160, 0.8)';
    for (let wisp = 0; wisp < 8; wisp += 1) {
      const angle = (wisp / 8) * Math.PI * 2 + time * 0.6;
      const at = radius * (0.35 + ((time * 0.7 + wisp * 0.37) % 1) * 0.6);
      ctx.fillRect(Math.round(x + Math.cos(angle) * at), Math.round(y + Math.sin(angle) * at - ((time * 6 + wisp) % 4)), 1, 2);
    }
  }


  const enemies = game.enemies
    .map((enemy) => ({ enemy, point: toBuffer(enemy) }))
    .filter(({ point, enemy }) => visible(point, enemy.boss ? 60 : 16))
    .sort((a, b) => a.enemy.y - b.enemy.y);
  // 그림자는 한 색으로 먼저 한꺼번에 깔고(색을 매번 바꾸면 느리다), 그 위에 적을 그린다.
  ctx.fillStyle = 'rgba(120, 80, 40, 0.25)';
  for (const { enemy, point } of enemies) {
    const size = enemy.radius / WORLD_PER_PIXEL;
    const shadow = Math.round(size * 0.85);
    ctx.fillRect(Math.round(point[0]) - shadow, Math.round(point[1] + size) - 1, shadow * 2, 2);
  }
  for (const { enemy, point } of enemies) drawEnemy(ctx, enemy, point[0], point[1], time);
  const [duckX, duckY] = toBuffer(player);

  if (activeWeapon(game, 'dryer') && game.dryerOn) {
    ctx.save(); ctx.translate(duckX, duckY); ctx.rotate(game.dryerAngle);
    ctx.fillStyle = '#2a2a30'; ctx.fillRect(4, -3, 9, 6);
    ctx.fillStyle = '#e6dccb'; ctx.fillRect(5, -2, 7, 4);
    ctx.fillStyle = '#5f86cf'; ctx.fillRect(5, 1, 3, 5);
    ctx.fillStyle = '#ffcf3f'; ctx.fillRect(11, -2, 3, 4);
    ctx.restore();
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
    glow(ctx, x, y, 6 * grow, [255, 138, 40], 0.55);
    disc(ctx, x, y, 3 * grow, '#e8871a');
    disc(ctx, x, y, grow, '#ffe08a');
    ctx.fillStyle = 'rgba(200,200,200,0.7)';
    ctx.fillRect(x - 1, y - 5 - (Math.floor(time * 8) % 3), 1, 2);
  }
  for (const shot of game.shots) {
    const [x, y] = toBuffer(shot);
    if (shot.kind === 'grenade') {
      const [tx, ty] = toBuffer({ x: shot.toX, y: shot.toY });
      const progress = Math.min(1, shot.age / shot.flightSec);
      const lift = Math.sin(progress * Math.PI) * shot.arcHeight / WORLD_PER_PIXEL;
      ring(ctx, tx, ty, shot.blast / WORLD_PER_PIXEL, shot.acid ? 'rgba(100,210,160,0.35)' : 'rgba(255,210,100,0.35)', 5, Math.floor(time * 12));
      disc(ctx, x, y + 2, 3, 'rgba(40,50,40,0.2)');
      const gy = Math.round(y - lift);
      ctx.fillStyle = '#2a3326';ctx.fillRect(x - 3, gy - 3, 6, 7);
      ctx.fillStyle = shot.acid ? '#62c984' : '#81914f';ctx.fillRect(x - 2, gy - 2, 4, 5);
      ctx.fillStyle = '#ffe08a';ctx.fillRect(x - 1, gy - 5, 2, 2);
      if (progress >= 1 && Math.floor(time * 16) % 2) { ctx.fillStyle = '#ffffff';ctx.fillRect(x - 2, gy - 2, 4, 2); }
      continue;
    }
    // 날아가는 것마다 제 빛깔로 은은하게 빛난다.
    const halo = SHOT_GLOW[shot.kind ?? (shot.mega ? 'megaSpray' : 'spray')] ?? null;
    const haloSize = shot.kind === 'roller' ? shot.radius / WORLD_PER_PIXEL + 3 : shot.kind === 'staple' ? 3 : 5;
    if (halo && visible([x, y])) glow(ctx, x, y, haloSize * (shot.scale ?? 1), shot.poison ? [93, 255, 154] : halo, shot.mega ? 0.5 : 0.35);
    if (shot.kind === 'summon' || shot.kind === 'seed') {
      const seed = shot.kind === 'seed';
      const angle = Math.atan2(shot.vy, shot.vx);
      const color = seed ? '#8fd19e' : '#7fe9ff';
      line(ctx, Math.round(x - Math.cos(angle) * 7), Math.round(y - Math.sin(angle) * 7), Math.round(x), Math.round(y), color);
      disc(ctx, x, y, (seed ? 3 : 2) * (shot.scale ?? 1), color);
      ctx.fillStyle = seed ? '#3e9f6a' : '#ffffff';
      ctx.fillRect(Math.round(x), Math.round(y - 1), 2, 2);
      if (seed) { ctx.fillStyle = '#ffe08a'; ctx.fillRect(Math.round(x - 1), Math.round(y), 1, 1); }
      continue;
    }
    if (shot.kind === 'marine') {
      const angle = Math.atan2(shot.vy, shot.vx);
      const color = shot.acid ? '#76ff93' : '#83c8ff';
      line(ctx, Math.round(x - Math.cos(angle) * 6), Math.round(y - Math.sin(angle) * 6), Math.round(x), Math.round(y), color);
      disc(ctx, x, y, 2 * (shot.scale ?? 1), color);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, 1, 1);
      continue;
    }
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
      const half = Math.max(4, Math.round(shot.radius / WORLD_PER_PIXEL));
      const along = Math.atan2(shot.vy, shot.vx);
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      ctx.rotate(along);
      for (let ghost = 3; ghost >= 1; ghost--) {
        ctx.fillStyle = `rgba(143,177,233,${0.18 - ghost * 0.035})`;
        ctx.fillRect(-ghost * 10 - 3, -half, 5, half * 2);
      }
      ctx.fillStyle = '#2a2a30'; ctx.fillRect(-5, -half - 1, 11, half * 2 + 2);
      ctx.fillStyle = '#e6dccb'; ctx.fillRect(-4, -half, 9, half * 2);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-3, -half + 1, 6, half * 2 - 2);
      ctx.fillStyle = shot.mega ? '#f6bd24' : '#5f86cf';
      ctx.fillRect(-4, -half, 9, 2); ctx.fillRect(-4, half - 2, 9, 2);
      const stripe = Math.floor(time * 24) % 5 - 2;
      ctx.fillStyle = '#c4c9d1'; ctx.fillRect(stripe, -half + 2, 1, Math.max(1, half * 2 - 4));
      ctx.fillStyle = '#3d3d42'; ctx.fillRect(-12, -1, 8, 2);
      ctx.fillStyle = '#3a5a9c'; ctx.fillRect(-17, -2, 6, 4);
      ctx.restore();
      continue;
    }
    if (shot.kind === 'plane') {
      // 종이비행기: 날아가는 쪽을 향한 하얀 삼각형과 바람 꼬리
      const angle = Math.atan2(shot.vy, shot.vx);
      const size = 4 * (shot.scale ?? 1);
      const nose = [x + Math.cos(angle) * size, y + Math.sin(angle) * size];
      const left = [x + Math.cos(angle + 2.5) * size, y + Math.sin(angle + 2.5) * size];
      const right = [x + Math.cos(angle - 2.5) * size, y + Math.sin(angle - 2.5) * size];
      // 두 갈래 바람 꼬리가 길게 남는다.
      for (let step = 1; step <= 6; step += 1) {
        ctx.fillStyle = `rgba(255,255,255,${0.6 - step * 0.09})`;
        const wobble = Math.sin(time * 18 + step) * 0.8;
        for (const wing of [-1, 1]) {
          ctx.fillRect(Math.round(x - Math.cos(angle) * step * 3 + Math.cos(angle + Math.PI / 2) * wing * (2 + wobble)),
            Math.round(y - Math.sin(angle) * step * 3 + Math.sin(angle + Math.PI / 2) * wing * (2 + wobble)), 1, 1);
        }
      }
      ctx.beginPath();
      ctx.moveTo(...nose);
      ctx.lineTo(...left);
      ctx.lineTo(x - Math.cos(angle) * size * 0.3, y - Math.sin(angle) * size * 0.3);
      ctx.lineTo(...right);
      ctx.closePath();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#2a1c14';
      ctx.stroke();
      ctx.fillStyle = shot.mega ? '#ffb3bf' : '#ffffff';
      ctx.fill();
      continue;
    }
    if (shot.kind === 'ice') {
      // 정수기 얼음 조각: 날아가는 쪽으로 뾰족한 하늘색 마름모
      const pace = Math.hypot(shot.vx, shot.vy) || 1;
      const fx = shot.vx / pace;
      const fy = shot.vy / pace;
      line(ctx, Math.round(x - fx * 4), Math.round(y - fy * 4), Math.round(x + fx * 3), Math.round(y + fy * 3), '#8fd0ff');
      ctx.fillStyle = '#d3f3ff';
      ctx.fillRect(Math.round(x - fy), Math.round(y + fx), 1, 1);
      ctx.fillRect(Math.round(x + fy), Math.round(y - fx), 1, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(x + fx * 2), Math.round(y + fy * 2), 1, 1);
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
  if (game.fusions.spinlaser && game.megaLaser && game.megaLaser.phase !== 'cooldown') {
    const beam = game.megaLaser;
    const [x, y] = toBuffer(beam);
    const reach = beam.length / WORLD_PER_PIXEL;
    const mega = FUSIONS.spinlaser;
    if (beam.phase === 'charge') {
      const charged = 1 - beam.remaining / mega.chargeSec;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(beam.angle);
      ctx.fillStyle = 'rgba(127,233,255,0.12)';
      ctx.fillRect(8, -beam.width / WORLD_PER_PIXEL / 2, reach, beam.width / WORLD_PER_PIXEL);
      ctx.fillStyle = '#7fe9ff';
      for (let dash = 0; dash < 32; dash++) ctx.fillRect(8 + dash * reach / 32, -1, reach / 48, 2);
      ctx.restore();
      glow(ctx, x, y, 12 + charged * 16, [127, 233, 255], 0.45 + charged * 0.35);
      ring(ctx, x, y, 24 - charged * 15, '#b9f3ff', 2, Math.floor(time * 30));
      disc(ctx, x, y, 2 + charged * 5, '#ffffff');
    } else {
      const age = mega.durationSec - beam.remaining;
      const pulse = 1 + Math.sin(time * 45) * 0.035;
      const half = beam.width / WORLD_PER_PIXEL / 2 * pulse;
      drawBeam(ctx, x, y, beam.angle, reach, half, BEAM.mega, Math.floor(time * 24), 0.2);
      // 빔 안에 흐르는 띠만 그려서 추가 투사체나 파편을 만들지 않는다.
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(beam.angle);
      ctx.fillStyle = 'rgba(127,233,255,0.5)';
      for (let band = 0; band < 8; band++) {
        const along = 8 + ((time * 520 + band * reach / 8) % Math.max(1, reach - 8));
        ctx.fillRect(along, -half, 3, half * 2);
      }
      ctx.restore();
      glow(ctx, x, y, half * 0.8 + 10, [127, 233, 255], 0.8);
      disc(ctx, x, y, 6, '#ffffff');
      if (age < 0.35) ring(ctx, x, y, 12 + age * 180, '#ffffff', 3, Math.floor(time * 30));
    }
  }
  for (const spinner of topSpinners(game)) {
    // 팽이: 빙글빙글 도는 알록달록 팽이와 회오리 자국
    const [x, y] = toBuffer(spinner);
    const radius = Math.max(4, Math.round(spinner.radius / WORLD_PER_PIXEL));
    glow(ctx, x, y, radius + 4, [255, 120, 160], 0.35);
    disc(ctx, x, y, radius, '#3a2a1a');
    disc(ctx, x, y, radius - 1, '#ff6f91');
    const spin = time * 18;
    for (let stripe = 0; stripe < 3; stripe += 1) {
      const angle = spin + (stripe / 3) * Math.PI * 2;
      line(ctx, x, y, Math.round(x + Math.cos(angle) * (radius - 1)), Math.round(y + Math.sin(angle) * (radius - 1)), ['#ffd23f', '#7fe9ff', '#ffffff'][stripe]);
    }
    disc(ctx, x, y, 1, '#ffffff');
    ring(ctx, x, y, radius + 2, 'rgba(255, 255, 255, 0.45)', 2, Math.floor(time * 20));
  }
  for (const blade of sawBlades(game)) {
    const [x, y] = toBuffer(blade);
    const radius = Math.round(blade.radius / WORLD_PER_PIXEL);
    // 날아가는 뒤로 푸른 잔상이 길게 남는다.
    const pace = Math.hypot(blade.vx, blade.vy);
    if (pace > 1) {
      for (let ghost = 3; ghost >= 1; ghost -= 1) {
        const gx = Math.round(x - (blade.vx / pace) * ghost * radius * 0.9);
        const gy = Math.round(y - (blade.vy / pace) * ghost * radius * 0.9);
        disc(ctx, gx, gy, radius * (1 - ghost * 0.18), `rgba(143, 177, 233, ${0.32 - ghost * 0.08})`);
      }
    }
    glow(ctx, x, y, radius + 6, [143, 208, 255], 0.45);
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
    glow(ctx, x, y, radius + 4, ball.thunder ? [127, 233, 255] : ball.mega ? [255, 178, 31] : [255, 155, 176], 0.4);
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
  for (const unit of game.summons ?? []) {
    const [x, y] = toBuffer(unit);
    if (unit.weapon === 'toydragon') {
      const spine = unit.spine ?? [], size = unit.evolved ? 1.2 : 1;
      for (let index = spine.length - 1; index >= 0; index--) {
        const [sx, sy] = toBuffer(spine[index]);
        const next = spine[index - 1] ?? unit;
        const angle = Math.atan2(next.y - spine[index].y, next.x - spine[index].x);
        const tail = index === spine.length - 1, half = (tail ? 3 : 5) * size;
        ctx.save();ctx.translate(sx, sy);ctx.rotate(angle);
        ctx.fillStyle = 'rgba(40,60,60,0.2)';ctx.fillRect(-half, 4, half * 2, 3);
        disc(ctx, 0, 0, half + 1, '#253b41');
        disc(ctx, 0, 0, half, unit.evolved ? '#427bd4' : '#4f9b79');
        disc(ctx, -1, -2, half * 0.65, unit.evolved ? '#9cd7ff' : '#a9dca2');
        ctx.fillStyle = '#fff0bf';ctx.fillRect(-half, half - 3, half * 2, 2);
        ctx.fillStyle = '#ffcf3f';ctx.fillRect(-2, -half - 3, 3, 4);
        if (!tail && index % 3 === 1) { ctx.fillRect(-2, half - 1, 4, 4);ctx.fillRect(-2, -half - 2, 4, 2); }
        ctx.restore();
      }
      const image = icon(unit.evolved ? 'azuredragon' : 'toydragon', Math.floor(time * 8) % ITEM_FRAMES);
      ctx.save();ctx.translate(x, y);ctx.rotate(unit.angle);ctx.scale(size, size);ctx.drawImage(image, -8, -8);ctx.restore();
      continue;
    }
    const drone = unit.weapon === 'toydrone';
    const bob = drone ? Math.sin(time * 8 + unit.id) * 1.5 - 3 : Math.sin(time * 6 + unit.id) * 0.5;
    ring(ctx, x, y + 5, 6, 'rgba(95,134,207,0.5)', 3, 0);
    ctx.fillStyle = 'rgba(40,50,70,0.2)'; ctx.fillRect(x - 5, y + 5, 10, 2);
    if (unit.charging) {
      const dx = Math.cos(unit.angle), dy = Math.sin(unit.angle);
      for (let trail = 1; trail <= 3; trail++) {
        ctx.fillStyle = trail % 2 ? '#ffe08a' : '#ffb21f';
        ctx.fillRect(Math.round(x - dx * trail * 5), Math.round(y - dy * trail * 5), 2, 2);
      }
    }
    const firing = game.time < (unit.muzzleUntil ?? 0);
    const frame = firing ? 1 : Math.floor(time * (drone ? 16 : 8)) % ITEM_FRAMES;
    const spriteId = unit.evolved ? EVOLUTIONS[unit.weapon].icon : unit.weapon;
    ctx.save(); ctx.translate(Math.round(x), Math.round(y + bob));
    if (Math.cos(unit.angle) < 0) ctx.scale(-1, 1);
    ctx.drawImage(icon(spriteId, frame), -8, -10); ctx.restore();
    if (firing && drone) disc(ctx, Math.round(x + Math.cos(unit.angle) * 9), Math.round(y + bob + Math.sin(unit.angle) * 6), 2, '#fff4c2');
  }
  for (const robot of game.robots) {
    const [x, y] = toBuffer(robot);
    if (robot.marine) {
      const firing = game.time < (robot.muzzleUntil ?? 0);
      const frame = firing ? 1 : Math.floor(time * 8) % ITEM_FRAMES;
      ctx.fillStyle = 'rgba(40, 50, 70, 0.25)';
      ctx.fillRect(x - 6, y + 5, 12, 3);
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      if (Math.cos(robot.angle) < 0) ctx.scale(-1, 1);
      ctx.drawImage(icon(robot.acid ? 'bleachbot' : 'marine', frame), -8, -10);
      ctx.restore();
      if (firing) disc(ctx, Math.round(x + Math.cos(robot.angle) * 9), Math.round(y + Math.sin(robot.angle) * 9), 2, robot.acid ? '#8cff85' : '#ffe08a');
      continue;
    }
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
    const trailColor = slipper.returning ? 'rgba(127,233,255,0.5)' : 'rgba(255,207,63,0.45)';
    const pace = Math.hypot(slipper.vx, slipper.vy) || 1;
    for (let ghost = 1; ghost <= 3; ghost++) {
      ring(ctx, Math.round(x - slipper.vx / pace * ghost * 6), Math.round(y - slipper.vy / pace * ghost * 6),
        Math.max(1, 4 - ghost), trailColor);
    }
    const turn = Math.floor(slipper.spin / (Math.PI / 2)) % 4;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((turn * Math.PI) / 2);
    ctx.scale(slipper.scale ?? 1, slipper.scale ?? 1);
    drawCentered(ctx, sprite('slipper'), 0, 0);
    ctx.restore();
  }
  drawEffects(ctx, game, toBuffer);
  drawHazards(ctx, game, toBuffer, time);
  // 적 탄막은 내 무기와 이펙트 위에 그려서 무엇을 피해야 하는지 바로 보이게 한다.
  for (const shot of game.enemyShots) {
    const [x, y] = toBuffer(shot);
    const look = ENEMY_SHOT;
    const pulse = Math.floor((shot.age ?? 0) * 12) % 2;
    ctx.fillStyle = look.trail;
    for (let step = 1; step <= 3; step += 1) {
      const size = 4 - step;
      ctx.fillRect(Math.round(x - shot.vx * 0.016 * step) - 1, Math.round(y - shot.vy * 0.016 * step) - 1, size, size);
    }
    disc(ctx, x, y, 5 + pulse, look.glow);
    disc(ctx, x, y, 4, look.outline);
    disc(ctx, x, y, 3, look.edge);
    disc(ctx, x, y, 2, look.body);
    disc(ctx, x - 1, y - 1, 1, look.core);
  }
  // 오리는 맨 위에. 무기와 적, 탄막이 아무리 많아도 가려지지 않는다.
  drawDuck(ctx, game, duckX, duckY, time);
  // 경험치와 드롭 아이템은 투사체 위에 표시한다.
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
  drawBossArrows(ctx, game, toBuffer, width, height, time);

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
