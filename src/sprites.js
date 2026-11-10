// 도트 스프라이트. 글자 하나가 픽셀 하나이고, 색은 아래 팔레트에서 고른다.
const PALETTE = {
  K: '#1b1410', W: '#ffffff', w: '#e6dccb', O: '#ffb21f', o: '#e8871a', B: '#5f86cf', b: '#8fb1e9',
  R: '#e0645b', r: '#a83a33', G: '#3e9f6a', g: '#8fd19e', Y: '#ffe08a', N: '#8a4a1e', n: '#c9965c',
  D: '#3d3d42', d: '#8a8f98', L: '#dcebff', P: '#efece6', p: '#bfb7a8', M: '#6f8a4a', m: '#4b6330',
  C: '#c9692a', c: '#8c4f22', T: '#7ad3c8', V: '#b08be0', k: '#4a250e', H: '#5a2f12', S: '#55555d',
};
const OUTLINE = '#2a1c14';

const ART = {
  duckA: [
    '....WWWW......',
    '...WWWWWW.....',
    '..WWWWWKWW....',
    '..WWWWWWWOOO..',
    '..WWWWWWWOOo..',
    '...WWWWWW.....',
    '..WWWWWWWW....',
    '.WWWWWWWWWW...',
    'WWWwwWWWWWWW..',
    'WWwwwwWWBBWW..',
    'WWWwwWWWBBWW..',
    '.WWWWWWWWWW...',
    '..wWWWWWWw....',
    '...OO...OO....',
  ],
  duckB: [
    '..............',
    '....WWWW......',
    '...WWWWWW.....',
    '..WWWWWKWW....',
    '..WWWWWWWOOO..',
    '..WWWWWWWOOo..',
    '...WWWWWW.....',
    '.WWWWWWWWWW...',
    'WWWwwWWWWWWW..',
    'WWwwwwWWBBWW..',
    'WWWwwWWWBBWW..',
    '.WWWWWWWWWW...',
    '..wWWWWWWw....',
    '....OO.OO.....',
  ],
  duckBlink: [
    '....WWWW......',
    '...WWWWWW.....',
    '..WWWWWwWW....',
    '..WWWWWWWOOO..',
    '..WWWWWWWOOo..',
    '...WWWWWW.....',
    '..WWWWWWWW....',
    '.WWWWWWWWWW...',
    'WWWwwWWWWWWW..',
    'WWwwwwWWBBWW..',
    'WWWwwWWWBBWW..',
    '.WWWWWWWWWW...',
    '..wWWWWWWw....',
    '...OO...OO....',
  ],
  roachA: [
    '...k..k..k...k',
    '..kNNNNNNNHH.k',
    '.kNNnNNnNNHWK.',
    '..kNNNNNNNHH.k',
    '...k..k..k...k',
  ],
  roachB: [
    '..k..k..k....k',
    '..kNNNNNNNHH.k',
    '.kNNnNNnNNHWK.',
    '..kNNNNNNNHH.k',
    '....k..k..k..k',
  ],
  trashA: [
    '.....OO.......',
    '....OOOO......',
    '.....DD.......',
    '...DDDDDD.....',
    '..DDDDDDDD....',
    '.DDSDDDDDDD...',
    'DDSSDDDDDDDD..',
    'DDSDDDDDDDDD..',
    'DDWKDDDDWKDD..',
    'DDWKDDDDWKDD..',
    'DDDDDDDDDDDD..',
    'DDDDKKKKDDDD..',
    '.DDDDDDDDDD...',
    '..DDDDDDDD....',
  ],
  trashB: [
    '..............',
    '.....OO.......',
    '....OOOO......',
    '...DDDDDD.....',
    '..DDDDDDDD....',
    '.DDSDDDDDDD...',
    'DDSSDDDDDDDD..',
    'DDWKDDDDWKDD..',
    'DDWKDDDDWKDD..',
    'DDDDDDDDDDDD..',
    'DDDDKKKKDDDD..',
    'DDDDDDDDDDDD..',
    '.DDDDDDDDDD...',
    '..DDDDDDDD....',
  ],
  scrap: [
    '..PPPP..',
    '.PPpPPP.',
    'PPPPPpPP',
    'PKPPKPPP',
    'PPpPPPP.',
    '.PPPPP..',
  ],
  rustA: [
    '....CC....',
    '....CC....',
    '...CCCC...',
    '...CnCC...',
    '..CCnCCC..',
    '..CCCCCC..',
    '.CCCCCCCC.',
    '.CWKCCWKC.',
    '.CCCCCCCC.',
    '.CCccccCC.',
    '..CCCCCC..',
    '...CCCC...',
  ],
  rustB: [
    '..........',
    '....CC....',
    '....CC....',
    '...CnCC...',
    '..CCnCCC..',
    '..CCCCCC..',
    '.CCCCCCCC.',
    'CCWKCCWKCC',
    'CCCCCCCCCC',
    'CCCccccCCC',
    '.CCCCCCCC.',
    '..CCCCCC..',
  ],
  moldA: [
    '...MM..MM...',
    '..MMMMMMMM..',
    '.MMmMMMMMMM.',
    'MMMMMMMmMMMM',
    'MMWKMMMWKMMM',
    'MMMMMMMMMMMM',
    '.MMmMMMMMMM.',
    'MMMMMMMMmMMM',
    '.MMMMMMMMMM.',
    '..MM.MMM.M..',
  ],
  moldB: [
    '..MM...MM...',
    '.MMMMMMMMM..',
    '.MMmMMMMMMMM',
    'MMMMMMMmMMMM',
    'MMWKMMMWKMM.',
    'MMMMMMMMMMMM',
    'MMMmMMMMMMM.',
    '.MMMMMMMmMMM',
    '.MMMMMMMMMM.',
    '.MM..MMM.MM.',
  ],
  flyA: [
    '.LL...LL.',
    '..LL.LL..',
    '...DDD...',
    '..RDDDR..',
    '...DDD...',
  ],
  flyB: [
    '.........',
    '.LLL.LLL.',
    '...DDD...',
    '..RDDDR..',
    '...DDD...',
  ],
  boiler: [
    '...cccccccccccc...',
    '..cCCCCCCCCCCCCc..',
    '..CCCCCCCCCCCCCCHH',
    '..CCnnnnnnnnCCCC.H',
    '..CCnWKnnWKnCCCC.H',
    '..CCnWKnnWKnCCCC.H',
    '..CCnnnnnnnnCCCC.H',
    '..CCCCCCCCCCCCCC.H',
    '..CCkkkkkkkkCCCC.H',
    '..CCkCkCkCkCCCCC.H',
    '..CCCCCCCCCCCCCCHH',
    '..CCCCcCCCCcCCCC..',
    '..CCcCCCCCCCCcCC..',
    '..cCCCCCCCCCCCCc..',
    '...cc........cc...',
    '...cc........cc...',
  ],
  crown: [
    'O.O.O',
    'OOOOO',
    'OYOYO',
  ],
  slipper: [
    '.BBB.',
    'BBBBB',
    'BWWWB',
    'BbbbB',
    'BbbbB',
    'BbbbB',
    '.BBB.',
  ],
  gem: ['.b.', 'bLb', '.b.'],
  gemBig: ['.OO.', 'OYYO', 'OYYO', '.OO.'],
};

