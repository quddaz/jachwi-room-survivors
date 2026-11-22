// 월드 크기는 그대로 두고 도트 한 칸을 둘로 나눠 얼굴·장비·재질을 그린다.
// 런타임 난수와 캔버스에 의존하지 않는 원본 격자라 모든 화면에서 같은 그림을 쓴다.
export const ART_DENSITY = 2;
export const WALK_FRAMES = 6;
export const CREATURE_FRAMES = 4;
export const ART_COLORS = {
  0: '#f4f3eb', 1: '#a7afbd', 2: '#e2e2d8', 3: '#76839a',
  4: '#35445d', 5: '#56718b', 6: '#aac9cf', 7: '#325b65',
  8: '#edca91', 9: '#957350',
};

function grid(width, height) {
  const cells = Array.from({ length: height }, () => Array(width).fill('.'));
  const g = {
    set(x, y, color) {
      x = Math.round(x); y = Math.round(y);
      if (x >= 0 && x < width && y >= 0 && y < height) cells[y][x] = color;
      return g;
    },
    rect(x, y, w, h, color) {
      for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) g.set(x + dx, y + dy, color);
      return g;
    },
    ellipse(cx, cy, rx, ry, color) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
        for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
          if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) g.set(x, y, color);
        }
      }
      return g;
    },
    line(x0, y0, x1, y1, color, thick = 1) {
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let n = 0; n <= steps; n++) g.rect(x0 + (x1 - x0) * n / steps, y0 + (y1 - y0) * n / steps, thick, thick, color);
      return g;
    },
    rows: () => cells.map(row => row.join('')),
  };
  return g;
}

function eye(g, x, y, blink = false, color = 'K') {
  if (blink) g.rect(x, y + 1, 3, 1, color);
  else g.rect(x, y, 3, 4, color).set(x, y, 'W');
}

