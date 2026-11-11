// 도트 스프라이트. 글자 하나가 픽셀 하나이고, 색은 아래 팔레트에서 고른다.
const PALETTE = {
  K: '#1b1410', W: '#ffffff', w: '#e6dccb', O: '#ffb21f', o: '#e8871a', B: '#5f86cf', b: '#8fb1e9',
  R: '#e0645b', r: '#a83a33', G: '#3e9f6a', g: '#8fd19e', Y: '#ffe08a', N: '#8a4a1e', n: '#c9965c',
  D: '#3d3d42', d: '#8a8f98', L: '#dcebff', P: '#efece6', p: '#bfb7a8', M: '#6f8a4a', m: '#4b6330',
  C: '#c9692a', c: '#8c4f22', T: '#7ad3c8', V: '#b08be0', k: '#4a250e', H: '#5a2f12', S: '#55555d',
  // 아이템 아이콘용 밝은 색과 그림자 색
  y: '#fff4c2', e: '#ff6a2a', v: '#7a57b8', t: '#3f9d94', l: '#a9cdf5', q: '#3a5a9c', x: '#2a7048', a: '#ffb3bf',
  A: '#f0608a', E: '#7fe9ff', i: '#d3f3ff', u: '#7a2620', z: '#c4c9d1', h: '#2a2a30', F: '#e8a33a', f: '#b8731f',
  s: '#fff1d6', j: '#5dff9a',
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
  mosquitoA: [
    '..LL.LL...',
    '...LLL....',
    '.DSDSDDK..',
    '..DSDSDDkk',
    '..k.k.k...',
    '.k..k..k..',
  ],
  mosquitoB: [
    '..........',
    '.LLL.LLL..',
    '.DSDSDDK..',
    '..DSDSDDkk',
    '...k.k.k..',
    '...k.k.k..',
  ],
  spiderA: [
    'k...k...k...k',
    '.k..k...k..k.',
    '..k.kDDDk.k..',
    '...kDSDDDk...',
    'kkkDDRDRDDkkk',
    '...kDDDDDk...',
    '..k.kDDDk.k..',
    '.k..k...k..k.',
    'k...k...k...k',
  ],
  spiderB: [
    '.k..k...k..k.',
    '.k..k...k..k.',
    '..k.kDDDk.k..',
    '...kDSDDDk...',
    '.kkDDRDRDDkk.',
    '...kDDDDDk...',
    '..k.kDDDk.k..',
    '.k..k...k..k.',
    '.k..k...k..k.',
  ],
  milkA: [
    '...WWWW...',
    '..WWWWWW..',
    '.WWPPPPWW.',
    '.WWWWWWWW.',
    '.WBBBBBBW.',
    '.WBWBBWBW.',
    '.WWWWWWWW.',
    '.WKWWWWKW.',
    '.WWWWWWWW.',
    '.WWKKKKWW.',
    '.WMWWWWWW.',
    '.WMMWWWWp.',
    '.pppppppp.',
  ],
  milkB: [
    '..........',
    '...WWWW...',
    '..WWWWWW..',
    '.WWPPPPWW.',
    '.WBBBBBBW.',
    '.WBWBBWBW.',
    '.WWWWWWWW.',
    '.WKWWWWKW.',
    '.WWWKKWWW.',
    '.WWWWWWWW.',
    '.WMMWWWWW.',
    '.WMMMWWWp.',
    '.pppppppp.',
  ],
  mouseA: [
    '.........dd...',
    '........daad..',
    '...ddddddddd..',
    '..ddddddddKdd.',
    'a.dddddddddddA',
    '.adzzzzzzzdd..',
    '...k..k..k....',
  ],
  mouseB: [
    '..............',
    'a........dd...',
    '.a......daad..',
    '..addddddddKd.',
    '...ddddddddddA',
    '...dzzzzzzzdd.',
    '....k.k..k.k..',
  ],
  mothA: [
    '.nn.......nn.',
    'nnnn.k.k.nnnn',
    'nNnnn.k.nnnNn',
    'nnYnnnHnnnYnn',
    '.nnnnnHnnnnn.',
    '..nnnnHnnnn..',
    '..nNn.H.nNn..',
    '...n.....n...',
  ],
  mothB: [
    '.............',
    '.....k.k.....',
    '.nnn..k..nnn.',
    'nnYnnnHnnnYnn',
    'nNnnnnHnnnnNn',
    'nnnnnnHnnnnnn',
    '.nnNn.H.nNnn.',
    '..nn.....nn..',
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

// 아이템 아이콘은 16x16 격자에 4프레임으로 그린다. body는 외곽선을 두르는 본체, fx는 외곽선 없이 덧그리는 반짝임·김·불꽃이다.
export const ITEM_FRAMES = 4;
const ITEM_SIZE = 16;

function item(rows, animate) {
  return (frame) => {
    const body = canvasGrid(ITEM_SIZE, ITEM_SIZE).stamp(0, 0, rows);
    const fx = canvasGrid(ITEM_SIZE, ITEM_SIZE);
    animate?.(body, fx, frame);
    return [body.rows(), fx.rows()];
  };
}

// 네 프레임에 걸쳐 점 → 십자 → 점 → 꺼짐으로 깜빡이는 반짝임
function twinkle(fx, x, y, frame, color = 'y') {
  const phase = ((frame % ITEM_FRAMES) + ITEM_FRAMES) % ITEM_FRAMES;
  if (phase === 0) return;
  if (phase === 2) fx.set(x - 1, y, color).set(x + 1, y, color).set(x, y - 1, color).set(x, y + 1, color);
  fx.set(x, y, phase === 2 ? 'W' : color);
}

// 구불구불 올라가는 김
function steam(fx, x, bottom, frame, height = 4) {
  for (let step = 0; step < height; step += 1) {
    const wave = (step + frame) % 4;
    if (wave === 3 && step > 1) continue;
    fx.set(x + (wave === 1 ? 1 : wave === 3 ? -1 : 0), bottom - step, step < 2 ? 'W' : 'z');
  }
}

const ITEMS = {
  spray: item([
    '................',
    '.....DDD........',
    '....DdddD.......',
    '....DDDDD.......',
    '.....zzz........',
    '....xGGGx.......',
    '...xGgGGGx......',
    '...xGgGGGx......',
    '...xWWWWWx......',
    '...xWRRKWx......',
    '...xWWWWWx......',
    '...xGgGGGx......',
    '...xGgGGGx......',
    '...xGGGGGx......',
    '....xxxxx.......',
    '................',
  ], (body, fx, f) => {
    const mist = [
      [[9, 2, 'W']],
      [[9, 2, 'W'], [10, 2, 'L'], [11, 1, 'L'], [11, 3, 'L']],
      [[10, 2, 'L'], [12, 1, 'W'], [12, 3, 'W'], [13, 2, 'g'], [14, 0, 'L'], [14, 4, 'L']],
      [[11, 2, 'L'], [13, 0, 'g'], [13, 4, 'g'], [15, 2, 'W'], [15, 5, 'L'], [14, 1, 'L']],
    ];
    mist[f].forEach(([x, y, ch]) => fx.set(x, y, ch));
    body.set(5, 6 + f, 'W');
  }),
  broom: item([
    '.............NN.',
    '............NnN.',
    '...........NnN..',
    '..........NnN...',
    '.........NnN....',
    '........NnN.....',
    '.......NnN......',
    '......RRR.......',
    '.....RaRRR......',
    '....OYOOOoo.....',
    '...OYOYOOooo....',
    '..OYOYOYOoOo....',
    '..OYOYOYOoOo....',
    '................',
    '................',
    '................',
  ], (body, fx, f) => {
    body.stamp(f % 2 === 0 ? 2 : 1, 13, 'YO.YO.Oo.o');
    const dust = [[[0, 14], [12, 13]], [[1, 15], [13, 12], [0, 12]], [[13, 14], [0, 11], [14, 11]], [[14, 13], [1, 13]]];
    dust[f].forEach(([x, y], index) => fx.set(x, y, index % 2 === 0 ? 'P' : 'W'));
    twinkle(fx, 13, 9, f + 1);
  }),
  bleach: item([
    '................',
    '.....qBBq.......',
    '.....qBlq.......',
    '....tTTTTt......',
    '...tTiTTTTtt....',
    '..tTiTTTTT..t...',
    '..tTiTTTTT..t...',
    '..tTWWWWWTtt....',
    '..tTWRRRWTt.....',
    '..tTWRWRWTt.....',
    '..tTWWWWWTt.....',
    '..tTiTTTTTt.....',
    '..tTTTTTTTt.....',
    '...tttttttt.....',
    '................',
    '................',
  ], (body, fx, f) => {
    [[13, 12], [14, 9], [12, 6], [14, 3]].forEach(([x, y], index) => {
      const rise = (f + index) % ITEM_FRAMES;
      fx.set(x + (rise % 2), y - rise, rise === 3 ? 'W' : 'T');
      if (rise === 1) fx.set(x + 1, y - rise - 1, 'i');
    });
    twinkle(fx, 12, 1, f);
  }),
  dehumidifier: item([
    '................',
    '..zzzzzzzzzz....',
    '.zWWWWWWWWWWd...',
    '.zWDDDDDDDWWd...',
    '.zWWWWWWWWWGd...',
    '.zWDDDDDDDWWd...',
    '.zWWWWWWWWWWd...',
    '.zWDDDDDDDWWd...',
    '.zWWWWWWWWWWd...',
    '.zPPPPPPPPPPd...',
    '.zPqLLLLLLqPd...',
    '.zPqBBBBBBqPd...',
    '.zPqBBBBBBqPd...',
    '.zPPPPPPPPPPd...',
    '..dD......Dd....',
    '................',
  ], (body, fx, f) => {
    body.set(11, 4, f % 2 === 0 ? 'G' : 'Y');
    for (let x = 4; x <= 9; x += 1) body.set(x, 10, (x + f) % 3 === 0 ? 'l' : (x + f) % 3 === 1 ? 'b' : 'L');
    body.set(5 + f, 11, 'l');
    [[14, 2], [15, 6], [14, 10]].forEach(([x, y], index) => {
      const pull = (f + index) % ITEM_FRAMES;
      if (pull < 3) fx.set(x - pull, y + (index === 2 ? -pull : pull > 1 ? 1 : 0), pull === 0 ? 'L' : 'b');
    });
  }),
  swatter: item([
    '..rRRRRRRr......',
    '..RuRuRuRR......',
    '..RRuRuRuR......',
    '..RuRuRuRR......',
    '..RRuRuRuR......',
    '..RuRuRuRR......',
    '..rRRRRRRr......',
    '.....RR.........',
    '.....nN.........',
    '.....nN.........',
    '.....nN.........',
    '.....nN.........',
    '.....nN.........',
    '.....aR.........',
    '.....RR.........',
    '................',
  ], (body, fx, f) => {
    twinkle(fx, 12, 3, f + 1, 'Y');
    twinkle(fx, 13, 8, f + 3, 'W');
    if (f % 2 === 1) fx.set(11, 6, 'W').set(12, 7, 'W').set(10, 9, 'W').set(11, 10, 'W');
    body.set(3 + f, 0, 'a').set(4 + f, 0, 'a');
  }),
  slipper: item([
    '................',
    '................',
    '.........qqqq...',
    '.......qqBBBBq..',
    '.....qqBBbbbBq..',
    '....qBBbbWWbBq..',
    '...qBbbbWWLWBq..',
    '..qBbbbWLWWbBq..',
    '..qBblWWWbbBq...',
    '.qBblbWLbbBq....',
    '.qBbbbbbbBq.....',
    '.qBbbbbBBq......',
    '..qBBBBqq.......',
    '...qqqq.........',
    '................',
    '................',
  ], (body, fx, f) => {
    const orbit = [[2, 3], [6, 1], [14, 1], [15, 6], [13, 11], [8, 14], [1, 14], [0, 8]];
    for (let trail = 0; trail < 3; trail += 1) {
      const [x, y] = orbit[(f * 2 + 8 - trail) % 8];
      fx.set(x, y, trail === 0 ? 'W' : trail === 1 ? 'L' : 'b');
      const [ox, oy] = orbit[(f * 2 + 12 - trail) % 8];
      fx.set(ox, oy, trail === 0 ? 'W' : trail === 1 ? 'L' : 'b');
    }
  }),
  coil: item([
    '................',
    '................',
    '................',
    '....Gg..........',
    '...G..gGGGG.....',
    '..G..g.....G....',
    '..G.G..gGG..G...',
    '..G.G.G...G.G...',
    '..G.G.GGx.G.x...',
    '..G.G.....x.x...',
    '..G..GGxxx..x...',
    '...G.......x....',
    '....GGxxxxx.....',
    '................',
    '................',
    '................',
  ], (body, fx, f) => {
    body.set(6, 3, f % 2 === 0 ? 'e' : 'O');
    fx.set(6, 3, f % 2 === 0 ? 'Y' : 'W');
    if (f % 2 === 1) fx.set(7, 2, 'O').set(5, 2, 'e');
    steam(fx, 8, 2, f, 3);
    steam(fx, 11, 2, f + 2, 3);
    twinkle(fx, 14, 12, f + 1, 'O');
    twinkle(fx, 1, 13, f + 3, 'Y');
  }),
  zapper: item([
    '...OYYYYYYO.....',
    '..OYhhhhhhYO....',
    '..YhhhhhhhhY....',
    '..YhhhhhhhhY....',
    '..YhhhhhhhhY....',
    '..YhhhhhhhhY....',
    '..OYhhhhhhYO....',
    '...OYYYYYYO.....',
    '.....OYYO.......',
    '......DD........',
    '.....DddD.......',
    '.....DdRD.......',
    '.....DddD.......',
    '.....DddD.......',
    '.....DDDD.......',
    '................',
  ], (body, fx, f) => {
    for (let y = 1; y <= 6; y += 1) {
      for (let x = 3; x <= 10; x += 1) {
        if (body.get(x, y) === 'h' && (x + y) % 2 === 0) body.set(x, y, (x + y * 3 + f * 2) % 8 < 2 ? 'W' : 'E');
      }
    }
    body.set(7, 11, f % 2 === 0 ? 'R' : 'Y');
    const bolts = [
      [[12, 0], [13, 1], [12, 2], [13, 3]],
      [[13, 4], [14, 5], [13, 6], [14, 7], [0, 3], [1, 4]],
      [[12, 8], [13, 9], [12, 10], [0, 6], [1, 7], [0, 8]],
      [[1, 0], [0, 1], [1, 2], [14, 2], [15, 3]],
    ];
    bolts[f].forEach(([x, y], index) => fx.set(x, y, index % 2 === 0 ? 'E' : 'W'));
  }),
  fan: item([], (body, fx, f) => {
    body.rect(7, 12, 2, 2, 'd').rect(4, 14, 8, 1, 'D').rect(5, 13, 6, 1, 'S');
    body.ellipse(7, 6, 6, 6, 'd').ellipse(7, 6, 5, 5, 'L').ellipse(7, 6, 4, 4, 'i');
    for (let blade = 0; blade < 3; blade += 1) {
      const angle = (blade / 3) * Math.PI * 2 + (f / ITEM_FRAMES) * ((Math.PI * 2) / 3);
      for (let reach = 1; reach <= 4; reach += 1) {
        const x = 7 + Math.cos(angle) * reach;
        const y = 6 + Math.sin(angle) * reach;
        body.set(Math.round(x), Math.round(y), 'B');
        body.set(Math.round(x - Math.sin(angle) * 0.9), Math.round(y + Math.cos(angle) * 0.9), reach > 1 ? 'b' : 'B');
      }
    }
    body.set(7, 6, 'K').set(1, 6, 'S').set(13, 6, 'S').set(7, 0, 'S');
    [[14, 3], [15, 6], [14, 9]].forEach(([x, y], index) => {
      const shift = (f + index * 2) % ITEM_FRAMES;
      if (shift < 3) fx.set(x + shift - 1, y, 'W').set(x + shift, y, shift === 0 ? 'W' : 'L');
    });
  }),
  detergent: item([
    '................',
    '................',
    '......vVv.......',
    '......vVv.......',
    '.....vVVVv......',
    '....vVVVVVv.....',
    '...vVaVVVVVv....',
    '...vVaVVVVVv....',
    '...vVWWWWWVv....',
    '...vVWlBlWVv....',
    '...vVWWWWWVv....',
    '...vVaVVVVVv....',
    '...vVVVVVVVv....',
    '....vvvvvvv.....',
    '................',
    '................',
  ], (body, fx, f) => {
    const bubble = (x, y, big) => {
      if (big) fx.set(x, y - 1, 'L').set(x - 1, y, 'L').set(x + 1, y, 'L').set(x, y + 1, 'l').set(x, y, 'W');
      else fx.set(x, y, 'L');
    };
    bubble(13, 11 - f * 2, f < 3);
    bubble(1, 8 - f, f % 2 === 1);
    bubble(11, 2 + (f % 2), false);
    if (f === 3) twinkle(fx, 13, 4, 2, 'a');
    bubble(7, 1 - (f % 2), f === 2);
  }),
  roller: item([
    '................',
    '................',
    '..zWWWWWWWWWz...',
    '.zWWWWWWWWWWWz..',
    '.zWWWWWWWWWWWz..',
    '.zWWWWWWWWWWWz..',
    '.zPPPPPPPPPPPz..',
    '..zzzzzzzzzzz...',
    '......DD........',
    '......rR........',
    '......rR........',
    '.....rRRR.......',
    '.....rRaR.......',
    '.....rRRR.......',
    '.....rrrr.......',
    '................',
  ], (body, fx, f) => {
    for (let y = 2; y <= 6; y += 1) {
      for (let x = 2; x <= 12; x += 1) {
        if ('WP'.includes(body.get(x, y)) && (x + y + f) % 4 === 0) body.set(x, y, y === 6 ? 'p' : 'z');
      }
    }
    [[4, 4], [9, 3], [11, 5]].forEach(([x, y], index) => body.set(2 + ((x + f * 2 + index) % 10), y, index === 1 ? 'n' : 'D'));
    [[14, 1], [0, 9], [14, 9]].forEach(([x, y], index) => twinkle(fx, x, y, f + index));
  }),
  dryer: item([
    '................',
    '................',
    '..rRRRRRRr......',
    '.rRaaRRRRRdd....',
    '.RaRRRRRRRdzd...',
    '.RRRRWWRRRdzd...',
    '.RRRRWKRRRdzd...',
    '.rRRRRRRRRdd....',
    '..rRRRRRRr......',
    '....rRRr........',
    '....rRRr........',
    '....rRRr........',
    '....rRRr........',
    '....uRRu........',
    '.....uu.........',
    '................',
  ], (body, fx, f) => {
    const flames = [
      ['Yy.', 'WYO', 'Ye.'],
      ['YO.', 'WYe', 'YYO'],
      ['Ye.', 'WYO', 'yO.'],
      ['YYO', 'WYe', 'YO.'],
    ];
    fx.stamp(13, 4, flames[f]);
    fx.set(13, 3, f % 2 === 0 ? 'O' : '.').set(14, 7, f % 2 === 1 ? 'e' : '.').set(15, 2 + f, 'O');
    body.set(5 + (f % 2), 5, 'K').set(5 + ((f + 1) % 2), 6, 'W');
  }),
  gloves: item([
    '................',
    '.....RR.RR.RR...',
    '....RaR.aR.aR...',
    '....RaR.aR.aR...',
    '.RR.RaRRaRRaR...',
    '.RaRRaRRRRRRR...',
    '.RaaRRRRRRRRR...',
    '..RaRRRRRRRRR...',
    '..RRRRRRRRRRr...',
    '...RRRRRRRRr....',
    '...RRRRRRRRr....',
    '....rrrrrrr.....',
    '....aRRRRRa.....',
    '....RRRRRRr.....',
    '....aRRRRRa.....',
    '................',
  ], (body, fx, f) => {
    twinkle(fx, 14, 2, f);
    twinkle(fx, 1, 11, f + 2, 'W');
    twinkle(fx, 14, 11, f + 3, 'a');
    body.set(6 + f, 8, 'a').set(7 + f, 7, 'a');
  }),
  sneakers: item([
    '................',
    '................',
    '................',
    '.........WWWW...',
    '........WWPPW...',
    '.......WWBWPW...',
    '......WWBWWWW...',
    '....WWWBWWWWWWW.',
    '...WWWWWWBBWWWWW',
    '...WPWWWWBBWWWWP',
    '...RRRRRRRRRRRRR',
    '...dzzdzzdzzdzzd',
    '................',
    '................',
    '................',
    '................',
  ], (body, fx, f) => {
    [[5, 3], [8, 4], [11, 2], [13, 3]].forEach(([y, length], index) => {
      const slide = (f + index) % ITEM_FRAMES;
      for (let step = 0; step < length; step += 1) {
        const x = 2 - slide - step + (index % 2);
        fx.set(x, y, step === 0 ? 'W' : 'L');
      }
    });
    twinkle(fx, 14, 4, f + 1);
    body.set(9, 8, f % 2 === 0 ? 'B' : 'l');
  }),
  vacuum: item([
    '............DD..',
    '...........Dd...',
    '..........Dd....',
    '.........Dd.....',
    '........Dd......',
    '...qBBBBDq......',
    '..qBbbBBBBq.....',
    '.qBblBBBBBBq....',
    '.qBbBBWWBBBq....',
    '.qBBBBWKBBBq.zz.',
    '.qBBBBBBBBBqzdDz',
    '..qBBBBBBBq.zzzz',
    '..hKh...hKh.....',
    '...h.....h......',
    '................',
    '................',
  ], (body, fx, f) => {
    [[15, 6], [13, 13], [15, 13], [12, 7]].forEach(([x, y], index) => {
      const pull = (f + index) % ITEM_FRAMES;
      const towardX = 14;
      const towardY = 10;
      const at = pull / ITEM_FRAMES;
      fx.set(Math.round(x + (towardX - x) * at), Math.round(y + (towardY - y) * at), index % 2 === 0 ? 'n' : 'P');
    });
    body.set(6 + (f % 2), 8, 'W').set(7 - (f % 2), 9, 'K');
  }),
  vitamin: item([
    '................',
    '................',
    '.........uRRu...',
    '........uRaRRu..',
    '.......uRaRRRR..',
    '......uRaRRRRu..',
    '.....zWRRRRRu...',
    '....zWWWRRRu....',
    '...zWWWWWRu.....',
    '..zWWWWWWd......',
    '..zWWWWWd.......',
    '..zPWWWd........',
    '...zPPd.........',
    '................',
    '................',
    '................',
  ], (body, fx, f) => {
    twinkle(fx, 3, 3, f);
    twinkle(fx, 13, 9, f + 2, 'g');
    const rise = 13 - f;
    fx.set(11, rise, 'G').set(10, rise, 'g').set(12, rise, 'g').set(11, rise - 1, 'g').set(11, rise + 1, 'g');
    body.set(9 - f, 4 + f, 'W');
  }),
  battery: item([
    '................',
    '.....zddz.......',
    '...xGGGGGGx.....',
    '...GgGGGGGG.....',
    '...GgGGGYGG.....',
    '...GgGGYYGG.....',
    '...GgGYYYYG.....',
    '...GGGGYYGG.....',
    '...GGGYYGGG.....',
    '...GGGYGGGG.....',
    '...GGGGGGGG.....',
    '...GhhhhhhG.....',
    '...GGGGGGGG.....',
    '...xGGGGGGx.....',
    '................',
    '................',
  ], (body, fx, f) => {
    for (let led = 0; led <= f; led += 1) body.rect(4 + led * 2 - (led > 2 ? 1 : 0), 11, led > 2 ? 1 : 2, 1, 'E');
    if (f === 3) {
      for (let y = 4; y <= 9; y += 1) for (let x = 5; x <= 9; x += 1) if (body.get(x, y) === 'Y') body.set(x, y, 'W');
    }
    const sparks = [[[12, 3], [13, 4]], [[12, 7], [13, 6], [1, 5]], [[13, 10], [1, 9], [0, 8]], [[1, 2], [12, 5], [14, 5]]];
    sparks[f].forEach(([x, y], index) => fx.set(x, y, index === 0 ? 'W' : 'E'));
  }),
  candle: item([
    '................',
    '................',
    '................',
    '................',
    '.......K........',
    '....vVVVVVVv....',
    '...vVaVVVVVVv...',
    '...vVaVVVVVVv...',
    '...vWWWWWWWWv...',
    '...vAAAAAAAAv...',
    '...vWWWWWWWWv...',
    '...vVaVVVVVVv...',
    '...vVVVVVVVVv...',
    '....vvvvvvvv....',
    '................',
    '................',
  ], (body, fx, f) => {
    const flames = [
      ['.e.', '.O.', 'OYO', '.W.'],
      ['..e', '.OO', 'OYO', '.W.'],
      ['.e.', 'eOe', 'OYO', '.W.'],
      ['e..', 'OO.', 'OYO', '.W.'],
    ];
    fx.stamp(6, 0, flames[f]);
    const glow = f % 2 === 0 ? [[4, 2], [10, 2], [5, 0], [9, 0]] : [[4, 1], [10, 1], [3, 3], [11, 3]];
    glow.forEach(([x, y]) => fx.set(x, y, 'y'));
    twinkle(fx, 13, 7, f + 1, 'a');
    twinkle(fx, 1, 10, f + 3, 'V');
  }),
  wipes: item([
    '................',
    '................',
    '................',
    '................',
    '................',
    '..qbbbWWWbbbq...',
    '.qbLLbbbbbLLbq..',
    '.qblbWWWWWblbq..',
    '.qbbbWqBqWbbbq..',
    '.qbbbWBqBWbbbq..',
    '.qbbbWWWWWbbbq..',
    '.qbbbbbbbbbbbq..',
    '..qqqqqqqqqqq...',
    '................',
    '................',
    '................',
  ], (body, fx, f) => {
    const sway = [0, 1, 0, -1][f];
    body.stamp(5 + sway * 2, 1, ['.WWW.']).stamp(5 + sway, 2, ['WWWWW']).stamp(5 + sway, 3, ['WPWWP']).stamp(5, 4, ['WWWWW']);
    twinkle(fx, 13, 3, f);
    twinkle(fx, 1, 13, f + 2, 'L');
    twinkle(fx, 14, 13, f + 1, 'W');
  }),
  protein: item([], (body, fx, f) => {
    const shake = [0, 1, 0, -1][f];
    body.stamp(shake, 0, [
      '................',
      '.....hDDDDh.....',
      '.....DddddD.....',
      '....hDDDDDDh....',
      '....zWWWWWWz....',
      '....zRRRRRRz....',
      '....zRWRRWRz....',
      '....zRWWWWRz....',
      '....zRWRRWRz....',
      '....zRRRRRRz....',
      '....zWWWWWPz....',
      '....zWaaaaPz....',
      '....zWaaaaPz....',
      '.....zPPPPz.....',
    ]);
    for (let x = 6; x <= 9; x += 1) body.set(x + shake, 10, (x + f) % 2 === 0 ? 'a' : 'W');
    const power = [[[13, 3], [2, 8]], [[14, 5], [1, 6], [13, 1]], [[13, 8], [2, 3], [14, 2]], [[12, 10], [1, 11]]];
    power[f].forEach(([x, y], index) => fx.set(x, y, index === 0 ? 'W' : 'Y'));
    twinkle(fx, 13, 12, f + 1, 'a');
  }),
  heal: item([
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.uRRRRRRRRRRRu..',
    '.RYYOYYYYsWYYR..',
    '.RYOYYOYYWOWYR..',
    '.uRYYOYYYsWYRu..',
    '..RRRRRRRRRRR...',
    '..uRaRRRRRRRu...',
    '...uRRRRRRRu....',
    '....uuRRRuu.....',
    '.....uuuuu......',
    '................',
  ], (body, fx, f) => {
    steam(fx, 4, 5, f, 5);
    steam(fx, 7, 5, f + 1, 6);
    steam(fx, 10, 5, f + 2, 5);
    body.set(2 + f, 7, 'O').set(4 + f, 8, 'y');
    body.line(12, 5, 14, 1, 'n').line(13, 5, 15, 2, 'N');
  }),
  vacuumBag: item([
    '................',
    '....DDDDDDDD....',
    '...DddddddddD...',
    '...DDDDDDDDDD...',
    '...zLLLLLLLLz...',
    '...zLiLLLLLLz...',
    '...zLiLLLLLLz...',
    '...zLLLLLLLLz...',
    '...zLLLLLLLLz...',
    '...znnPnnPnnz...',
    '...znPnnnnPnz...',
    '...zPnnPnnnPz...',
    '...DDDDDDDDDD...',
    '....DDDDDDDD....',
    '................',
    '................',
  ], (body, fx, f) => {
    for (let speck = 0; speck < 5; speck += 1) {
      const angle = (speck / 5) * Math.PI * 2 + (f / ITEM_FRAMES) * Math.PI * 0.4 * 5;
      const reach = 1 + (speck % 3);
      body.set(Math.round(7.5 + Math.cos(angle) * reach * 1.1), Math.round(6 + Math.sin(angle) * reach * 0.7), speck % 2 === 0 ? 'n' : 'P');
    }
    [[1, 3], [14, 5], [1, 10], [14, 11]].forEach(([x, y], index) => {
      const pull = (f + index) % ITEM_FRAMES;
      if (pull < 3) fx.set(x + (x < 8 ? pull : -pull) * 0.7, y, pull === 2 ? 'W' : 'n');
    });
    body.set(8, 2, f % 2 === 0 ? 'G' : 'Y');
  }),
  bugBomb: item([
    '................',
    '................',
    '................',
    '................',
    '.......DD.......',
    '.....uzzzzu.....',
    '....uRRRRRRu....',
    '....RaRRRRRR....',
    '....RWWWWWWR....',
    '....RWKWWKWR....',
    '....RWWKKWWR....',
    '....RWKWWKWR....',
    '....RWWWWWWR....',
    '....RaRRRRRR....',
    '....uRRRRRRu....',
    '.....uuuuuu.....',
  ], (body, fx, f) => {
    const clouds = [
      [[7, 3, 1]],
      [[7, 2, 2], [5, 3, 1]],
      [[7, 2, 2], [4, 2, 1], [11, 2, 2], [9, 0, 1]],
      [[6, 1, 2], [2, 2, 1], [12, 1, 2], [9, 3, 1], [14, 4, 1]],
    ];
    clouds[f].forEach(([x, y, radius], index) => {
      fx.ellipse(x, y, radius, radius, index % 2 === 0 ? 'W' : 'g');
      fx.set(x - 1, y - radius + 1, 'W');
    });
    if (f > 1) fx.set(1, 6, 'g').set(14, 7, 'W');
  }),
  coffee: item([
    '..........GG....',
    '.........GG.....',
    '.........G......',
    '...zzzzzzGzzz...',
    '...zWWWWWGWWz...',
    '....zzzzzzzz....',
    '....zHHHHHHz....',
    '....zHHHHHHz....',
    '....zHHHHHHz....',
    '....zcHHHHHz....',
    '....zcHHHHHz....',
    '.....zHHHHz.....',
    '.....zccHHz.....',
    '.....zzzzzz.....',
    '................',
    '................',
  ], (body, fx, f) => {
    const bob = f % 2;
    [[6, 6], [8, 8], [6, 10]].forEach(([x, y], index) => {
      const top = y + ((index + bob) % 2);
      body.rect(x + (index === 1 ? 1 : 0), top, 2, 2, 'i').set(x + (index === 1 ? 1 : 0), top, 'W');
    });
    fx.set(3, 7 + f, 'L').set(12, 6 + ((f + 2) % ITEM_FRAMES), 'L');
    twinkle(fx, 13, 2, f);
    twinkle(fx, 2, 12, f + 2, 'i');
  }),
  chicken: item([
    '................',
    '.....fFFFf......',
    '....fFsFFFFf....',
    '...fFsFFFFFFf...',
    '...FsFFFFFFFf...',
    '...FFFFFFsFFf...',
    '...fFFFFFFFFf...',
    '....fFFFFFFf....',
    '.....ffFFFf.....',
    '.......fWf......',
    '........WW......',
    '........WPW.....',
    '.......WW.WW....',
    '.......WP.PW....',
    '................',
    '................',
  ], (body, fx, f) => {
    twinkle(fx, 13, 2, f, 'y');
    twinkle(fx, 1, 6, f + 2, 'y');
    twinkle(fx, 12, 9, f + 1, 'W');
    steam(fx, 5, 0, f, 2);
    steam(fx, 9, 0, f + 2, 2);
    body.set(5 + f, 3 + (f % 2), 's');
  }),
  icepack: item([
    '................',
    '................',
    '...qllllllllq...',
    '..qliiiiiiiilq..',
    '..liiiiiiiiiil..',
    '..liiiiiiiiibl..',
    '..liiiiiiiiibl..',
    '..liiiiiiiiibl..',
    '..liiiiiiiiibl..',
    '..liiiiiiiiibl..',
    '..liiiiiiiibbl..',
    '..qlbbbbbbbblq..',
    '...qllllllllq...',
    '................',
    '................',
    '................',
  ], (body, fx, f) => {
    for (let step = 0; step < 9; step += 1) {
      const x = 3 + f * 3 - step + 3;
      const y = 3 + step;
      if (body.get(x, y) === 'i') body.set(x, y, 'W');
      if (body.get(x + 1, y) === 'i' && step % 2 === 0) body.set(x + 1, y, 'W');
    }
    body.set(7, 6, 'W').set(6, 7, 'W').set(7, 7, 'E').set(8, 7, 'W').set(7, 8, 'W');
    twinkle(fx, 14, 2, f, 'i');
    twinkle(fx, 1, 5, f + 1, 'W');
    twinkle(fx, 13, 13, f + 2, 'i');
    twinkle(fx, 2, 14, f + 3, 'L');
  }),
  box: item([
    '................',
    '....ccccccccc...',
    '...cnnnnPPnnnc..',
    '..cnnnnPPnnnnc..',
    '..NNNNNNNNNNNc..',
    '..NnnnnPPnnnNc..',
    '..NnnnnPPnnnNc..',
    '..NnsnnPPnnnNc..',
    '..NnnnnnnnnnNc..',
    '..NnWWWnnnnnNc..',
    '..NnWKWnnnnnNc..',
    '..NnnnnnnnnnNc..',
    '..NNNNNNNNNNN...',
    '................',
    '................',
    '................',
  ], (body, fx, f) => {
    const shield = [[1, 1], [8, 0], [15, 2], [15, 8], [14, 14], [7, 14], [0, 13], [0, 7]];
    shield.forEach(([x, y], index) => {
      const lit = (index + f * 2) % 8;
      if (lit < 3) fx.set(x, y, lit === 0 ? 'W' : lit === 1 ? 'Y' : 'O');
    });
    body.set(4 + f * 2, 5 + (f % 2), 's');
  }),
  chest: item([
    '................',
    '................',
    '...HNNNNNNNNH...',
    '..HNnnOnnOnnNH..',
    '..NnsnOnnOnnnN..',
    '..NnnnOnnOnnnN..',
    '..OOOOOOOOOOOO..',
    '..HHHHHOYOHHHH..',
    '..NnnnnOKOnnnN..',
    '..NnnnnOOOnnnN..',
    '..NnnnOnnOnnnN..',
    '..NnnnOnnOnnnN..',
    '..HNNNNNNNNNNH..',
    '................',
    '................',
    '................',
  ], (body, fx, f) => {
    if (f > 0) {
      for (let x = 2; x <= 13; x += 1) if (body.get(x, 7) === 'H') body.set(x, 7, f === 2 ? 'W' : (x + f) % 2 === 0 ? 'Y' : 'y');
    }
    body.set(8, 7, f % 2 === 0 ? 'Y' : 'W');
    for (let x = 2; x <= 13; x += 1) if (body.get(x, 6) === 'O' && (x + 13 - f * 3) % 12 === 0) body.set(x, 6, 'W');
    twinkle(fx, 3, 0, f, 'Y');
    twinkle(fx, 12, 0, f + 2, 'Y');
    twinkle(fx, 15, 6, f + 1, 'Y');
    twinkle(fx, 0, 9, f + 3, 'Y');
    twinkle(fx, 8, 1, f + 1, 'W');
  }),
};
ITEMS.laser = item([
  '................',
  '................',
  '................',
  '................',
  '.........hzzh...',
  '........hzzDh...',
  '.......hzRDh....',
  '......hzzDh.....',
  '.....hzzDh......',
  '....hzzDh.......',
  '...hzzDh........',
  '..hzzDh.........',
  '..hDDh..........',
  '...hh...........',
  '................',
  '................',
], (body, fx, f) => {
  const beam = [[12, 3], [13, 2], [14, 1], [15, 0]];
  beam.forEach(([x, y], index) => {
    fx.set(x, y, (index + f) % 2 === 0 ? 'W' : 'j');
    if ((index + f) % 2 === 0) fx.set(x - 1, y - 1, 'g').set(x + 1, y + 1, 'g');
  });
  body.set(8, 6, f % 2 === 0 ? 'R' : 'e');
  twinkle(fx, 13, 6, f + 1, 'j');
  twinkle(fx, 9, 1, f + 3, 'j');
  twinkle(fx, 2, 8, f + 2, 'W');
});
ITEMS.stapler = item([], (body, fx, f) => {
  const pressed = f % 2;
  body.stamp(0, 4 + pressed, [
    '..uRRRRRRRRu....',
    '.uRaaRRRRRRRu...',
    '.RRRRRRRRRRRRu..',
    '.uuRRRRRRRRRRR..',
  ]);
  if (!pressed) body.stamp(0, 8, '...zzzzzzzzzzd..');
  body.stamp(0, 9, [
    '..hDDDDDDDDDDh..',
    '.hDddDDDDDDDDDh.',
    '.hhhhhhhhhhhhhh.',
  ]);
  const shots = [[[14, 7], [15, 7]], [[13, 8], [14, 8], [15, 5]], [[15, 9], [14, 6], [15, 6]], [[13, 8], [14, 8], [15, 10]]];
  shots[f].forEach(([x, y], index) => fx.set(x, y, index === 0 ? 'W' : 'z'));
  if (pressed) fx.set(13, 7, 'Y').set(14, 9, 'O');
  twinkle(fx, 1, 2, f, 'Y');
});
ITEMS.ball = item([], (body, fx, f) => {
  // 바닥에 닿을 때 납작해졌다가 튀어 오른다.
  const [cy, rx, ry] = [[10, 6, 4], [7, 5, 5], [5, 5, 5], [7, 5, 5]][f];
  body.ellipse(7, cy, rx, ry, 'A').ellipse(6, cy - 1, rx - 1, ry - 1, 'a', 'A').ellipse(7, cy, rx - 1, ry - 1, 'A', 'a');
  body.ellipse(5, cy - 2, 2, 1, 'a', 'A');
  for (let x = 7 - rx; x <= 7 + rx; x += 1) if (body.get(x, cy) === 'A') body.set(x, cy, 'Y');
  for (let y = cy - ry; y <= cy + ry; y += 1) if (body.get(7 + (f % 2), y) === 'A') body.set(7 + (f % 2), y, 'W');
  body.set(5, cy - 2, 'W');
  const shadow = [5, 3, 2, 3][f];
  for (let x = 7 - shadow; x <= 7 + shadow; x += 1) fx.set(x, 15, 'p');
  if (f === 0) fx.set(0, 13, 'W').set(14, 13, 'W').set(1, 11, 'a').set(13, 11, 'a');
  if (f === 2) twinkle(fx, 13, 2, 2, 'Y');
  if (f === 1 || f === 3) fx.set(2, cy + 5, 'a').set(12, cy + 5, 'a');
});
ITEMS.robot = item([], (body, fx, f) => {
  body.ellipse(7, 8, 6, 6, 'D').ellipse(7, 7, 6, 5, 'z').ellipse(7, 7, 5, 4, 'W').ellipse(7, 7, 2, 2, 'z');
  body.set(7, 7, f % 2 === 0 ? 'j' : 'G').rect(5, 2, 5, 1, 'h').set(4, 3, 'h').set(10, 3, 'h');
  body.set(4, 5, 'P').set(3, 7, 'P').set(10 + (f % 2), 9, 'P');
  [[2, 13], [12, 13]].forEach(([x, y], side) => {
    for (let hair = 0; hair < 3; hair += 1) {
      const spin = ((f + hair * 1.33) / ITEM_FRAMES) * Math.PI * 2 * (side === 0 ? 1 : -1);
      fx.set(x + Math.cos(spin) * 1.6, y + Math.sin(spin) * 1.6, 'Y');
    }
    fx.set(x, y, 'O');
  });
  [[0, 3], [15, 5], [14, 0], [1, 9]].forEach(([x, y], index) => {
    const pull = (f + index) % ITEM_FRAMES;
    if (pull < 3) fx.set(x + (x < 8 ? pull : -pull), y + pull * 0.6, pull === 0 ? 'n' : 'P');
  });
});
ITEMS.magnifier = item([
  '................',
  '....hDDDDh......',
  '...DLiiiiLD.....',
  '..DiWWiiiiiD....',
  '..DiWiiiiiiD....',
  '..DiiiiiiiiD....',
  '..DiiiiiiilD....',
  '..DLiiiillLD....',
  '...DLiillLD.....',
  '....hDDDDDn.....',
  '.........nNn....',
  '..........nNn...',
  '...........nNn..',
  '............nNc.',
  '.............cc.',
  '................',
], (body, fx, f) => {
  // 렌즈 안에서 작은 점이 점점 커진다.
  const grow = [0, 1, 2, 1][f];
  body.ellipse(6, 5, grow, grow, 'e', 'i');
  body.set(6, 5, grow === 2 ? 'Y' : 'e');
  body.set(4 + (f % 2), 3, 'W');
  twinkle(fx, 12, 2, f, 'Y');
  twinkle(fx, 1, 10, f + 2, 'W');
  twinkle(fx, 13, 8, f + 3, 'i');
});
// 합체 무기
ITEMS.thunderball = item([], (body, fx, f) => {
  const cy = [8, 7, 8, 9][f];
  body.ellipse(7, cy, 5, 5, 'q').ellipse(7, cy, 4, 4, 'B').ellipse(6, cy - 1, 3, 3, 'E', 'B').ellipse(5, cy - 2, 1, 1, 'W');
  body.stamp(5, cy - 3, ['..YY', '.YY.', 'YYYY', '.YY.', 'YY..', 'Y...']);
  const bolts = [
    [[13, 2], [14, 3], [13, 4], [0, 10], [1, 11], [0, 12]],
    [[1, 1], [0, 2], [1, 3], [14, 11], [15, 12], [14, 13]],
    [[12, 0], [13, 1], [14, 1], [2, 14], [1, 13], [0, 14]],
    [[0, 5], [1, 6], [0, 7], [15, 7], [14, 8], [15, 9]],
  ];
  bolts[f].forEach(([x, y], index) => fx.set(x, y, index % 2 === 0 ? 'E' : 'W'));
  twinkle(fx, 13, 13, f, 'Y');
  twinkle(fx, 2, 2, f + 2, 'E');
});
ITEMS.spinlaser = item([], (body, fx, f) => {
  for (let beam = 0; beam < 4; beam += 1) {
    const angle = (beam / 4) * Math.PI * 2 + (f / ITEM_FRAMES) * (Math.PI / 2);
    for (let reach = 2; reach <= 8; reach += 1) {
      fx.set(7.5 + Math.cos(angle) * reach, 7.5 + Math.sin(angle) * reach, reach % 2 === 0 ? 'E' : 'W');
      if (reach < 7) fx.set(7.5 + Math.cos(angle + 0.18) * reach, 7.5 + Math.sin(angle + 0.18) * reach, 'j');
    }
  }
  body.ellipse(7, 7, 3, 3, 'h').ellipse(7, 7, 2, 2, 'z').set(7, 7, f % 2 === 0 ? 'R' : 'e').set(6, 6, 'W');
});
ITEMS.poisongun = item([], (body, fx, f) => {
  const pressed = f % 2;
  body.stamp(0, 4 + pressed, [
    '..xGGGGGGGGx....',
    '.xGggGGGGGGGx...',
    '.GGGGGGGGGGGGx..',
    '.xxGGGGGGGGGGG..',
  ]);
  if (!pressed) body.stamp(0, 8, '...jjjjjjjjjjx..');
  body.stamp(0, 9, [
    '..hDDDDDDDDDDh..',
    '.hDddDDDDDDDDDh.',
    '.hhhhhhhhhhhhhh.',
  ]);
  body.stamp(4, 5 + pressed, ['W.W', '.W.']);
  const darts = [[[14, 5], [15, 5], [14, 9]], [[13, 7], [14, 7], [15, 10]], [[15, 6], [14, 8], [15, 8]], [[13, 6], [14, 10], [15, 11]]];
  darts[f].forEach(([x, y], index) => fx.set(x, y, index === 0 ? 'W' : 'j'));
  [[3, 13], [8, 14], [12, 13]].forEach(([x, y], index) => fx.set(x, y + ((f + index) % 2), 'j'));
  twinkle(fx, 2, 1, f, 'j');
  twinkle(fx, 11, 1, f + 2, 'g');
});
ITEMS.bleachbot = item([], (body, fx, f) => {
  body.ellipse(8, 7, 6, 6, 't').ellipse(8, 6, 6, 5, 'T').ellipse(8, 6, 5, 4, 'W').ellipse(8, 6, 2, 2, 'T');
  body.set(8, 6, f % 2 === 0 ? 'W' : 'i').rect(6, 1, 5, 1, 'h').set(5, 2, 'h').set(11, 2, 'h').set(5, 4, 'i').set(4, 6, 'i');
  // 지나간 자리에 남는 락스 방울
  [[1, 13], [4, 14], [7, 15], [11, 14], [14, 13]].forEach(([x, y], index) => {
    const phase = (f + index) % ITEM_FRAMES;
    fx.set(x, y, phase === 0 ? 'W' : 'T');
    if (phase < 2) fx.set(x + 1, y, 'i');
    if (phase === 3) fx.set(x, y - 1, 't');
  });
  twinkle(fx, 14, 1, f, 'i');
  twinkle(fx, 0, 8, f + 2, 'T');
});
ITEMS.firering = item([], (body, fx, f) => {
  for (let orb = 0; orb < 8; orb += 1) {
    const angle = (orb / 8) * Math.PI * 2 + (f / ITEM_FRAMES) * (Math.PI / 4);
    const x = 7.5 + Math.cos(angle) * 6;
    const y = 7.5 + Math.sin(angle) * 6;
    body.set(x, y, orb % 2 === 0 ? 'e' : 'O');
    fx.set(x, y, orb % 2 === 0 ? 'O' : 'Y');
    fx.set(7.5 + Math.cos(angle - 0.35) * 6, 7.5 + Math.sin(angle - 0.35) * 6, 'e');
  }
  const flames = [
    ['..e..', '.eO..', '.OYO.', 'eOYOe', 'OYWYO', '.OYO.'],
    ['..e..', '..Oe.', '.OYO.', 'eOYOe', 'OYWYO', '.OYO.'],
    ['.e...', '.eO..', '.OYOe', 'eOYO.', 'OYWYO', '.OYO.'],
    ['...e.', '..Oe.', 'eOYO.', '.OYOe', 'OYWYO', '.OYO.'],
  ];
  body.stamp(5, 5, flames[f]);
  twinkle(fx, 14, 1, f, 'Y');
  twinkle(fx, 1, 14, f + 2, 'O');
});
ITEMS.sawblade = item([], (body, fx, f) => {
  for (let tooth = 0; tooth < 8; tooth += 1) {
    const angle = (tooth / 8) * Math.PI * 2 + (f / ITEM_FRAMES) * (Math.PI / 4);
    body.set(7.5 + Math.cos(angle) * 6.6, 7.5 + Math.sin(angle) * 6.6, 'L');
    body.set(7.5 + Math.cos(angle + 0.2) * 5.8, 7.5 + Math.sin(angle + 0.2) * 5.8, 'L');
  }
  body.ellipse(7, 7, 5, 5, 'b').ellipse(7, 7, 4, 4, 'L').ellipse(6, 6, 3, 3, 'W', 'L').ellipse(7, 7, 2, 2, 'B');
  for (let spoke = 0; spoke < 4; spoke += 1) {
    const angle = (spoke / 4) * Math.PI * 2 + (f / ITEM_FRAMES) * (Math.PI / 2);
    body.set(7.5 + Math.cos(angle) * 3.4, 7.5 + Math.sin(angle) * 3.4, 'q');
  }
  body.set(7, 7, 'W');
  const sparks = [[[14, 13], [15, 14]], [[13, 14], [15, 12], [1, 1]], [[0, 2], [1, 0], [14, 15]], [[15, 15], [0, 0]]];
  sparks[f].forEach(([x, y], index) => fx.set(x, y, index === 0 ? 'W' : 'Y'));
});
ITEMS.ramen = ITEMS.heal;

// 보스는 크기가 커서 글자 격자 대신 작은 그리기 함수로 찍는다. frame은 0 또는 1이다.
function canvasGrid(width, height) {
  const cells = Array.from({ length: height }, () => Array(width).fill('.'));
  const api = {
    set(x, y, ch) {
      const column = Math.round(x);
      const row = Math.round(y);
      if (column >= 0 && column < width && row >= 0 && row < height) cells[row][column] = ch;
      return api;
    },
    // 글자 격자를 (x, y)에 찍는다. '.'은 건너뛴다.
    stamp(x, y, rows) {
      [rows].flat().forEach((line, row) => [...line].forEach((ch, column) => {
        if (ch !== '.') api.set(x + column, y + row, ch);
      }));
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

function kingFly(frame) {
  const g = canvasGrid(40, 30);
  // 날개는 위로 들었다 옆으로 폈다 한다.
  if (frame === 0) {
    g.ellipse(13, 7, 9, 5, 'L').ellipse(13, 7, 7, 3, 'i', 'L').ellipse(24, 6, 8, 5, 'L').ellipse(24, 6, 6, 3, 'i', 'L');
    g.line(8, 9, 18, 5, 'W').line(20, 8, 29, 4, 'W');
  } else {
    g.ellipse(11, 12, 10, 3, 'L').ellipse(11, 12, 8, 1, 'i', 'L').ellipse(26, 10, 9, 3, 'L').ellipse(26, 10, 7, 1, 'i', 'L');
    g.line(3, 12, 18, 12, 'W').line(19, 10, 33, 10, 'W');
  }
  const step = frame ? 1 : -1;
  g.line(14, 22, 11 + step, 27, 'k').line(11 + step, 27, 9 + step, 28, 'k');
  g.line(19, 23, 19 - step, 28, 'k').line(19 - step, 28, 17 - step, 29, 'k');
  g.line(24, 22, 27 + step, 27, 'k').line(27 + step, 27, 29 + step, 28, 'k');
  g.ellipse(13, 17, 9, 6, 'h').ellipse(13, 16, 9, 5, 'D').ellipse(11, 13, 5, 1, 'S', 'D');
  [7, 11, 15, 19].forEach((x) => { for (let y = 11; y <= 23; y += 1) if (g.get(x, y) === 'D') g.set(x, y, 'h'); });
  g.ellipse(23, 16, 6, 6, 'h').ellipse(23, 15, 5, 4, 'S', 'h').ellipse(22, 13, 2, 1, 'd', 'S');
  g.ellipse(31, 16, 5, 5, 'h').ellipse(31, 16, 4, 4, 'D');
  g.ellipse(32, 13, 3, 3, 'u').ellipse(32, 13, 2, 2, 'R').set(31, 12, 'a').set(33, 12, 'W');
  g.ellipse(33, 19, 2, 2, 'u').ellipse(33, 19, 1, 1, 'R').set(33, 18, 'a');
  g.line(35, 20, 37, 23, 'k').set(38, 23, 'k');
  g.rect(26, 7, 8, 3, 'O').rect(26, 9, 8, 1, 'o');
  [26, 29, 30, 33].forEach((x) => g.set(x, 6, 'O').set(x, 5, 'O'));
  g.set(26, 4, 'Y').set(33, 4, 'Y').set(29, 4, 'O').set(30, 4, 'O').set(28, 8, 'R').set(31, 8, 'Y');
  return g.rows();
}

ART.kingFlyA = kingFly(0);
ART.kingFlyB = kingFly(1);
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
function build(rows, { outline = true, scale = 1, overlay = null } = {}) {
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
  // 반짝임 같은 덧그림은 외곽선 없이 맨 위에 찍는다.
  (overlay ?? []).forEach((line, y) => [...line].forEach((ch, x) => {
    if (!PALETTE[ch]) return;
    ctx.fillStyle = PALETTE[ch];
    ctx.fillRect((x + pad) * scale, (y + pad) * scale, scale, scale);
  }));
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

function buildItem(id, frame, scale = 1) {
  const [body, overlay] = (ITEMS[id] ?? ITEMS.box)(frame % ITEM_FRAMES);
  return build(body, { scale, overlay });
}

// 바닥에 떨어진 아이템을 그릴 때 쓴다. frame은 0부터 ITEM_FRAMES - 1까지다.
export function icon(id, frame = 0) {
  const key = `icon|${id}|${frame % ITEM_FRAMES}`;
  if (!cache.has(key)) cache.set(key, buildItem(id, frame));
  return cache.get(key);
}

const urlCache = new Map();

// HUD에 쓰는 확대한 스프라이트(적 그림 등) 이미지 주소
export function iconUrl(id) {
  if (!urlCache.has(id)) {
    const source = ITEMS[id] ? buildItem(id, 0, 4) : build(ART[id], { scale: 4 });
    urlCache.set(id, source.toDataURL());
  }
  return urlCache.get(id);
}

// 선택 카드와 HUD에서 CSS로 넘겨 가며 보여 주는 아이템 프레임 묶음(가로로 ITEM_FRAMES칸)
export function iconSheetUrl(id) {
  const key = `sheet|${id}`;
  if (!urlCache.has(key)) {
    const frames = Array.from({ length: ITEM_FRAMES }, (_, frame) => buildItem(id, frame));
    const sheet = makeCanvas(frames[0].width * ITEM_FRAMES, frames[0].height);
    const ctx = sheet.getContext('2d');
    frames.forEach((frame, index) => ctx.drawImage(frame, index * frame.width, 0));
    urlCache.set(key, sheet.toDataURL());
  }
  return urlCache.get(key);
}

export const ITEM_IDS = Object.keys(ITEMS);