const ICON_ART = {
  spray: ['...DD....', '..DDD.L..', '...d..L.L', '..GGG....', '.GGGGG...', '.GWWWG...', '.GGGGG...', '.GGGGG...', '..GGG....'],
  broom: ['.......N.', '......N..', '.....N...', '....N....', '...N.....', '..OOO....', '.OOOOO...', '.OoOoO...', '.O.O.O...'],
  bleach: ['...BB....', '...BB....', '..TTTT...', '.TTTTTT..', '.TWWWWT..', '.TWRRWT..', '.TWWWWT..', '.TTTTTT..', '..TTTT...'],
  dehumidifier: ['.dddddd..', '.dWWWWd..', '.dWbbWd..', '.dWBBWd..', '.dWWWWd..', '.dddddd..', '.dLLLLd..', '.dddddd..', '.D....D..'],
  swatter: ['.RRRRR...', '.RrRrR...', '.RRRRR...', '.RrRrR...', '.RRRRR...', '...N.....', '...N.....', '...N.....', '...N.....'],
  slipper: ['..BBBB...', '.BBBBBB..', '.BWWWWB..', '.BbbbbB..', '.BbbbbB..', '.BbbbbB..', '.BbbbbB..', '..BBBB...', '.........'],
  coil: ['..GGGGG..', '.G.....G.', 'G..GGG..G', 'G.G...G.G', 'G.G.R.G.G', 'G.G..GG.G', 'G..GG...G', '.G.....G.', '..GGGGG..'],
  zapper: ['.YYYYY...', '.YKYKY...', '.YYOYY...', '.YKYKY...', '.YYYYY...', '...D.....', '...D.....', '...DD....', '...DD....'],
  fan: ['..ddddd..', '.dLLbLLd.', 'dLLLbLLLd', 'dbbbKbbbd', 'dLLLbLLLd', '.dLLbLLd.', '..ddddd..', '....d....', '..ddddd..'],
  gloves: ['.R.R.R...', '.R.R.R.R.', '.RRRRR.R.', '.RRRRRRR.', '.RRRRRRR.', '..RRRRR..', '..RRRRR..', '..rrrrr..', '..RRRRR..'],
  sneakers: ['.........', '....WW...', '...WWWW..', '..WWBWW..', '.WWBWWWWW', 'WWWWWWWWW', 'WRRRRRRRW', 'ddddddddd', '.........'],
  vacuum: ['......D..', '.....D...', '....D....', '...D.....', '.BBBB....', 'BBBBBB...', 'BbBBBB.dd', 'BBBBBB.dd', '.K..K....'],
  vitamin: ['.........', '..RRR....', '.RRRRR...', '.RRRRW...', '..RRWWW..', '...WWWWW.', '...WWWWW.', '....WWW..', '.........'],
  battery: ['...dd....', '..GGGG...', '..GGGG...', '..GYGG...', '..GYYG...', '..GGYG...', '..GGGG...', '..GGGG...', '.........'],
  candle: ['....O....', '...OYO...', '....O....', '...VVV...', '...VVV...', '...VVV...', '...VVV...', '..VVVVV..', '.........'],
  wipes: ['.........', '.bbbbbbb.', '.bWWWWWb.', '.bWBBBWb.', '.bWWWWWb.', '.bbbbbbb.', '.bbbbbbb.', '.........', '.........'],
  protein: ['...DDD...', '...DDD...', '..WWWWW..', '.WWWWWWW.', '.WRRRRRW.', '.WRWRWRW.', '.WRRRRRW.', '.WWWWWWW.', '..WWWWW..'],
  detergent: ['..L...L..', '.LWL.LWL.', '..L.L.L..', '...LWL...', '..VVVVV..', '.VVVVVVV.', '.VWWWWWV.', '.VVVVVVV.', '..VVVVV..'],
  roller: ['.........', '.WWWWWWW.', 'WpWpWpWpW', 'WWWWWWWWW', '.WWWWWWW.', '....R....', '....R....', '...RRR...', '...RRR...'],
  dryer: ['.........', '.RRRRRR.O', 'RRRRRRRdO', 'RRWWRRRdo', 'RRRRRRRdO', '.RRRRRR.O', '..RR.....', '..RR.....', '..rr.....'],
  heal: ['..L.L.L..', '...L.L...', 'RRRRRRRRR', 'RYYYYYYYR', 'RYOYYOYYR', '.RRRRRRR.', '.RRRRRRR.', '..RRRRR..', '.........'],
  vacuumBag: ['...dd....', '..dddd...', '.dddddd..', '.dWdddd..', '.dddddd..', '.dddddd..', '.dddddd..', '..dddd...', '.........'],
  bugBomb: ['..L.L....', '...L.L...', '...DD....', '..RRRR...', '..RWWR...', '..RKKR...', '..RWWR...', '..RRRR...', '.........'],
  coffee: ['....N....', '...N.....', '.WWWWWW..', '.WNNNNW..', '.WNNNNW..', '.WNLNNW..', '..WNNW...', '..WWWW...', '.........'],
  chicken: ['...NNN...', '..NnNNN..', '.NNNNNN..', '.NNNnNN..', '..NNNN...', '...NN....', '....W....', '...WWW...', '...W.W...'],
  icepack: ['.........', '.LLLLLLL.', '.LbLLLbL.', '.LLLbLLL.', '.LbLLLbL.', '.LLLLLLL.', '.LLLLLLL.', '.........', '.........'],
  box: ['.........', '.nnnnnnn.', 'nnnNnnnnn', 'nnnNnnnnn', 'nNNNNNNNn', 'nnnNnnnnn', 'nnnnnnnnn', '.nnnnnnn.', '.........'],
  chest: ['.........', '.NNNNNNN.', 'NnnnnnnnN', 'NNNNNNNNN', 'NnnOOOnnN', 'NnnOKOnnN', 'NnnnnnnnN', 'NNNNNNNNN', '.........'],
};
ICON_ART.ramen = ICON_ART.heal;