function duck(role, frame, blink = false, idle = false) {
  const g = grid(44, 44);
  const lift = idle ? (frame === 2 ? -1 : 0) : [0, -1, 0, 0, -1, 0][frame];
  const step = idle ? 0 : [-2, -1, 1, 2, 1, -1][frame];
  // 발→몸통→목→머리 순으로 찍고 머리와 몸통의 명암을 나눈다.
  g.rect(14 + step, 38, 8, 3, 'o').rect(12 + step, 39, 10, 2, 'O').rect(13 + step, 38, 5, 1, 'Y');
  g.rect(26 - step, 38 - (step < 0 ? 1 : 0), 8, 3, 'o').rect(25 - step, 39, 10, 2, 'O');
  g.ellipse(21, 29 + lift, 14, 10, 'w').ellipse(19, 27 + lift, 12, 9, 'W');
  g.ellipse(11, 26 + lift, 6, 5, 'w').ellipse(10, 24 + lift, 4, 4, 'W');
  g.rect(18, 17 + lift, 11, 10, 'w').rect(18, 17 + lift, 8, 11, 'W');
  g.ellipse(24, 13 + lift, 10, 11, 'w').ellipse(22, 11 + lift, 9, 9, 'W');
  g.ellipse(20, 8 + lift, 4, 3, '0');
  // 코·콧구멍·사람 입 모양 없이 닫힌 노란 부리와 작은 점눈.
  g.rect(31, 15 + lift, 8, 5, 'o').rect(30, 14 + lift, 10, 4, 'O');
  g.rect(32, 13 + lift, 6, 2, 'Y').rect(39, 15 + lift, 3, 3, 'O');
  eye(g, 27, 10 + lift, blink);
  g.ellipse(17, 29 + lift, 8, 5, 'w').ellipse(16, 27 + lift, 7, 4, '2');
  g.line(11, 26 + lift, 18, 25 + lift, 'W').line(13, 29 + lift, 20, 28 + lift, 'W');
  if (role === 'normal') {
    g.rect(24, 25 + lift, 8, 3, 'q').rect(24, 25 + lift, 8, 1, 'b');
    g.rect(27, 28 + lift, 3, 5, 'B').set(27, 29 + lift, 'L');
  } else if (role === 'summoner') {
    for (let row = 0; row < 9; row++) g.rect(23 - Math.floor(row / 3), row + 1 + lift, 2 + row, 1, row < 3 ? 'V' : 'v');
    g.rect(13, 8 + lift, 21, 2, 'v').rect(15, 8 + lift, 17, 1, 'V');
    g.rect(25, 4 + lift, 2, 2, 'Y').set(26, 3 + lift, 'W');
    g.rect(9, 28 + lift, 6, 8, 'v').rect(10, 28 + lift, 4, 6, 'V');
    g.line(37, 23, 37, 39, 'N', 2).ellipse(38, 20, 4, 5, 'q').ellipse(37, 19, 3, 4, 'E').set(36, 17, 'W');
  } else if (role === 'hunter') {
    g.rect(16, 3 + lift, 16, 6, 'N').rect(17, 3 + lift, 12, 4, 'n');
    g.rect(16, 7 + lift, 16, 2, 'k').rect(11, 9 + lift, 25, 2, 'N');
    g.rect(12, 9 + lift, 20, 1, '8');
    g.line(15, 21 + lift, 29, 34 + lift, 'N', 2);
    g.rect(8, 28 + lift, 8, 9, 'k').rect(8, 28 + lift, 7, 7, 'n').rect(8, 28 + lift, 7, 2, 'N');
    g.rect(11, 30 + lift, 2, 2, 'Y').set(11, 30 + lift, 'W');
  } else if (role === 'gunner') {
    g.rect(14, 8 + lift, 20, 2, 'r').rect(14, 8 + lift, 19, 1, 'R');
    g.line(14, 9 + lift, 8, 12 + lift, 'R', 2).line(12, 10 + lift, 9, 15 + lift, 'r');
    g.line(17, 21 + lift, 28, 34 + lift, 'N', 3);
    for (let n = 0; n < 4; n++) g.rect(18 + n * 3, 23 + n * 3 + lift, 2, 3, 'Y').set(18 + n * 3, 23 + n * 3 + lift, 'W');
    g.rect(30, 30 + lift, 4, 7, '4').rect(31, 27 + lift, 7, 4, 'd').rect(31, 27 + lift, 6, 1, 'W');
  } else if (role === 'alchemist') {
    // 머리 위 고글, 초록 앞치마, 손에 든 유리 플라스크.
    g.rect(15, 5 + lift, 19, 3, 'x').rect(18, 4 + lift, 6, 5, '4').rect(26, 4 + lift, 6, 5, '4');
    g.rect(19, 5 + lift, 4, 2, 'E').rect(27, 5 + lift, 4, 2, 'T').set(19, 5 + lift, 'W');
    g.line(21, 22 + lift, 26, 25 + lift, 'x', 2).rect(23, 25 + lift, 8, 11, 'G').rect(24, 25 + lift, 5, 8, 'g');
    g.rect(25, 29 + lift, 4, 3, 'W').set(26, 30 + lift, 'G');
    g.rect(34, 23 + lift, 4, 6, '6').ellipse(36, 33 + lift, 5, 6, '7').ellipse(36, 32 + lift, 4, 5, 'E');
    g.ellipse(36, 34 + lift, 3, 3, 'G').rect(34, 23 + lift, 4, 2, 'N').set(34, 30 + lift, 'W');
  }
  return g.rows();
}

