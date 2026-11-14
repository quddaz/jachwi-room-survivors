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
  antA: [
    'k...k...',
    '.k.k.k..',
    'HHkHHHkK',
    'HnHHnHHH',
    '.k.k.k..',
    'k...k...',
  ],
  antB: [
    '.k...k..',
    '.k.k.k..',
    'HHkHHHkK',
    'HnHHnHHH',
    'k..k..k.',
    '........',
  ],
  slugA: [
    '..........k.k.',
    '..........kWkW',
    '.....nnnnnnnn.',
    '...nnyynnnnnnn',
    '.nnnyyyynnnKnn',
    'nnnnnnnnnnnnnn',
    'NNNNNNNNNNNNN.',
  ],
  slugB: [
    '..........k..k',
    '..........kW.W',
    '....nnnnnnnnn.',
    '..nnnyynnnnnnn',
    '.nnnyyyynnnKnn',
    'nnnnnnnnnnnnn.',
    '.NNNNNNNNNNNN.',
  ],
  sockA: [
    '.PPPPPP...',
    '.RRRRRR...',
    '.PPPPPP...',
    '.RRRRRR...',
    '.PPPPPP...',
    '.PKPPKP...',
    '.PPPPPP...',
    '.PPpppPPP.',
    '.PPPPPPPPP',
    '..pPPPPPPp',
    '...pppppp.',
  ],
  sockB: [
    '..PPPPPP..',
    '..RRRRRR..',
    '..PPPPPP..',
    '..RRRRRR..',
    '..PPPPPP..',
    '..PKPPKP..',
    '..PPPPPP..',
    '..PPpppPPP',
    '.PPPPPPPPP',
    '.pPPPPPPp.',
    '..pppppp..',
  ],
  dustbunnyA: [
    '..dd...dd...',
    '..dzd.dzd...',
    '..dzd.dzd...',
    '..dad.dad...',
    '.dzzzzzzzd..',
    'dzzWKzzWKzd.',
    'dzzzzazzzzd.',
    'dzzzzzzzzzd.',
    '.dzdzzzdzd..',
    '..d.d.d.d...',
  ],
  dustbunnyB: [
    '............',
    '..dd...dd...',
    '..dzd.dzd...',
    '..dad.dad...',
    '.dzzzzzzzd..',
    'dzzWKzzWKzd.',
    'dzzzzazzzzd.',
    'dzzzzzzzzzd.',
    'dzdzzzzzdzd.',
    '.d.d.d.d.d..',
  ],
  pigeonA: [
    '...........SS.',
    '..........SOKS',
    '.........SSGGOo',
    '..SSSS..SVGG..',
    '.SddddSSSGS...',
    'SddddddSSS....',
    'SdSdSdSSS.....',
    '.SSSSSSS......',
    '....O..O......',
  ],
  pigeonB: [
    '..SSS......SS.',
    '.SddSS....SOKS',
    '.SdddSS..SSGGOo',
    '..SdddSSSVGG..',
    '...SSSSSSGS...',
    '...SSdSSS.....',
    '....SSSS......',
    '..............',
    '.....O.O......',
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
// 로봇청소기 완성형: 장갑, 헬멧, 블래스터를 든 작은 보병.
function drawMarine(body, fx, frame, acid = false) {
  const armor = acid ? 'G' : 'B';
  const light = acid ? 'g' : 'b';
  const step = frame % 2;
  body.rect(4, 11, 3, 4 - step, 'h').rect(9, 11, 3, 3 + step, 'h');
  body.rect(4, 11, 3, 2, armor).rect(9, 11, 3, 2, armor);
  body.rect(4, 5, 8, 7, 'h').rect(5, 5, 6, 6, armor).rect(5, 5, 6, 1, light);
  body.rect(1, 5, 4, 5, 'h').rect(1, 5, 4, 3, armor).rect(1, 5, 4, 1, light);
  body.rect(11, 5, 4, 5, 'h').rect(11, 5, 4, 3, armor).rect(11, 5, 4, 1, light);
  body.rect(5, 1, 6, 5, 'h').rect(6, 1, 4, 4, armor).rect(6, 2, 4, 1, 'R');
  body.rect(6, 7, 4, 1, 'Y').rect(7, 6, 2, 3, 'Y');
  body.rect(8, 8, 7, 3, 'h').rect(9, 8, 6, 1, 'z').rect(14, 8, 2, 2, 'D');
  if (frame === 1) fx.set(15, 7, acid ? 'j' : 'Y').set(15, 10, 'O');
  if (frame === 3) fx.set(0, 12, light);
}
ITEMS.marine = item([], (body, fx, frame) => drawMarine(body, fx, frame));
// 소환수와 장비 아이콘은 같은 16×16 도트를 공유한다.
function sockPuppet(body, fx, frame, knight = false) {
  const step = frame % 2;
  body.rect(4, 4, 8, 7, 'h').rect(5, 4, 6, 6, 's');
  body.rect(4, 1, 3, 5, 's').rect(9, 2, 3, 4, 's');
  body.rect(5, 10, 6, 4, 'B').rect(3, 8, 3, 3, 'b').rect(10, 8, 3, 3, 'b');
  body.rect(4, 13, 3, 2 - step, 'h').rect(9, 13, 3, 1 + step, 'h');
  body.set(6, 6, 'h').set(10, 6, 'h').rect(7, 8, 2, 1, 'O');
  if (knight) {
    body.rect(3, 3, 10, 2, 'D').rect(4, 1, 8, 3, 'z').rect(7, 0, 2, 3, 'B');
    body.rect(11, 9, 4, 5, 'q').rect(12, 10, 2, 3, 'Y');
  }
  if (frame === 1) fx.set(14, 7, 'W').set(15, 6, 'Y');
}
ITEMS.sockpuppet = item([], (body, fx, f) => sockPuppet(body, fx, f));
ITEMS.sockknight = item([], (body, fx, f) => sockPuppet(body, fx, f, true));
function toyDrone(body, fx, frame, twin = false) {
  body.rect(3, 5, 10, 5, 'h').rect(4, 5, 8, 4, twin ? 'q' : 'B');
  body.rect(6, 6, 4, 2, 'i').set(9, 8, 'R');
  for (const x of [1, 12]) {
    body.rect(x, 3, 3, 2, 'D').rect(x, 11, 3, 2, 'D');
    fx.rect(x - (frame % 2), 2, 3 + frame % 2 * 2, 1, 'z');
    fx.rect(x - (frame % 2), 13, 3 + frame % 2 * 2, 1, 'z');
  }
  body.rect(10, 8, 5, 2, 'D');
  if (twin) body.rect(10, 5, 5, 2, 'D');
  if (frame === 1) fx.set(15, 8, 'Y').set(15, 6, 'W');
}
ITEMS.toydrone = item([], (body, fx, f) => toyDrone(body, fx, f));
ITEMS.dronemk2 = item([], (body, fx, f) => toyDrone(body, fx, f, true));
function windCar(body, fx, frame, tank = false) {
  body.rect(2, 6, 12, 7, 'h').rect(3, 6, 10, 6, tank ? 'G' : 'B');
  body.rect(5, 3, 6, 5, tank ? 'x' : 'q').rect(6, 4, 4, 3, 'i');
  body.rect(2, 12, 4, 3, 'D').rect(10, 12, 4, 3, 'D');
  body.set(3 + frame % 2, 13, 'z').set(11 + frame % 2, 13, 'z');
  body.rect(12, 8, 2, 2, 'Y').rect(2, 8, 2, 2, 'R');
  if (tank) body.rect(8, 5, 8, 2, 'D').rect(4, 9, 7, 2, 'g');
  else body.rect(0, 4, 4, 1, 'z').rect(1, 2, 1, 5, 'z');
  if (frame % 2) fx.set(0, 11, 'p').set(1, 10, 'W');
}
ITEMS.windcar = item([], (body, fx, f) => windCar(body, fx, f));
ITEMS.windtank = item([], (body, fx, f) => windCar(body, fx, f, true));
function plantSpirit(body, fx, frame, guardian = false) {
  body.rect(3, 8, 10, 2, 'h').rect(4, 10, 8, 4, guardian ? 'q' : 'N');
  body.rect(5, 10, 6, 3, guardian ? 'B' : 'n').rect(6, 14, 4, 1, 'h');
  body.rect(7, 3, 2, 6, 'G').ellipse(4, 4, 3, 2, 'g').ellipse(11, 2, 3, 2, 'G');
  body.set(6, 11, 'h').set(10, 11, 'h').set(8, 12, 's');
  body.rect(3, 13, 2, 2, 'G').rect(11, 13, 2, 2, 'G');
  if (guardian) { body.ellipse(3, 1, 2, 2, 'Y').ellipse(10, 5, 3, 2, 'g'); twinkle(fx, 13, 0, frame, 'Y'); }
  if (frame === 1) fx.set(14, 7, 'j').set(15, 6, 'W');
}
ITEMS.plantspirit = item([], (body, fx, f) => plantSpirit(body, fx, f));
ITEMS.plantguardian = item([], (body, fx, f) => plantSpirit(body, fx, f, true));
ITEMS.precisionscale = item([], (body, fx, f) => {
  body.rect(2, 12, 12, 3, 'h').rect(3, 12, 10, 2, 'B');
  body.rect(7, 3, 2, 10, 'z').rect(2, 3, 12, 2, 'Y');
  for (const x of [2, 10]) {
    body.rect(x, 5, 1, 4, 'z').rect(x + 3, 5, 1, 4, 'z').rect(x, 9, 4, 2, 'F');
  }
  body.set(7, 1, 'Y').set(8, 1, 'Y');twinkle(fx, 12, 2, f, 'Y');
});
ITEMS.resonator = item([], (body, fx, f) => {
  body.rect(7, 6, 2, 9, 'D').rect(6, 4, 4, 4, 'z');
  body.rect(3, 1, 3, 5, 'B').rect(10, 1, 3, 5, 'B').rect(4, 5, 8, 2, 'b');
  body.rect(7, 1, 2, 4, 'h');
  if (f % 2) { fx.set(1, 3, 'E').set(14, 3, 'E').set(0, 2, 'W').set(15, 2, 'W'); }
});
ITEMS.thermos = item([], (body, fx, f) => {
  body.rect(4, 3, 8, 12, 'h').rect(5, 4, 6, 10, 'R').rect(6, 4, 1, 9, 'a');
  body.rect(4, 1, 8, 3, 'z').rect(5, 1, 6, 1, 'W').rect(6, 8, 4, 3, 's');
  body.rect(11, 5, 3, 5, 'h').rect(12, 6, 1, 3, 'z');
  if (f % 2) fx.set(7, 0, 'W').set(9, 0, 'p');
});
ITEMS.concentrate = item([], (body, fx, f) => {
  body.rect(5, 0, 6, 3, 'z').rect(6, 3, 4, 3, 'i');
  body.rect(3, 6, 10, 9, 'h').rect(4, 6, 8, 8, 'i').rect(4, 10, 8, 4, 'V');
  body.rect(5, 7, 1, 5, 'W').rect(7, 8, 3, 3, 'v');
  fx.set(9, 11 - f % 3, 'W');twinkle(fx, 13, 5, f, 'V');
});
ITEMS.baton = item([], (body, fx, f) => {
  for (let n = 0; n < 11; n++) body.rect(3 + n, 13 - n, 2, 2, n < 4 ? 'N' : 'z');
  body.rect(10, 0, 5, 5, 'Y').rect(11, 1, 3, 3, 'y');
  twinkle(fx, 12, 2, f, 'E');
});
ITEMS.marchdrum = item([], (body, fx, f) => {
  body.rect(2, 5, 12, 9, 'h').rect(3, 6, 10, 7, 'R').rect(4, 7, 2, 5, 'Y').rect(10, 7, 2, 5, 'Y');
  body.ellipse(7, 5, 6, 2, 'z').ellipse(7, 4, 5, 2, 's').rect(3, 13, 10, 1, 'z');
  body.rect(1, f % 2, 2, 5, 'N').rect(12, 1 - f % 2, 2, 5, 'N');
  if (f % 2) fx.set(6, 1, 'E').set(9, 1, 'E');
});
ITEMS.summoncrest = item([], (body, fx, f) => {
  body.rect(3, 1, 10, 11, 'h').rect(4, 2, 8, 9, 'B').rect(5, 3, 6, 7, 'b');
  body.rect(6, 5, 4, 1, 'Y').rect(7, 4, 2, 4, 'Y');
  body.rect(4, 12, 3, 3, 'q').rect(9, 12, 3, 3, 'q');
  twinkle(fx, 12, 2, f, 'Y');
});
ITEMS.summonwhistle = item([], (body, fx, f) => {
  body.ellipse(6, 8, 5, 4, 'h').ellipse(6, 8, 4, 3, 'Y').ellipse(5, 8, 2, 2, 'F');
  body.rect(9, 5, 6, 4, 'h').rect(10, 6, 5, 2, 'Y');
  body.rect(5, 1, 2, 4, 'B');
  if (f % 2) fx.set(13, 3, 'E').set(15, 2, 'W');
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
ITEMS.clover = item([
  '................',
  '....xx...xx.....',
  '...xGGx.xGGx....',
  '...xGgGxGgGx....',
  '....xGGGGGx.....',
  '.xx..xGGGx..xx..',
  'xGGx.xGGGx.xGGx.',
  'xGgGxGGyGGxGgGx.',
  'xGGGGGyGyGGGGGx.',
  '.xGGGGGyGGGGGx..',
  '..xxxGGGGGxxx...',
  '....xGGxGGx.....',
  '...xGgGxGgGx....',
  '...xGGx.xGGx....',
  '....xx..Nn......',
  '.........Nn.....',
], (body, fx, f) => {
  // 가운데가 반짝이고, 주위로 행운의 빛이 돈다.
  body.set(7, 8, f % 2 === 0 ? 'Y' : 'y');
  const ring = [[1, 1], [8, 0], [15, 2], [15, 9], [13, 15], [6, 15], [0, 12], [0, 4]];
  ring.forEach(([x, y], index) => {
    const lit = (index + f * 2) % 8;
    if (lit < 2) fx.set(x, y, lit === 0 ? 'W' : 'Y');
  });
  twinkle(fx, 12, 12, f + 1, 'Y');
});
ITEMS.hotsauce = item([
  '......xGx.......',
  '......xGx.......',
  '.....hDDDh......',
  '......uRu.......',
  '.....uRRRu......',
  '....uRRaRRu.....',
  '....uRaRRRu.....',
  '....uWWWWWu.....',
  '....uWeOeWu.....',
  '....uWOYOWu.....',
  '....uWeOeWu.....',
  '....uWWWWWu.....',
  '....uRRRRRu.....',
  '....uRRRRRu.....',
  '.....uuuuu......',
  '................',
], (body, fx, f) => {
  // 병 둘레로 매운 불꽃이 피어오른다.
  const flames = [
    [[12, 6, 'e'], [12, 5, 'O'], [2, 9, 'e']],
    [[12, 5, 'e'], [12, 4, 'Y'], [13, 6, 'O'], [2, 8, 'O'], [2, 9, 'e']],
    [[13, 4, 'e'], [12, 3, 'O'], [1, 7, 'e'], [2, 8, 'Y']],
    [[12, 2, 'e'], [13, 3, 'O'], [1, 6, 'O'], [2, 7, 'e']],
  ];
  flames[f].forEach(([x, y, ch]) => fx.set(x, y, ch));
  body.set(7, 9, f % 2 === 0 ? 'Y' : 'W');
  twinkle(fx, 13, 12, f + 2, 'e');
});
ITEMS.towel = item([], (body, fx, f) => {
  // 바람에 펄럭이는 줄무늬 수건
  for (let x = 1; x <= 14; x += 1) {
    const wave = Math.round(Math.sin(x * 0.6 + f * 1.6) * 1.5);
    for (let y = 4; y <= 11; y += 1) body.set(x, y + wave, (y === 6 || y === 9) ? 'W' : x % 4 === 0 ? 't' : 'T');
  }
  [[3, 14], [8, 15], [12, 14]].forEach(([x, y], index) => fx.set(x, y - ((f + index) % 3), 'L'));
  twinkle(fx, 14, 1, f, 'W');
});
ITEMS.paperplane = item([], (body, fx, f) => {
  const bob = [0, -1, 0, 1][f];
  body.line(1, 9 + bob, 14, 4 + bob, 'W').line(1, 9 + bob, 9, 13 + bob, 'W').line(9, 13 + bob, 14, 4 + bob, 'W');
  for (let y = 5; y <= 12; y += 1) for (let x = 2; x <= 13; x += 1) {
    const inTop = y >= 9 + bob - (x - 1) * (5 / 13) && y <= 9 + bob + (x - 1) * (4 / 8);
    if (inTop && body.get(x, y) === '.') body.set(x, y, x < 9 && y > 9 + bob ? 'z' : 'W');
  }
  body.line(1, 9 + bob, 14, 4 + bob, 'z');
  [[0, 12], [2, 14], [4, 15]].forEach(([x, y], index) => { if ((f + index) % 2) fx.set(x, y + bob, 'L'); });
  twinkle(fx, 13, 12, f + 2, 'Y');
});
ITEMS.mousetrap = item([
  '................',
  '................',
  '................',
  '................',
  '......zzzzzz....',
  '.....z......z...',
  '.....z......z...',
  '..nnnznnnnnnznn.',
  '.nNNNzNNNNNNzNNn',
  '.nNNNNNNNNNNNNNn',
  '.nNNNNNYYyNNNNNn',
  '.nNNNNNYYYNNNNNn',
  '..nnnnnnnnnnnnn.',
  '................',
  '................',
  '................',
], (body, fx, f) => {
  // 쇠고리가 탁 닫혔다가 다시 열린다.
  if (f === 2) for (let x = 5; x <= 12; x += 1) { body.set(x, 4, '.'); body.set(x, 7, 'W'); }
  if (f === 2) fx.set(4, 5, 'W').set(13, 5, 'W').set(8, 3, 'Y');
  twinkle(fx, 2, 2, f, 'W');
});
ITEMS.microwave = item([
  '................',
  '................',
  '.hhhhhhhhhhhhhh.',
  '.hzzzzzzzzzzzzh.',
  '.hzKKKKKKKKzddh.',
  '.hzKYYYYYYKzdKh.',
  '.hzKYYYYYYKzddh.',
  '.hzKYYYYYYKzdKh.',
  '.hzKYYYYYYKzddh.',
  '.hzKKKKKKKKzRdh.',
  '.hzzzzzzzzzzzzh.',
  '.hhhhhhhhhhhhhh.',
  '..h..........h..',
  '................',
  '................',
  '................',
], (body, fx, f) => {
  // 안쪽 접시가 돌고, 위로 파동이 퍼진다.
  body.set(4 + f, 7, 'O').set(5 + f, 7, 'o');
  body.set(13, 9, f % 2 ? 'G' : 'R');
  const r = [1, 2, 3, 4][f];
  for (let x = 7 - r; x <= 7 + r; x += 1) fx.set(x, 1 - (Math.abs(x - 7) === r ? 0 : 1) + (r > 2 ? 0 : 1), 'Y');
});
ITEMS.shower = item([
  '..........hhh...',
  '.........hzzh...',
  '........hzzh....',
  '...hhhhhhzh.....',
  '..hzzzzzzh......',
  '..hddddddh......',
  '...hhhhhh.......',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
], (body, fx, f) => {
  // 물줄기가 차례로 떨어진다.
  [3, 5, 7, 9].forEach((x, lane) => {
    for (let drop = 0; drop < 3; drop += 1) {
      const y = 8 + ((f + lane + drop * 3) % 8);
      fx.set(x - 1 + Math.floor((y - 8) / 4), y, drop === 0 ? 'W' : 'l');
    }
  });
  twinkle(fx, 13, 13, f, 'L');
});
// 보물
ITEMS.twin = item([
  '................',
  '..DD......DD....',
  '.Dddz....Dddz...',
  '.DDDD....DDDD...',
  '..zz......zz....',
  '.xGGx....xGGx...',
  'xGgGGx..xGgGGx..',
  'xGgGGx..xGgGGx..',
  'xWWWWx..xWWWWx..',
  'xWRRWx..xWRRWx..',
  'xWWWWx..xWWWWx..',
  'xGgGGx..xGgGGx..',
  'xGGGGx..xGGGGx..',
  '.xxxx....xxxx...',
  '................',
  '................',
], (body, fx, f) => {
  [[5, 2], [13, 2]].forEach(([x, y], index) => {
    const reach = (f + index * 2) % ITEM_FRAMES;
    for (let step = 0; step <= reach; step += 1) fx.set(x + step, y - step * 0.5, step === reach ? 'W' : 'L');
  });
  twinkle(fx, 7, 11, f, 'Y');
});
ITEMS.blanket = item([
  '................',
  '................',
  '................',
  '..qqqqqqqqqqqq..',
  '.qBBlBBBBlBBBBq.',
  '.qBlllBBlllBBBq.',
  '.qBBlBBBBlBBBBq.',
  '.qbbbbbbbbbbbbq.',
  '.qWWWWWWWWWWWWq.',
  '.qBBBBlBBBBlBBq.',
  '.qBBBlllBBlllBq.',
  '.qBBBBlBBBBlBBq.',
  '..qqqqqqqqqqqq..',
  '................',
  '................',
  '................',
], (body, fx, f) => {
  // 졸린 Z가 차례로 떠오른다.
  const zs = [[[12, 2]], [[12, 2], [13, 0]], [[13, 1], [14, 0]], [[12, 2]]][f];
  zs.forEach(([x, y]) => fx.set(x, y, 'W').set(x + 1, y, 'W').set(x, y + 1, 'L'));
  body.set(4 + f * 2, 8, 'y');
});
ITEMS.energy = item([
  '.....hhhhh......',
  '....zdddddz.....',
  '....hYYYYYh.....',
  '....hYKKYYh.....',
  '....hYYKKYh.....',
  '....hhKKYYh.....',
  '....hYYKKKh.....',
  '....hYKKKYh.....',
  '....hYYYKKh.....',
  '....hYYKKYh.....',
  '....hYKYYYh.....',
  '....hYYYYYh.....',
  '....zdddddz.....',
  '.....hhhhh......',
  '................',
  '................',
], (body, fx, f) => {
  const sparks = [[[12, 3], [13, 2], [2, 9]], [[13, 5], [14, 4], [1, 6]], [[12, 9], [13, 10], [2, 3]], [[14, 7], [1, 11], [2, 12]]];
  sparks[f].forEach(([x, y], index) => fx.set(x, y, index === 0 ? 'W' : 'Y'));
  body.set(6, 2 + f * 3, 'y');
});
ITEMS.magnet = item([
  '................',
  '..uRRRu.uRRRu...',
  '..RRaRR.RRaRR...',
  '..RRRRR.RRRRR...',
  '..RRRRR.RRRRR...',
  '..RRRRR.RRRRR...',
  '..RRRRRuRRRRR...',
  '..RRRRRRRRRRR...',
  '...RRRRRRRRR....',
  '....uRRRRRu.....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
], (body, fx, f) => {
  body.rect(2, 1, 5, 2, 'z').rect(8, 1, 5, 2, 'z').set(3, 1, 'W').set(9, 1, 'W');
  // 아래에서 먼지가 끌려 올라온다.
  [[3, 14], [7, 15], [11, 14], [5, 12], [9, 13]].forEach(([x, y], index) => {
    const pull = (f + index) % ITEM_FRAMES;
    fx.set(x + (x < 7 ? pull * 0.5 : x > 7 ? -pull * 0.5 : 0), y - pull, pull === 3 ? 'W' : index % 2 ? 'n' : 'b');
  });
});
ITEMS.neko = item([], (body, fx, f) => {
  const paw = [2, 1, 2, 3][f];
  body.ellipse(7, 10, 5, 4, 'W').ellipse(7, 5, 4, 3, 'W');
  body.set(3, 2, 'W').set(4, 1, 'W').set(4, 2, 'a').set(10, 1, 'W').set(11, 2, 'W').set(10, 2, 'a');
  body.set(5, 5, 'K').set(9, 5, 'K').set(7, 6, 'a').set(6, 7, 'p').set(8, 7, 'p');
  body.rect(4, 8, 7, 1, 'R').set(7, 9, 'O').set(7, 10, 'y');
  body.rect(12, paw, 2, 3, 'W').set(12, paw + 3, 'W').set(13, paw, 'a');
  body.ellipse(7, 12, 2, 1, 'O').set(7, 12, 'Y');
  twinkle(fx, 1, 6, f, 'Y');
  twinkle(fx, 14, 12, f + 2, 'Y');
});
ITEMS.firstaid = item([
  '................',
  '......hhhh......',
  '.....h....h.....',
  '..hhhhhhhhhhhh..',
  '..hWWWWWWWWWWh..',
  '..hWWWWRRWWWWh..',
  '..hWWWWRRWWWWh..',
  '..hWWRRRRRRWWh..',
  '..hWWRRRRRRWWh..',
  '..hWWWWRRWWWWh..',
  '..hWWWWRRWWWWh..',
  '..hzzzzzzzzzzh..',
  '..hhhhhhhhhhhh..',
  '................',
  '................',
  '................',
], (body, fx, f) => {
  // 십자가 맥박처럼 뛴다.
  if (f === 1 || f === 2) for (let y = 5; y <= 10; y += 1) for (let x = 5; x <= 10; x += 1) if (body.get(x, y) === 'R') body.set(x, y, f === 1 ? 'A' : 'e');
  twinkle(fx, 14, 2, f, 'W');
  twinkle(fx, 1, 13, f + 2, 'a');
});
ITEMS.scrubber = item([], (body, fx, f) => {
  body.ellipse(7, 8, 6, 5, 'd').ellipse(7, 8, 5, 4, 'z');
  for (let curl = 0; curl < 14; curl += 1) {
    const angle = curl * 1.9 + f * 0.4;
    const reach = 1 + (curl % 4);
    body.set(7.5 + Math.cos(angle) * reach * 1.2, 8 + Math.sin(angle) * reach, curl % 3 === 0 ? 'W' : 'd');
  }
  const spikes = [[[0, 3], [15, 12]], [[1, 13], [14, 2]], [[0, 8], [15, 6], [7, 1]], [[14, 14], [2, 1]]][f];
  spikes.forEach(([x, y], index) => fx.set(x, y, index === 0 ? 'W' : 'E'));
  twinkle(fx, 11, 3, f + 1, 'W');
});
ITEMS.alarm = item([], (body, fx, f) => {
  const shake = [0, 1, 0, -1][f];
  const g = (x, y) => [x + shake, y];
  body.ellipse(...g(3, 3), 2, 2, 'O').ellipse(...g(12, 3), 2, 2, 'O').set(...g(3, 2), 'Y').set(...g(12, 2), 'Y');
  body.ellipse(...g(7, 9), 6, 6, 'u').ellipse(...g(7, 9), 5, 5, 'R').ellipse(...g(7, 9), 4, 4, 'W');
  body.line(...g(7, 9), ...g(7, 6), 'K').line(...g(7, 9), ...g(9, 10), 'K').set(...g(7, 9), 'R');
  body.set(...g(3, 15), 'h').set(...g(11, 15), 'h');
  if (f % 2 === 1) fx.set(0, 6, 'Y').set(0, 8, 'Y').set(15, 6, 'Y').set(15, 8, 'Y').set(1, 1, 'W').set(14, 0, 'W');
});
ITEMS.piggy = item([], (body, fx, f) => {
  body.ellipse(7, 10, 6, 4, 'A').ellipse(6, 9, 5, 3, 'a', 'A').ellipse(7, 10, 5, 3, 'A', 'a').ellipse(5, 8, 2, 1, 'a', 'A');
  body.set(4, 6, 'A').set(5, 5, 'A').set(10, 6, 'A').set(11, 5, 'A');
  body.rect(13, 9, 2, 2, 'A').set(14, 9, 'u').set(14, 10, 'u').set(10, 9, 'K');
  body.rect(6, 6, 3, 1, 'u');
  body.rect(3, 14, 2, 1, 'A').rect(9, 14, 2, 1, 'A');
  // 동전이 위에서 떨어져 등의 구멍으로 쏙 들어간다.
  const y = [0, 2, 4, 6][f];
  if (f < 3) fx.rect(6, y, 3, 2, 'O').set(7, y, 'Y').set(6, y, 'Y');
  if (f === 3) twinkle(fx, 7, 4, 2, 'Y');
});
ITEMS.lastcup = item([
  '................',
  '................',
  '................',
  '................',
  '..zzzzzzzzzzzz..',
  '..zWWWWWWWWWWz..',
  '...RRRRRRRRRR...',
  '...RWWWWWWWWR...',
  '...RWRRWWRRWR...',
  '...RWRRRRRRWR...',
  '...RWWRRRRWWR...',
  '....RWWRRWWR....',
  '....RRRRRRRR....',
  '.....uuuuuu.....',
  '................',
  '................',
], (body, fx, f) => {
  steam(fx, 5, 3, f, 4);
  steam(fx, 8, 3, f + 1, 4);
  steam(fx, 11, 3, f + 2, 4);
  // 궁지에 몰린 빛: 붉은 기운이 깜빡인다.
  if (f % 2 === 0) fx.set(1, 8, 'e').set(14, 8, 'e').set(1, 11, 'O').set(14, 11, 'O');
  else fx.set(0, 9, 'O').set(15, 9, 'O').set(2, 13, 'e').set(13, 13, 'e');
});
ITEMS.bigpot = item([
  '................',
  '................',
  '................',
  '.....hhhhhh.....',
  '..zzzzzzzzzzzz..',
  '.hzWWWWWWWWWWzh.',
  'hhdzzzzzzzzzzdhh',
  '..dzzzzzzzzzzd..',
  '..dzWzzzzzzzzd..',
  '..dzWzzzzzzzzd..',
  '..dzzzzzzzzzzd..',
  '..ddzzzzzzzzdd..',
  '...dddddddddd...',
  '................',
  '................',
  '................',
], (body, fx, f) => {
  // 뚜껑 틈으로 국물이 끓어 넘친다.
  const bubbles = [[[4, 3], [11, 2]], [[6, 2], [9, 3], [12, 1]], [[5, 1], [10, 2]], [[7, 2], [3, 2], [11, 3]]][f];
  bubbles.forEach(([x, y], index) => fx.set(x, y, index % 2 === 0 ? 'W' : 'O'));
  steam(fx, 2, 4, f, 3);
  steam(fx, 13, 4, f + 2, 3);
});
ITEMS.stopwatch = item([], (body, fx, f) => {
  body.rect(6, 0, 4, 2, 'd').rect(7, 2, 2, 1, 'h').set(12, 3, 'd').set(13, 2, 'd');
  body.ellipse(7, 9, 6, 6, 'h').ellipse(7, 9, 5, 5, 'z').ellipse(7, 9, 4, 4, 'W');
  [[7, 5], [11, 9], [7, 13], [3, 9]].forEach(([x, y]) => body.set(x, y, 'h'));
  const angle = (f / ITEM_FRAMES) * Math.PI * 2 - Math.PI / 2;
  body.line(7, 9, Math.round(7 + Math.cos(angle) * 3), Math.round(9 + Math.sin(angle) * 3), 'R').set(7, 9, 'K');
  twinkle(fx, 14, 6, f, 'W');
  twinkle(fx, 1, 14, f + 2, 'L');
});
ITEMS.dice = item([], (body, fx, f) => {
  // 굴러가며 면이 바뀐다.
  const tilt = [0, 1, 0, -1][f];
  body.rect(3, 3 + Math.abs(tilt), 10, 10, 'h').rect(4, 4 + Math.abs(tilt), 8, 8, 'W').rect(4, 11 + Math.abs(tilt), 8, 1, 'z');
  const top = 4 + Math.abs(tilt);
  const pips = [[[7.5, 3.5]], [[5, 1.5], [10, 5.5]], [[5, 1.5], [7.5, 3.5], [10, 5.5]], [[5, 1.5], [10, 1.5], [5, 5.5], [10, 5.5]]][f];
  pips.forEach(([x, y]) => body.rect(Math.round(x - 0.5), top + Math.round(y - 0.5), 2, 2, f === 0 ? 'R' : 'K'));
  twinkle(fx, 14, 2, f, 'Y');
  twinkle(fx, 1, 13, f + 2, 'W');
});
ITEMS.popcorn = item([
  '................',
  '................',
  '................',
  '................',
  '................',
  '...WRWRWRWRW....',
  '...WRWRWRWRW....',
  '....WRWRWRW.....',
  '....WRWRWRW.....',
  '....WRWRWRW.....',
  '....WRWRWRW.....',
  '.....WRWRW......',
  '.....hhhhh......',
  '................',
  '................',
  '................',
], (body, fx, f) => {
  [[4, 4], [6, 3], [8, 4], [10, 3], [5, 2], [9, 2], [7, 1]].forEach(([x, y]) => body.set(x, y, 'y').set(x + 1, y, 'W'));
  // 하나씩 펑 튀어 오른다.
  const pops = [[[3, 0]], [[12, 1], [2, 1]], [[13, 0], [1, 3]], [[11, 0], [14, 2]]][f];
  pops.forEach(([x, y]) => fx.set(x, y, 'y').set(x + 1, y, 'W').set(x, y + 1, 'W'));
  if (f === 1) fx.set(7, 0, 'O');
});
ITEMS.icetray = item([], (body, fx, f) => {
  body.rect(1, 6, 14, 7, 'q').rect(2, 7, 12, 5, 'l');
  for (let cube = 0; cube < 3; cube += 1) {
    const x = 2 + cube * 4;
    body.rect(x, 4 + (cube === f % 3 ? -1 : 0), 4, 4, 'i').set(x, 4 + (cube === f % 3 ? -1 : 0), 'W').rect(x + 3, 7, 1, 1, 'L');
  }
  twinkle(fx, 3, 1, f, 'W');
  twinkle(fx, 12, 2, f + 2, 'i');
  twinkle(fx, 15, 10, f + 1, 'W');
});
ITEMS.umbrella = item([], (body, fx, f) => {
  body.ellipse(7, 6, 7, 5, 'R').rect(0, 7, 16, 5, '.');
  body.ellipse(7, 6, 6, 4, 'a', 'R').ellipse(7, 7, 6, 4, 'R', 'a');
  [1, 4, 7, 10, 13].forEach((x) => body.set(x, 6, 'u'));
  body.line(7, 1, 7, 13, 'N').line(7, 13, 5, 14, 'N').set(4, 13, 'N');
  // 빗방울이 우산에 맞고 튄다.
  [[2, 0], [11, 0], [6, 0], [14, 1]].forEach(([x, y], index) => {
    const fall = (f + index) % ITEM_FRAMES;
    if (fall < 3) fx.set(x, y + fall * 0.7, 'L');
    else fx.set(x - 1, y + 1, 'W').set(x + 1, y + 1, 'W');
  });
});
ITEMS.waterbottle = item([
  '.....hBBh.......',
  '.....hBBh.......',
  '....hzzzzh......',
  '...hLLLLLLh.....',
  '...hLiLLLLh.....',
  '...hLiLLLLh.....',
  '...hLLLLLLh.....',
  '...hLLLLLLh.....',
  '...hLLLLLLh.....',
  '...hLLLLLLh.....',
  '...hLLLLLLh.....',
  '...hLLLLLLh.....',
  '...hLLLLLLh.....',
  '....hhhhhh......',
  '................',
  '................',
], (body, fx, f) => {
  // 물이 출렁인다.
  const level = 6;
  for (let y = level; y <= 12; y += 1) for (let x = 4; x <= 9; x += 1) body.set(x, y, 'B');
  const wave = [[4, 5], [6, 5], [8, 5]];
  wave.forEach(([x], index) => body.set(x + (f % 2), level - ((index + f) % 2), 'b'));
  body.set(5, 8, 'b').set(5, 9, 'l');
  twinkle(fx, 12, 3, f, 'W');
  twinkle(fx, 1, 10, f + 2, 'L');
});
ITEMS.scooter = item([], (body, fx, f) => {
  body.line(11, 1, 11, 11, 'D').rect(9, 1, 4, 1, 'h').line(3, 11, 12, 11, 'R').line(3, 12, 12, 12, 'u');
  [[3, 13], [11, 13]].forEach(([x, y]) => {
    body.ellipse(x, y, 2, 2, 'h').set(x, y, 'z');
    const spin = (f / ITEM_FRAMES) * Math.PI * 2;
    body.set(Math.round(x + Math.cos(spin) * 1.4), Math.round(y + Math.sin(spin) * 1.4), 'W');
  });
  // 바람을 가르며 달린다.
  [[3, 0], [6, 2], [9, 1]].forEach(([y, length], index) => {
    const slide = (f + index) % ITEM_FRAMES;
    for (let step = 0; step <= length; step += 1) fx.set(1 - slide + step + index, 3 + y, step === length ? 'W' : 'L');
  });
});
ITEMS.firecracker = item([
  '................',
  '................',
  '................',
  '.......K........',
  '......uRRu......',
  '......RaRR......',
  '......RaRR......',
  '......RYYR......',
  '......RRRR......',
  '......RaRR......',
  '......RaRR......',
  '......RYYR......',
  '......RRRR......',
  '......uuuu......',
  '................',
  '................',
], (body, fx, f) => {
  // 심지가 타들어 가며 불꽃이 튄다.
  const sparks = [[[7, 2, 'Y'], [8, 1, 'O']], [[6, 1, 'Y'], [8, 2, 'W'], [9, 0, 'O']], [[7, 1, 'W'], [5, 0, 'O'], [9, 2, 'Y']],
    [[8, 1, 'Y'], [6, 2, 'O'], [10, 1, 'W']]][f];
  sparks.forEach(([x, y, ch]) => fx.set(x, y, ch));
  twinkle(fx, 2, 4, f, 'O');
  twinkle(fx, 13, 9, f + 2, 'Y');
});
ITEMS.lamp = item([], (body, fx, f) => {
  body.rect(1, 6, 14, 3, 'W').rect(1, 6, 14, 1, 'i').rect(0, 6, 1, 3, 'z').rect(15, 6, 1, 3, 'z');
  body.rect(4, 3, 1, 3, 'D').rect(11, 3, 1, 3, 'D').rect(3, 2, 10, 1, 'D');
  // 깜빡깜빡 빛줄기가 아래로 쏟아진다.
  const lit = f !== 2;
  if (lit) {
    for (let ray = 0; ray < 5; ray += 1) {
      const x = 2 + ray * 3;
      for (let y = 10; y < 10 + 2 + ((ray + f) % 3); y += 1) fx.set(x, y, y === 10 ? 'y' : 'Y');
    }
  } else {
    body.rect(1, 7, 14, 2, 'z');
  }
});
ITEMS.mallet = item([], (body, fx, f) => {
  // 내려쳤다 들었다 한다.
  const down = f === 1 || f === 2;
  if (down) {
    body.rect(1, 9, 9, 5, 'h').rect(2, 10, 7, 3, 'R').rect(2, 10, 7, 1, 'a').line(9, 11, 15, 11, 'N').line(9, 12, 15, 12, 'n');
    fx.set(0, 15, 'W').set(10, 15, 'W').set(1, 14, 'Y').set(9, 14, 'Y');
  } else {
    body.rect(2, 1, 6, 8, 'h').rect(3, 2, 4, 6, 'R').rect(3, 2, 1, 6, 'a').line(5, 9, 11, 15, 'N').line(6, 9, 12, 15, 'n');
  }
  twinkle(fx, 13, 2, f, 'Y');
});
// 공속 20점 전용 패시브: 금속 스프링과 가벼운 기어.
ITEMS.precision = item([], (body, fx, f) => {
  const shift = f === 1 || f === 2 ? 1 : 0;
  body.rect(4, 2, 8, 2, 'D').rect(5, 2, 6, 1, 'i');
  for (let y = 4; y < 12; y += 3) {
    body.line(4, y, 11, y + 1 + shift, 'z').line(11, y + 1 + shift, 4, y + 3, 'B');
  }
  body.rect(4, 13, 8, 2, 'D').rect(5, 13, 6, 1, 'i');
  twinkle(fx, 13, 3, f, 'E');
});
ITEMS.lightgear = item([], (body, fx, f) => {
  body.ellipse(8, 8, 5, 5, 'O').ellipse(8, 8, 4, 4, 'Y').ellipse(8, 8, 2, 2, 'q');
  const diagonal = f % 2;
  for (let index = 0; index < 8; index += 1) {
    const angle = (index + diagonal / 2) * Math.PI / 4;
    body.rect(Math.round(7 + Math.cos(angle) * 6), Math.round(7 + Math.sin(angle) * 6), 2, 2, 'O');
  }
  body.set(7, 7, 'i');
  twinkle(fx, 1, 2, f, 'Y');
});
ITEMS.counterweight = item([], (body, fx, f) => {
  const lean = [0, 1, 0, -1][f];
  body.rect(7, 3, 2, 11, 'z').rect(4, 13, 8, 2, 'D');
  body.line(2, 5 - lean, 13, 5 + lean, 'O');
  body.line(3, 5 - lean, 3, 9 - lean, 'z').line(12, 5 + lean, 12, 9 + lean, 'z');
  body.rect(1, 9 - lean, 5, 3, 'B').rect(10, 9 + lean, 5, 3, 'B');
  body.line(1, 9 - lean, 5, 9 - lean, 'i').line(10, 9 + lean, 14, 9 + lean, 'i');
  twinkle(fx, 12, 1, f, 'Y');
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
  body.rect(1, 5, 8, 7, 'h').rect(2, 6, 6, 5, 'q').rect(2, 6, 6, 1, 'b');
  body.rect(5, 3, 4, 11, 'h').rect(6, 4, 2, 9, 'z');
  body.rect(7, 5, 3, 7, 'E').rect(8, 6, 2, 5, 'W');
  body.rect(2, 11, 3, 4, 'h').rect(3, 12, 1, 2, 'D');
  const half = 1 + f;
  fx.rect(10, 8 - half, 6, half * 2 + 1, 'E').rect(10, 7, 6, 3, 'W');
  twinkle(fx, 13, 3, f, 'E');
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
ITEMS.bleachbot = item([], (body, fx, frame) => drawMarine(body, fx, frame, true));
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
ITEMS.mopstorm = item([], (body, fx, f) => {
  // 물걸레가 빙글빙글 돌며 물방울을 튀긴다.
  const spin = (f / ITEM_FRAMES) * Math.PI * 2;
  for (let reach = 1; reach <= 6; reach += 1) {
    body.set(7.5 + Math.cos(spin) * reach, 7.5 + Math.sin(spin) * reach, 'N');
    body.set(7.5 + Math.cos(spin + Math.PI) * reach, 7.5 + Math.sin(spin + Math.PI) * reach, reach > 3 ? 'T' : 'N');
  }
  body.ellipse(7, 7, 2, 2, 'T').set(7, 7, 'W');
  for (let swirl = 0; swirl < 12; swirl += 1) {
    const angle = spin + (swirl / 12) * Math.PI * 2;
    fx.set(7.5 + Math.cos(angle) * 7, 7.5 + Math.sin(angle) * 7, swirl % 3 === 0 ? 'W' : 'l');
  }
});
ITEMS.bomber = item([], (body, fx, f) => {
  const bob = [0, -1, 0, 1][f];
  body.line(0, 8 + bob, 10, 3 + bob, 'W').line(0, 8 + bob, 6, 11 + bob, 'W').line(6, 11 + bob, 10, 3 + bob, 'W').line(0, 8 + bob, 10, 3 + bob, 'z');
  body.rect(9, 9, 6, 5, 'R').rect(10, 10, 4, 3, 'u').set(10, 10, 'R').set(12, 10, 'R').set(11, 11, 'R').set(13, 11, 'R').line(12, 14, 12, 15, 'N');
  if (f === 1 || f === 2) fx.set(8, 14, 'W').set(15, 8, 'W').set(15, 15, 'Y');
  twinkle(fx, 2, 1, f, 'Y');
});
ITEMS.foammine = item([
  '................',
  '................',
  '................',
  '................',
  '................',
  '......zzzzzz....',
  '.....z......z...',
  '..nnnznnnnnnznn.',
  '.nNNNzNNNNNNzNNn',
  '.nNNNNNNNNNNNNNn',
  '.nNNNNNYYyNNNNNn',
  '..nnnnnnnnnnnnn.',
  '................',
  '................',
  '................',
  '................',
], (body, fx, f) => {
  // 거품이 사방으로 터져 나간다.
  const r = [2, 4, 6, 7][f];
  for (let bubble = 0; bubble < 6; bubble += 1) {
    const angle = (bubble / 6) * Math.PI * 2 + 0.3;
    const x = 7.5 + Math.cos(angle) * r;
    const y = 8 + Math.sin(angle) * r * 0.8;
    fx.set(x, y, 'W').set(x + 1, y, 'V').set(x, y + 1, 'V');
  }
});
ITEMS.dryoven = item([
  '................',
  '................',
  '.hhhhhhhhhhhhhh.',
  '.hzzzzzzzzzzzzh.',
  '.hzKKKKKKKKzddh.',
  '.hzKeeeeeeKzdKh.',
  '.hzKeOOOOeKzddh.',
  '.hzKeOYYOeKzdKh.',
  '.hzKeeeeeeKzddh.',
  '.hzKKKKKKKKzRdh.',
  '.hzzzzzzzzzzzzh.',
  '.hhhhhhhhhhhhhh.',
  '..h..........h..',
  '................',
  '................',
  '................',
], (body, fx, f) => {
  // 뜨거운 기운이 두 겹으로 올라온다.
  steam(fx, 4, 1, f, 2);
  steam(fx, 11, 1, f + 2, 2);
  body.set(6 + (f % 2), 7, 'W');
  if (f % 2) fx.set(0, 6, 'e').set(15, 8, 'e');
});
ITEMS.shockshower = item([
  '..........hhh...',
  '.........hzzh...',
  '........hzzh....',
  '...hhhhhhzh.....',
  '..hzzzzzzh......',
  '..hEEEEEEh......',
  '...hhhhhh.......',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
], (body, fx, f) => {
  [3, 5, 7, 9].forEach((x, lane) => {
    for (let drop = 0; drop < 2; drop += 1) fx.set(x - 1, 8 + ((f + lane + drop * 4) % 6), drop === 0 ? 'E' : 'l');
  });
  // 바닥에서 전기가 튄다.
  const bolts = [[[2, 14], [3, 13], [4, 14]], [[8, 15], [9, 14], [10, 15], [11, 14]], [[12, 13], [13, 14], [14, 13]], [[5, 15], [6, 14]]][f];
  bolts.forEach(([x, y], index) => fx.set(x, y, index % 2 ? 'W' : 'Y'));
});
ITEMS.ramen = ITEMS.heal;
// 피해를 주는 보물 2와 보물 전용 패시브
ITEMS.outlet = item([
  '................',
  '................',
  '..WWWWWWWWWWWW..',
  '.WzzzzzzzzzzzzW.',
  '.WzWWWzWWWzWWWW.',
  '.WzWDWzWDWzWDWW.',
  '.WzWDWzWDWzWDWW.',
  '.WzWWWzWWWzWWWW.',
  '.WzzzzzzzzzzRzW.',
  '..WWWWWWWWWWWW..',
  '.............D..',
  '.............D..',
  '............DD..',
  '...........D....',
  '................',
  '................',
], (body, fx, f) => {
    // 전기가 찌릿: 콘센트 위로 번개가 튄다.
    if (f % 2 === 0) [[3, 0], [4, 1], [3, 1]].forEach(([x, y]) => fx.set(x + f, y, 'O'));
    else [[9, 0], [10, 1], [9, 1]].forEach(([x, y]) => fx.set(x, y, 'Y'));
    body.set(13, 8, f % 2 ? 'R' : 'e');
  });
ITEMS.glove = item([
  '................',
  '....YYYYYY......',
  '...YOOOOOOY.....',
  '..YOyOOOOOOY....',
  '..YOOOOOOOOOY...',
  '..YOOOOOOOOOOY..',
  '..YOOOOOOOOOOY..',
  '..YOOOOOOOOOY...',
  '...YOOOOOOOY....',
  '...YoooooooY....',
  '....YOOOOOY.....',
  '....YOOOOOY.....',
  '....YWWWWWY.....',
  '....YYYYYYY.....',
  '................',
  '................',
], (body, fx, f) => {
    // 퍽! 주먹 앞으로 충격선
    [[14, 3], [15, 5], [14, 7]].forEach(([x, y], index) => { if ((index + f) % 2 === 0) fx.set(x, y, 'W'); });
    twinkle(fx, 1, 12, f, 'Y');
  });
ITEMS.match = item([
  '................',
  '.......ee.......',
  '......eOOe......',
  '......eOye......',
  '.......RR.......',
  '......rRRr......',
  '.......nn.......',
  '.......nn.......',
  '.......nn.......',
  '.......nn.......',
  '.......nn.......',
  '.......nn.......',
  '.......nn.......',
  '.......NN.......',
  '................',
  '................',
], (body, fx, f) => {
    // 불꽃이 일렁인다.
    const tip = [[7, 0], [8, 0], [6, 1], [9, 1]][f];
    fx.set(tip[0], tip[1], f % 2 ? 'O' : 'Y');
    steam(fx, 10, 1, f, 2);
  });
ITEMS.top = item([
  '................',
  '.......DD.......',
  '.......DD.......',
  '....AAAAAAAA....',
  '...AaaaaaaaaA...',
  '..AYYYYYYYYYYA..',
  '..AEEEEEEEEEEA..',
  '...AAAAAAAAAA...',
  '....AaaaaaaA....',
  '.....AaaaaA.....',
  '......AaaA......',
  '.......AA.......',
  '.......DD.......',
  '................',
  '................',
  '................',
], (body, fx, f) => {
    // 빙글빙글: 띠 무늬가 돌고, 바닥에 회오리
    for (let x = 3; x <= 12; x += 1) if ((x + f) % 4 === 0) body.set(x, 5, 'W');
    [[4, 13], [11, 13], [6, 14], [9, 14]].forEach(([x, y], index) => { if ((index + f) % 2) fx.set(x, y, 'z'); });
  });
ITEMS.purifier = item([
  '.....llllll.....',
  '....lLLLLLLl....',
  '....lLiiiiLl....',
  '....lLiiiiLl....',
  '.....llllll.....',
  '....WWWWWWWW....',
  '...WzzzzzzzzW...',
  '...WzBBzzRRzW...',
  '...WzzzzzzzzW...',
  '...WzzzzzzzzW...',
  '...WzzWDDWzzW...',
  '...WzzWDDWzzW...',
  '...WzzzzzzzzW...',
  '...WWWWWWWWWW...',
  '................',
  '................',
], (body, fx, f) => {
    // 얼음 조각이 튄다.
    [[1, 4], [14, 4], [1, 10], [14, 10]].forEach(([x, y], index) => { if ((index + f) % 2 === 0) fx.set(x, y, index % 2 ? 'E' : 'i'); });
    twinkle(fx, 8, 2, f, 'W');
  });
ITEMS.windup = item([
  '................',
  '...ff....ff.....',
  '..fFFf..fFFf....',
  '..fFyFffFyFf....',
  '..fFFFFFFFFf....',
  '...ffFFFFff.....',
  '.....fFFf.......',
  '.....fFFf.......',
  '.....fFFf.......',
  '.....fFFf.......',
  '.....fFFfff.....',
  '.....fFFFFf.....',
  '.....fFFfff.....',
  '.....fFFfff.....',
  '.....fFFFFf.....',
  '......ffff......',
], (body, fx, f) => {
    // 태엽을 감는다.
    [[12, 2], [13, 4], [12, 6], [11, 4]].forEach(([x, y], index) => { if (index === f) fx.set(x, y, 'W'); });
    twinkle(fx, 2, 9, f, 'Y');
  });
// 피해를 주는 보물과 광택제
ITEMS.pas = item([
  '................',
  '......gggg......',
  '.....gGGGGg.....',
  '......zzzz......',
  '.....WWWWWW.....',
  '....WwwwwwwW....',
  '....WGGGGGGW....',
  '....WGWWWWGW....',
  '....WGWGGWGW....',
  '....WGWWWWGW....',
  '....WGGGGGGW....',
  '....WwwwwwwW....',
  '....WWWWWWWW....',
  '.....wwwwww.....',
  '................',
  '................',
], (body, fx, f) => {
    // 시원하게 화끈: 스펀지 위로 김이 오른다.
    steam(fx, 6, 0, f, 2);
    steam(fx, 9, 0, f + 2, 2);
    twinkle(fx, 13, 6, f, 'E');
  });
ITEMS.heatpad = item([
  '................',
  '................',
  '................',
  '.RRRRRRRRRRRRRR.',
  '.RaaaaaaaaaaaaR.',
  '.RaOOOOOOOOOOaR.',
  '.RaaaaaaaaaaOaR.',
  '.RaOOOOOOOOOOaR.',
  '.RaOaaaaaaaaaaR.',
  '.RaOOOOOOOOOOaR.',
  '.RaaaaaaaaaaaaR.',
  '.RRRRRRRRRRRRRR.',
  '...........DD...',
  '............DDD.',
  '..............D.',
  '................',
], (body, fx, f) => {
    // 열선이 차례로 달아오르고, 위로 아지랑이가 피어오른다.
    for (let y = 5; y <= 9; y += 1) {
      for (let x = 3; x <= 12; x += 1) if (body.get(x, y) === 'O' && (x + y + f) % 4 === 0) body.set(x, y, 'e');
    }
    steam(fx, 4, 2, f, 3);
    steam(fx, 8, 2, f + 1, 3);
    steam(fx, 12, 2, f + 2, 3);
  });
ITEMS.freshener = item([
  '................',
  '.......DD.......',
  '......DddD......',
  '......DDDD......',
  '.....VVVVVV.....',
  '.....VvVVVV.....',
  '.....VWWWWV.....',
  '.....VWaaWV.....',
  '.....VWAaWV.....',
  '.....VWWWWV.....',
  '.....VvVVVV.....',
  '.....VvVVVV.....',
  '.....VVVVVV.....',
  '......vvvv......',
  '................',
  '................',
], (body, fx, f) => {
    // 노즐에서 향기가 퍼져 나간다.
    [[10, 2], [12, 1], [13, 3], [11, 0], [14, 2]].forEach(([x, y], index) => {
      if ((index + f) % 3 !== 0) fx.set(x, y, index % 2 ? 'a' : 'V');
    });
    twinkle(fx, 3, 7, f, 'a');
  });
ITEMS.clothespin = item([
  '................',
  '.....nN..Nn.....',
  '.....nN..Nn.....',
  '.....nN..Nn.....',
  '.....nN..Nn.....',
  '.....nNddNn.....',
  '.....nzzzzn.....',
  '.....nNddNn.....',
  '.....nN..Nn.....',
  '....nN....Nn....',
  '....nN....Nn....',
  '...nN......Nn...',
  '...nN......Nn...',
  '...NN......NN...',
  '................',
  '................',
], (body, fx, f) => {
    // 콱 무는 순간 반짝인다.
    twinkle(fx, 8, 12, f, 'Y');
    if (f === 2) fx.set(6, 13, 'W').set(9, 13, 'W');
  });
ITEMS.polish = item([
  '................',
  '.......DD.......',
  '......DddD......',
  '.......zz.......',
  '.....YYYYYY.....',
  '....YyyyyyyY....',
  '....YyOOOOyY....',
  '....YyOWWOyY....',
  '....YyOOOOyY....',
  '....YyyyyyyY....',
  '....YyyyyyyY....',
  '....YYYYYYYY....',
  '..bbbbbb........',
  '.bllllllb.......',
  '..bbbbbb........',
  '................',
], (body, fx, f) => {
    twinkle(fx, 13, 3, f);
    twinkle(fx, 2, 6, f + 2);
    twinkle(fx, 12, 12, f + 1, 'W');
  });


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

// 세탁기 괴물: 하얀 상자, 둥근 문 안에서 물이 돈다. 문 위에 화난 눈썹과 눈
function washer(frame) {
  const g = canvasGrid(34, 38);
  g.rect(3, 2, 28, 33, 'P').rect(3, 2, 28, 7, 'w').rect(4, 3, 26, 1, 'W');
  g.rect(5, 4, 8, 3, 'z').rect(6, 5, 6, 1, 'E').set(26, 5, 'R').set(23, 5, 'G').ellipse(20, 5, 1, 1, 'd');
  g.rect(3, 9, 28, 1, 'p');
  // 문
  g.ellipse(17, 22, 11, 11, 'd').ellipse(17, 22, 9, 9, 'z').ellipse(17, 22, 7, 7, 'B');
  for (let drop = 0; drop < 14; drop += 1) {
    const angle = (frame ? 0.45 : 0) + (drop / 14) * Math.PI * 2;
    g.set(17 + Math.cos(angle) * (3 + (drop % 3)), 22 + Math.sin(angle) * (3 + (drop % 3)), drop % 2 ? 'l' : 'W');
  }
  g.ellipse(17, 22, 2, 2, 'b').set(13, 18, 'W').set(14, 17, 'W');
  // 화난 얼굴은 문 유리 위에
  g.rect(12, 20, 3, 2, 'W').set(13, 21, 'K').rect(20, 20, 3, 2, 'W').set(21, 21, 'K');
  g.line(11, 18, 15, 19, 'K').line(23, 18, 19, 19, 'K');
  g.rect(14, 26, 7, 1, 'K').set(14, 25, 'K').set(20, 25, 'K');
  // 발
  g.rect(5, 35, 4, 2, 'h').rect(25, 35, 4, 2, 'h');
  if (frame) g.set(2, 12, 'l').set(32, 14, 'l').set(1, 20, 'W');
  return g.rows();
}

// 전기밥솥: 둥글고 분홍빛, 위에 증기 구멍, 앞에 빨간 숫자 화면과 화난 얼굴
function riceCooker(frame) {
  const g = canvasGrid(36, 32);
  g.ellipse(18, 18, 15, 12, 'a').ellipse(18, 19, 15, 11, 'W', 'a').ellipse(18, 9, 13, 5, 'a').ellipse(18, 8, 11, 3, 'A', 'a');
  g.rect(16, 2, 4, 3, 'D').rect(17, 1, 2, 1, 'd');
  g.rect(3, 15, 2, 6, 'z').rect(31, 15, 2, 6, 'z');
  g.rect(12, 21, 12, 5, 'h').rect(13, 22, 10, 3, 'K');
  [[14, 22], [15, 22], [14, 23], [14, 24], [15, 24], [17, 22], [18, 22], [18, 23], [17, 24], [18, 24], [20, 22], [21, 22], [21, 23], [21, 24]]
    .forEach(([x, y]) => g.set(x, y, frame ? 'R' : 'e'));
  g.rect(10, 14, 4, 3, 'W').rect(11, 15, 2, 2, 'K').rect(22, 14, 4, 3, 'W').rect(23, 15, 2, 2, 'K');
  g.line(9, 12, 14, 14, 'K').line(27, 12, 22, 14, 'K');
  g.rect(12, 27, 12, 1, 'p').rect(8, 29, 5, 2, 'h').rect(23, 29, 5, 2, 'h');
  return g.rows();
}

// 곰팡이 여왕: 커다란 초록 덩어리에 점박이, 왕관, 흘러내리는 끈적이
function moldQueen(frame) {
  const g = canvasGrid(40, 36);
  const squash = frame ? 1 : 0;
  g.ellipse(20, 21 + squash, 17, 12 - squash, 'm').ellipse(20, 20 + squash, 16, 11 - squash, 'M');
  g.ellipse(14, 15, 4, 2, 'g', 'M').ellipse(29, 24, 3, 2, 'g', 'M').ellipse(9, 24, 2, 2, 'm', 'M').ellipse(26, 14, 2, 1, 'm', 'M');
  [[6, 31], [12, 33], [27, 33], [33, 31]].forEach(([x, y]) => g.line(x, y - 2, x, y + squash, 'm').set(x, y + 1 + squash, 'g'));
  g.rect(12, 18, 5, 4, 'W').rect(14, 19, 2, 3, 'K').rect(23, 18, 5, 4, 'W').rect(24, 19, 2, 3, 'K');
  g.line(11, 16, 17, 18, 'K').line(29, 16, 23, 18, 'K');
  g.rect(16, 25, 8, 2, 'K').set(17, 25, 'W').set(22, 25, 'W');
  g.rect(13, 6, 14, 3, 'O').rect(13, 8, 14, 1, 'o');
  [13, 17, 20, 23, 26].forEach((x) => g.set(x, 5, 'O').set(x, 4, 'O'));
  g.set(13, 3, 'Y').set(20, 3, 'Y').set(26, 3, 'Y').set(17, 7, 'R').set(23, 7, 'b');
  return g.rows();
}

ART.washerA = washer(0);
ART.washerB = washer(1);
ART.riceCookerA = riceCooker(0);
ART.riceCookerB = riceCooker(1);
ART.moldQueenA = moldQueen(0);
ART.moldQueenB = moldQueen(1);
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