// 보스는 크기가 커서 글자 격자 대신 작은 그리기 함수로 찍는다. frame은 0 또는 1이다.
function canvasGrid(width, height) {
  const cells = Array.from({ length: height }, () => Array(width).fill('.'));
  const api = {
    set(x, y, ch) {
      if (x >= 0 && x < width && y >= 0 && y < height) cells[Math.round(y)][Math.round(x)] = ch;
      return api;
    },
    get: (x, y) => cells[y]?.[x] ?? '.',
    rect(x, y, w, h, ch) {
      for (let row = y; row < y + h; row += 1) for (let column = x; column < x + w; column += 1) api.set(column, row, ch);
      return api;
    },
    ellipse(cx, cy, rx, ry, ch, only = null) {
      for (let y = -ry; y <= ry; y += 1) {
        for (let x = -rx; x <= rx; x += 1) {
          if ((x * x) / (rx * rx + 0.5) + (y * y) / (ry * ry + 0.5) <= 1 && (!only || api.get(cx + x, cy + y) === only)) {
            api.set(cx + x, cy + y, ch);
          }
        }
      }
      return api;
    },
    line(x0, y0, x1, y1, ch) {
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let step = 0; step <= steps; step += 1) {
        api.set(Math.round(x0 + ((x1 - x0) * step) / steps), Math.round(y0 + ((y1 - y0) * step) / steps), ch);
      }
      return api;
    },
    rows: () => cells.map((row) => row.join('')),
  };
  return api;
}