function creature(kind, frame) {
  const phase = [0, 1, 0, -1][frame];
  let g;
  if (kind === 'roach' || kind === 'ant') {
    const ant = kind === 'ant'; g = grid(30, 18);
    for (let n = 0; n < 3; n++) {
      const x = 7 + n * 6, sway = phase * (n % 2 ? -1 : 1);
      g.line(x, 6, x - 3 + sway, 2, 'k').line(x - 3 + sway, 2, x - 5 + sway, 1, 'k');
      g.line(x, 11, x + 2 - sway, 15, 'k').line(x + 2 - sway, 15, x - 1 - sway, 16, 'k');
    }
    g.ellipse(12, 8, ant ? 7 : 10, 5, 'k').ellipse(11, 7, ant ? 6 : 9, 4, 'N');
    g.ellipse(9, 5, 5, 2, 'n').ellipse(23, 8, 4, 4, 'k').ellipse(23, 7, 3, 3, 'N');
    if (!ant) { g.line(13, 4, 15, 11, 'k');g.line(6, 8, 12, 8, 'C'); }
    g.line(25, 5, 28, 1 + (frame % 2), 'k').line(26, 10, 29, 13 - (frame % 2), 'k');
    g.set(25, 6, 'Y').set(26, 6, 'K');
  } else if (kind === 'trash') {
    g = grid(30, 32);const bob = frame % 2;
    g.rect(13, 1 + bob, 6, 3, 'O').rect(11, 3 + bob, 10, 2, 'o').rect(14, 5 + bob, 5, 3, '4');
    g.ellipse(15, 20 + bob, 13, 10 - bob, '4').ellipse(14, 18 + bob, 11, 10 - bob, 'D');
    g.ellipse(10, 15 + bob, 6, 6, 'S').line(7, 15 + bob, 10, 10 + bob, 'd');
    g.line(12, 10 + bob, 9, 20, '4').line(21, 12 + bob, 24, 23, 'h');
    eye(g, 10, 17 + bob);eye(g, 21, 17 + bob);
    g.rect(15, 25, 6, 2, 'K').set(15, 25, 'w');
  } else if (kind === 'rust') {
    g = grid(26, 30);const bob = frame % 2;
    g.rect(12, 1 + bob, 3, 4, 'C').ellipse(13, 19 + bob, 11, 9 - bob, 'c');
    g.ellipse(12, 16 + bob, 9, 10, 'C').ellipse(9, 13 + bob, 4, 6, 'n');
    g.line(13, 3 + bob, 6, 15 + bob, 'C', 2).rect(7, 10 + bob, 2, 5, '8');
    eye(g, 9, 18 + bob);eye(g, 18, 18 + bob);g.rect(13, 25, 5, 1, 'k');
    g.rect(4 - phase, 27, 6, 2, 'c').rect(17 + phase, 27, 6, 2, 'c');
  } else if (kind === 'mold' || kind === 'dustbunny') {
    const dust = kind === 'dustbunny'; g = grid(30, 28);
    const deep = dust ? '3' : 'm', mid = dust ? 'z' : 'M', light = dust ? '0' : 'g';
    for (let n = 0; n < 8; n++) {
      const angle = n * Math.PI / 4;
      g.ellipse(15 + Math.cos(angle) * 8, 14 + Math.sin(angle) * 7 + (n % 2 ? phase : 0), 5, 5, deep);
    }
    g.ellipse(14, 13, 11, 10, mid).ellipse(11, 10, 7, 5, light);
    if (dust) { g.ellipse(8, 4 - phase, 3, 4, 'z').ellipse(21, 3 + phase, 3, 4, 'z'); }
    else { g.rect(6, 8, 2, 2, 'Y').rect(21, 16, 2, 2, 'G').set(18, 5, 'Y'); }
    eye(g, 10, 12);eye(g, 20, 12);g.rect(15, 19, 3, 1, deep);
    g.rect(6 + phase, 24, 6, 2, deep).rect(20 - phase, 24, 5, 2, deep);
  } else if (kind === 'fly' || kind === 'mosquito' || kind === 'moth') {
    const moth = kind === 'moth', mosquito = kind === 'mosquito';g = grid(30, 24);
    const flap = [0, 3, 1, -1][frame];
    g.ellipse(8, 7 + flap, moth ? 7 : 6, moth ? 7 : 4, moth ? 'N' : '5');
    g.ellipse(7, 6 + flap, moth ? 5 : 4, moth ? 5 : 3, moth ? 'n' : '6');
    g.ellipse(22, 7 + flap, moth ? 7 : 6, moth ? 7 : 4, moth ? 'N' : '5');
    g.ellipse(21, 6 + flap, moth ? 5 : 4, moth ? 5 : 3, moth ? 'n' : 'i');
    g.line(4, 6 + flap, 10, 8 + flap, moth ? '8' : 'W');
    if (moth) { g.ellipse(7, 7 + flap, 2, 2, 'k');g.ellipse(23, 7 + flap, 2, 2, 'k'); }
    g.ellipse(15, 14, 4, 7, '4').ellipse(14, 12, 3, 5, 'D').rect(12, 17, 6, 1, 'd');
    g.ellipse(11, 11, 3, 3, 'r').ellipse(19, 11, 3, 3, 'R').set(10, 10, 'a').set(18, 10, 'W');
    if (mosquito) g.line(16, 13, 26, 16, 'k');
    g.line(13, 20, 10 - phase, 22, '4').line(18, 20, 21 + phase, 22, '4');
  } else if (kind === 'spider') {
    g = grid(32, 28);
    for (let n = 0; n < 4; n++) {
      const y = 8 + n * 4, out = (n % 2 ? -1 : 1) * phase;
      g.line(13, y, 5, y - 5 + out, '4', 2).line(5, y - 5 + out, 1, y + out, '4');
      g.line(21, y, 27, y - 5 - out, '4', 2).line(27, y - 5 - out, 31, y - out, '4');
    }
    g.ellipse(17, 10, 7, 8, '4').ellipse(16, 8, 6, 6, 'S').ellipse(15, 5, 3, 2, 'd');
    g.ellipse(17, 19, 8, 6, '4').ellipse(16, 17, 6, 4, 'D');
    g.rect(12, 17, 3, 3, 'R').rect(20, 17, 3, 3, 'R').set(12, 17, 'W').set(20, 17, 'W');
    g.rect(15, 23, 1, 3, 'z').rect(19, 23, 1, 3, 'z');
  } else if (kind === 'milk') {
    g = grid(26, 32);const bob = frame % 2;
    g.rect(7, 2 + bob, 12, 3, 'w').rect(5, 5 + bob, 16, 23 - bob, 'z');
    g.rect(6, 5 + bob, 12, 21 - bob, 'W').rect(6, 11 + bob, 14, 8, 'B');
    g.rect(8, 12 + bob, 4, 2, 'L').rect(15, 14 + bob, 3, 3, 'q');
    g.line(7, 4 + bob, 12, 1 + bob, 'W', 2).line(12, 1 + bob, 20, 5 + bob, 'w');
    eye(g, 8, 21);eye(g, 16, 21);g.rect(11, 27, 5, 1, 'K');
    g.rect(6, 24, 2, 3, 'M').set(8, 26, 'g').rect(18, 8, 2, 3, 'M');
    g.rect(7 + phase, 29, 5, 2, '4').rect(16 - phase, 29, 5, 2, '4');
  } else if (kind === 'mouse') {
    g = grid(34, 24);
    g.line(7, 17, 2, 19 + phase, 'A').line(2, 19 + phase, 1, 13 + phase, 'a');
    g.ellipse(18, 14, 11, 7, '3').ellipse(16, 12, 9, 5, 'd').ellipse(13, 10, 5, 3, 'z');
    g.ellipse(25, 8, 5, 6, '3').ellipse(24, 7, 3, 4, 'a');
    g.ellipse(27, 14, 5, 5, 'd').rect(31, 14, 2, 2, 'A');eye(g, 27, 10);
    g.rect(10 + phase, 20, 5, 2, 'a').rect(24 - phase, 20, 5, 2, 'a');
    g.line(27, 16, 31, 18, 'w').line(26, 17, 30, 20, 'w');
  } else if (kind === 'slug') {
    g = grid(32, 22);
    g.ellipse(15, 16, 14, 4, 'c').ellipse(16, 13, 12, 5, 'n').ellipse(13, 11, 8, 3, '8');
    g.ellipse(25, 10, 5, 7, 'n').line(23, 7, 21 - phase, 2, 'c', 2).line(27, 7, 29 + phase, 2, 'c', 2);
    g.rect(20 - phase, 1, 2, 2, 'K').rect(28 + phase, 1, 2, 2, 'K');
    g.rect(6, 17, 17, 1, 'Y').set(13 + phase, 12, 'c').set(8, 13, 'N');
  } else if (kind === 'sock') {
    g = grid(26, 32);const sway = phase;
    g.rect(9 + sway, 2, 13, 20, 'w').rect(9 + sway, 2, 10, 18, 'W');
    g.rect(9 + sway, 3, 13, 3, 'R').rect(9 + sway, 7, 13, 2, 'B');
    g.ellipse(12, 24, 10, 6, 'w').ellipse(10, 22, 8, 5, 'W');
    g.rect(3, 25, 7, 3, 'B').rect(18, 22, 4, 4, 'b');
    eye(g, 11 + sway, 13);eye(g, 19 + sway, 13);
    g.rect(13 + sway, 20, 4, 1, 'K').rect(8, 20, 2, 2, 'M').set(17, 27, 'M');
  } else if (kind === 'pigeon') {
    g = grid(32, 30);
    g.rect(10 + phase, 27, 6, 2, 'R').rect(20 - phase, 27, 6, 2, 'R');
    g.ellipse(16, 19, 11, 8, '3').ellipse(14, 17, 9, 6, 'd');
    g.ellipse(12, 19, 7, 5, '5').line(7, 18, 15, 23, 'z');
    g.rect(20, 12, 7, 9, 'G').rect(20, 14, 7, 3, 'V');
    g.ellipse(23, 9, 7, 7, '3').ellipse(22, 7, 6, 5, 'd');
    g.rect(28, 9, 4, 3, 'o').set(29, 9, 'Y');eye(g, 25, 5);
    g.line(6, 21, 2, 24 + phase, '4', 2);
  } else if (kind === 'scrap') {
    g = grid(18, 16);g.ellipse(9, 8, 7, 6, 'p').ellipse(8, 6, 6, 4, 'P');
    g.line(5, 4, 11, 5, 'W').rect(5, 8, 2, 2, 'K').rect(12, 8, 2, 2, 'K').rect(8, 12, 3, 1, 'N');
  }
  return g.rows();
}

