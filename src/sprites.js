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
  clover: ['..GG.GG..', '.GGGGGGG.', '.GGGGGGG.', '..GGGGG..', '.GGGGGGG.', '.GGGGGGG.', '..GGmGG..', '....m....', '...m.....'],
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