function kingRoach(frame) {
  const g = canvasGrid(38, 28);
  for (let leg = 0; leg < 3; leg += 1) {
    const x = 9 + leg * 7;
    const swing = leg % 2 === frame ? 3 : -2;
    g.line(x, 8, x + swing, 3, 'k').line(x + swing, 3, x + swing + 2, 2, 'k');
    g.line(x, 20, x - swing, 25, 'k').line(x - swing, 25, x - swing + 2, 26, 'k');
  }
  g.line(31, 10, 36, 4 + frame, 'k').line(31, 18, 36, 24 - frame, 'k');
  g.ellipse(15, 15, 12, 7, 'k').ellipse(15, 13, 12, 7, 'N').ellipse(12, 9, 7, 1, 'n');
  [8, 14, 20].forEach((x) => { for (let y = 6; y <= 20; y += 1) if (g.get(x, y) === 'N') g.set(x, y, 'H'); });
  g.line(4, 14, 25, 14, 'k');
  g.ellipse(29, 14, 5, 6, 'H').ellipse(28, 11, 3, 1, 'N', 'H');
  g.rect(30, 10, 2, 2, 'W').set(31, 11, 'K').rect(30, 16, 2, 2, 'W').set(31, 16, 'K');
  g.line(28, 8, 32, 10, 'K').line(28, 19, 32, 17, 'K');
  g.set(34, 12, 'k').set(35, 13, 'k').set(34, 16, 'k').set(35, 15, 'k');
  g.rect(24, 4, 8, 3, 'O').set(24, 3, 'O').set(24, 2, 'O').set(27, 3, 'O').set(28, 3, 'O').set(27, 2, 'O')
    .set(28, 1, 'O').set(31, 3, 'O').set(31, 2, 'O').set(26, 5, 'Y').set(30, 5, 'Y').set(28, 5, 'R');
  return g.rows();
}