export const PIXEL_ACTORS = {};
for (const role of ['normal', 'summoner', 'hunter', 'gunner', 'alchemist']) {
  for (let frame = 0; frame < WALK_FRAMES; frame++) PIXEL_ACTORS[`character_${role}_duckWalk${frame}`] = duck(role, frame);
  for (let frame = 0; frame < 4; frame++) PIXEL_ACTORS[`character_${role}_duckIdle${frame}`] = duck(role, frame, frame === 3, true);
  PIXEL_ACTORS[`character_${role}_duckA`] = duck(role, 0);
  PIXEL_ACTORS[`character_${role}_duckB`] = duck(role, 3);
  PIXEL_ACTORS[`character_${role}_duckBlink`] = duck(role, 0, true, true);
}
for (const kind of ['roach', 'trash', 'rust', 'mold', 'fly', 'mosquito', 'spider', 'milk', 'mouse', 'moth', 'ant', 'slug', 'sock', 'dustbunny', 'pigeon', 'scrap']) {
  for (let frame = 0; frame < CREATURE_FRAMES; frame++) PIXEL_ACTORS[kind === 'scrap' ? 'scrap' : `${kind}${'ABCD'[frame]}`] = creature(kind, frame);
}

const MATERIALS = {
  W: ['W', 'w'], P: ['W', 'p'], B: ['b', 'q'], b: ['L', 'B'], G: ['g', 'x'],
  O: ['Y', 'o'], R: ['a', 'r'], N: ['n', 'k'], D: ['d', 'h'], z: ['W', 'd'],
  T: ['i', 't'], V: ['a', 'v'], F: ['Y', 'f'], C: ['n', 'c'],
};