function garbageGiant(frame) {
  const g = canvasGrid(40, 38);
  const cy = 22 + frame;
  const rx = 17 + frame;
  const ry = 13 - frame;
  const top = cy - ry;
  g.ellipse(20, cy, rx, ry, 'D').ellipse(20, cy + 5, rx - 2, ry - 5, 'K', 'D').ellipse(20, cy + 3, rx - 2, ry - 4, 'D', 'K');
  g.ellipse(12, cy - 6, 4, 3, 'S').line(27, cy - 8, 31, cy - 3, 'S');
  g.line(7, cy + 1, 11, cy + 8, 'K').line(31, cy + 2, 29, cy + 9, 'K');
  g.rect(17, top - 3, 6, 4, 'D').ellipse(20, top - 5, 5, 2, 'O').set(20, top - 5, 'o')
    .line(14, top - 8, 16, top - 6, 'O').line(26, top - 8, 24, top - 6, 'O');
  g.rect(11, cy - 3, 5, 4, 'W').rect(24, cy - 3, 5, 4, 'W').rect(13, cy - 2, 2, 2, 'R').rect(25, cy - 2, 2, 2, 'R');
  g.line(10, cy - 7, 16, cy - 4, 'K').line(29, cy - 7, 23, cy - 4, 'K');
  g.rect(13, cy + 4, 14, 4, 'K');
  [14, 17, 20, 23].forEach((x) => g.set(x, cy + 4, 'W').set(x + 1, cy + 4, 'W'));
  [15, 19, 23].forEach((x) => g.set(x, cy + 7, 'W'));
  g.rect(3, cy + 4, 3, 2, 'P').rect(33, cy + 5, 3, 4, 'R').rect(33, cy + 6, 3, 1, 'W').rect(28, top + 1, 2, 4, 'G').set(8, cy - 9, 'p');
  return g.rows();
}

function rustBoiler(frame) {
  const g = canvasGrid(34, 38);
  g.rect(7, 33, 3, 5, 'c').rect(22, 33, 3, 5, 'c');
  g.rect(4, 7, 24, 27, 'C').set(4, 7, '.').set(27, 7, '.').set(4, 33, '.').set(27, 33, '.');
  g.rect(5, 9, 2, 22, 'n').rect(25, 8, 3, 25, 'c');
  g.rect(3, 5, 26, 3, 'c').rect(12, 1, 7, 4, 'H').rect(11, 0, 9, 1, 'k');
  [[7, 10], [24, 10], [7, 31], [24, 31]].forEach(([x, y]) => g.set(x, y, 'k'));
  g.ellipse(22, 13, 3, 3, 'W').set(22, 13, 'K').line(22, 13, frame ? 24 : 20, 11, 'R');
  g.rect(8, 12, 4, 3, 'Y').rect(14, 12, 4, 3, 'Y').rect(frame ? 9 : 10, 13, 2, 2, 'K').rect(frame ? 15 : 16, 13, 2, 2, 'K');
  g.line(7, 10, 12, 11, 'K').line(18, 10, 13, 11, 'K');
  g.rect(8, 19, 15, 8, 'K').rect(9, 21, 13, 4, frame ? 'Y' : 'O').rect(9, 23, 13, 2, 'o');
  [10, 13, 16, 19].forEach((x) => g.rect(x, 19, 1, 8, 'c'));
  g.ellipse(22, 29, 2, 2, 'c', 'C').set(9, 29, 'c').set(10, 30, 'c').line(22, 31, 22, 33, 'H');
  g.rect(28, 15, 3, 2, 'H').rect(30, 15, 2, 14, 'H').rect(28, 27, 3, 2, 'H').rect(29, 20, 4, 3, 'R').set(31, 21, 'W');
  return g.rows();
}

ART.kingRoachA = kingRoach(0);
ART.kingRoachB = kingRoach(1);
ART.garbageGiantA = garbageGiant(0);
ART.garbageGiantB = garbageGiant(1);
ART.rustBoilerA = rustBoiler(0);
ART.rustBoilerB = rustBoiler(1);

// 3x5 숫자 글꼴(피해량 표시용)
export const DIGITS = {
  0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'], 4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'], 8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
};

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// 글자 격자를 캔버스로 바꾸고, 바깥에 1픽셀 외곽선을 두른다.
function build(rows, { outline = true, scale = 1 } = {}) {
  const height = rows.length;
  const width = Math.max(...rows.map((row) => row.length));
  const pad = outline ? 1 : 0;
  const canvas = makeCanvas((width + pad * 2) * scale, (height + pad * 2) * scale);
  const ctx = canvas.getContext('2d');
  const filled = (x, y) => y >= 0 && y < height && x >= 0 && x < rows[y].length && rows[y][x] !== '.';
  if (outline) {
    ctx.fillStyle = OUTLINE;
    for (let y = -1; y <= height; y += 1) {
      for (let x = -1; x <= width; x += 1) {
        if (!filled(x, y) && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) {
          ctx.fillRect((x + pad) * scale, (y + pad) * scale, scale, scale);
        }
      }
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < rows[y].length; x += 1) {
      const color = PALETTE[rows[y][x]];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect((x + pad) * scale, (y + pad) * scale, scale, scale);
      }
    }
  }
  return canvas;
}

function flipped(source) {
  const canvas = makeCanvas(source.width, source.height);
  const ctx = canvas.getContext('2d');
  ctx.translate(source.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(source, 0, 0);
  return canvas;
}

function tinted(source, color) {
  const canvas = makeCanvas(source.width, source.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, source.width, source.height);
  return canvas;
}

const cache = new Map();

// name: ART 이름, flip: 좌우 반전, tint: 덮어씌울 색(맞았을 때 흰색, 얼었을 때 하늘색), scale: 정수 배율
export function sprite(name, { flip = false, tint = null, scale = 1 } = {}) {
  const key = `${name}|${flip}|${tint}|${scale}`;
  if (!cache.has(key)) {
    let canvas = build(ART[name], { scale });
    if (flip) canvas = flipped(canvas);
    if (tint) canvas = tinted(canvas, tint);
    cache.set(key, canvas);
  }
  return cache.get(key);
}

export function icon(id) {
  const key = `icon|${id}`;
  if (!cache.has(key)) cache.set(key, build(ICON_ART[id] ?? ICON_ART.box));
  return cache.get(key);
}

const urlCache = new Map();

// HUD와 선택 카드에 쓰는 확대한 아이콘 이미지 주소
export function iconUrl(id) {
  if (!urlCache.has(id)) {
    const source = ICON_ART[id] ? build(ICON_ART[id], { scale: 4 }) : build(ART[id], { scale: 4 });
    urlCache.set(id, source.toDataURL());
  }
  return urlCache.get(id);
}