// 기존 아이템의 실루엣은 보존하고 노출된 윗면·아랫면에만 반 칸 명암을 준다.
// 매 도트에 무늬를 넣지 않아 작은 화면에서도 노이즈가 생기지 않는다.
export function materialPixels(rows, shade = true) {
  const width = Math.max(0, ...rows.map(row => row.length));
  const out = grid(width * ART_DENSITY, rows.length * ART_DENSITY);
  rows.forEach((row, y) => [...row].forEach((color, x) => {
    if (color === '.') return;
    out.rect(x * 2, y * 2, 2, 2, color);
    const ramp = shade && MATERIALS[color];
    if (!ramp) return;
    if ((rows[y - 1]?.[x] ?? '.') === '.') out.rect(x * 2, y * 2, 2, 1, ramp[0]);
    if ((rows[y + 1]?.[x] ?? '.') === '.') out.rect(x * 2, y * 2 + 1, 2, 1, ramp[1]);
    if ((row[x + 1] ?? '.') === '.') out.set(x * 2 + 1, y * 2 + 1, ramp[1]);
  }));
  return out.rows();
}

export const IMPACT_FRAMES = 6;
export const IMPACT_ART = {};
for (const [kind, colors] of Object.entries({ physical: ['o','Y','W'], electric: ['q','E','W'], critical: ['r','O','Y'] })) {
  IMPACT_ART[kind] = Array.from({ length: IMPACT_FRAMES }, (_, frame) => {
    const g = grid(32, 32), reach = [4,9,13,14,15,15][frame];
    // 첫 두 프레임만 중심을 밝히고 이후에는 속이 빈 파편으로 읽히게 한다.
    if (frame < 2) {
      g.ellipse(16,16,frame ? 5 : 3,frame ? 4 : 3,colors[0]);
      g.rect(15,12,3,8,colors[1]).rect(12,15,8,3,colors[1]).rect(15,15,2,2,'W');
    }
    for (let n = 0; n < 8; n++) {
      const angle = n * Math.PI / 4, inner = frame < 2 ? 3 : reach - (frame < 4 ? 5 : 2);
      const x = 16 + Math.cos(angle) * reach, y = 16 + Math.sin(angle) * reach;
      g.line(16 + Math.cos(angle) * inner,16 + Math.sin(angle) * inner,x,y,colors[frame < 3 ? 1 : 0],frame < 3 && n % 2 === 0 ? 2 : 1);
      if (frame < 4) g.set(x,y,colors[2]);
    }
    return g.rows();
  });
}
