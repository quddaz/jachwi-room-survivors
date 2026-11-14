// 숫자는 모두 여기서 바꾼다. 시간 단위는 초, 거리는 월드 픽셀이다.
export const ARENA = { width: 3000, height: 3000 };

// 능력치 투자. 게임을 시작할 때 모두 같은 30점을 네 파트에 나눈다(파트당 최대 20).
// 포인트마다 오르는 기본 수치는 작고, 핵심은 5·10·20점에 열리는 능력이다.
// 같은 점수에 효율도 조금씩 올라 20점이면 기본 수치가 1.4배가 된다.
export const BUILD_POINTS = 30;
export const BUILD_MAX = 20;
export const BUILD_STEPS = [[5, 0.1], [10, 0.1], [20, 0.2]];
export const BUILD = {
  crit: { label: '치명', icon: 'clover', per: { critChance: 0.004, critDamage: 0.015 },
    perks: {
      5: { name: '약점 포착', text: '보스·정예에게 치명타 확률 +10%', eliteCrit: 0.1 },
      10: { name: '치명 폭발', text: '치명타로 쓰러뜨린 적이 터져 주변에 그 피해의 40%', blastShare: 0.4, blastRadius: 70 },
      20: { name: '급소 마스터', text: '치명타 피해 +50%, 치명타 맞은 적 0.8초 기절(보스 제외)', critDamage: 0.5, stun: 0.8 },
    } },
  haste: { label: '공속', icon: 'battery', per: { attackSpeed: 0.005 },
    perks: {
      5: { name: '레벨업 질주', text: '레벨업하면 5초 동안 공격 속도 +40%', rushSec: 5, rush: 0.4 },
      10: { name: '큰 손', text: '투사체 크기 +20%, 공격 범위 +10%', projectile: 0.2, area: 0.1 },
      20: { name: '과충전', text: '공격 속도 +10%, 8초마다 3초 동안 공격 속도 1.5배, 고정 피해 패시브 해금', attackSpeed: 0.1, everySec: 8, burstSec: 3, burst: 0.5 },
    } },
  survival: { label: '생존', icon: 'vitamin', per: { maxHp: 1, armor: 0.0025 },
    perks: {
      5: { name: '잘 먹고 잘 자기', text: '초당 회복 +1', regen: 1 },
      10: { name: '맷집', text: '맞은 뒤 무적 +0.4초, 받는 피해 -10%', guardSec: 0.4, armor: 0.1 },
      20: { name: '불사조 오리', text: '한 번 쓰러져도 체력 50%로 부활', revive: 0.5 },
    } },
  // 보물 피해는 폭죽, 팝콘 기계, 물파스처럼 보물이 직접 주는 피해다.
  treasure: { label: '보물', icon: 'chest', per: { relicPower: 0.02, relicHaste: 0.01 },
    perks: {
      5: { name: '보물 하나 더', text: '시작할 때 보물을 하나 더 골라요', relics: 1 },
      10: { name: '반짝반짝', text: '보물 피해 +30%, 보물 발동 주기 -30%', relicPower: 0.3, relicHaste: 0.3 },
      20: { name: '보물 사냥꾼', text: '보물 6칸, 공격 보물과 보물 패시브가 나와요. 대신 무기는 2칸', maxRelics: 3, offers: 1, maxWeapons: 1 },
    } },
};

// 그 파트에 투자한 점수에 따른 효율 배율(1, 1.1, 1.2, 1.4)
export function buildEfficiency(points) {
  return 1 + BUILD_STEPS.reduce((sum, [at, bonus]) => sum + (points >= at ? bonus : 0), 0);
}

// 저장된 배분을 믿지 않고 0~20 정수, 합계 30 이하로 맞춘다.
export function normalizeBuild(build = {}) {
  let left = BUILD_POINTS;
  return Object.fromEntries(Object.keys(BUILD).map((tree) => {
    const points = Math.max(0, Math.min(BUILD_MAX, left, Math.floor(Number(build[tree]) || 0)));
    left -= points;
    return [tree, points];
  }));
}

// 맵. 바닥 타일만 다르고 규칙은 같아서 순위는 맵과 상관없이 함께 매긴다.
// swatch는 시작 화면의 맵 고르기 버튼 색이다.
export const MAPS = {
  room: { label: '자취방', description: '삐걱이는 마룻바닥', swatch: ['#ecd3ad', '#d2b185'] },
  bathroom: { label: '욕실', description: '하얀 타일과 하늘색 줄눈', swatch: ['#f4fbff', '#9fc9e6'] },
  kitchen: { label: '부엌', description: '크림·민트 체크무늬 장판', swatch: ['#fff1d6', '#9ed3b8'] },
  rooftop: { label: '옥상', description: '초록 방수 페인트 타일', swatch: ['#6fae7a', '#4f8a5c'] },
};

// regen은 아무것도 없어도 1초에 차는 체력이다. 비타민의 회복력은 여기에 더해진다.
// critDamage는 치명타가 날 때 피해 배율이다. 치명타 확률은 네잎클로버로만 생긴다.
// maxHitShare: 한 번에 받는 피해는 최대 체력의 이 비율을 넘지 않는다. 후반에도 한 방에 쓰러지지 않게 한다.
export const PLAYER = { speed: 200, maxHp: 100, regen: 1, critDamage: 1.5, radius: 16, pickupRadius: 90, invulnerableSec: 0.6,
  maxHitShare: 0.4 };

// 시간이 갈수록 끝없이 세진다. 정해진 끝은 없지만, 14분부터는 벽처럼 세져서 20분 안팎이 한계다.
export function difficultyAt(time) {
  const minutes = time / 60;
  // 6분부터는 보물과 합체 무기까지 갖춘 오리를 상대해야 해서 훨씬 가파르게 세진다.
  const late = Math.max(0, minutes - 6);
  // 14분부터는 벽: 체력이 크게 뛰고, 한 번에 깎이는 체력 상한도 커진다.
  const wall = Math.max(0, minutes - 14);
  return {
    hp: 1 + minutes * 0.45 + minutes * minutes * 0.09 + late * 1.2 + late * late * 0.45 + late * late * late * 0.05 + wall * wall * wall * 1.5,
    damage: 1.3 + minutes * 0.3 + minutes * minutes * 0.025 + late * 0.5 + wall * 1.5,
    speed: 1 + Math.min(0.45, minutes * 0.04) + Math.min(0.25, late * 0.03) + wall * 0.04,
    spawnPerSec: Math.min(46 + wall * 6, 1.4 + minutes * 1.8 + minutes * minutes * 0.3 + late * 1.8),
    maxEnemies: Math.min(640, 110 + Math.floor(minutes * 65)),
    // 한 번에 깎이는 체력 상한(최대 체력 대비). 14분 이후 1분마다 8%씩 커진다.
    hitShare: Math.min(0.9, PLAYER.maxHitShare + wall * 0.08),
  };
}

export const ENEMIES = {
  roach: { label: '바퀴벌레', description: '빠르고 많다', hp: 7, speed: 72, radius: 10, damage: 5, xp: 1, from: 0, weight: 10 },
  trash: { label: '쓰레기봉투', description: '느리고 단단하다. 쓰러지면 쓰레기 조각 둘로 갈라진다', hp: 34, speed: 44, radius: 19, damage: 10, xp: 3, from: 25, weight: 4 },
  scrap: { label: '쓰레기 조각', description: '쓰레기봉투가 갈라져 나온다. 빠르다', hp: 6, speed: 82, radius: 9, damage: 5, xp: 1, from: Infinity, weight: 0 },
  rust: { label: '녹물 방울', description: '거리를 두고 녹물을 쏜다', hp: 16, speed: 58, radius: 13, damage: 7, xp: 2, from: 50, weight: 2,
    range: 230, shootEverySec: 3.2, shotSpeed: 160, shotDamage: 6 },
  mold: { label: '곰팡이', description: '쓰러진 자리에 밟으면 느려지는 곰팡이 자국을 남긴다', hp: 22, speed: 36, radius: 15, damage: 8, xp: 2, from: 80, weight: 3,
    slimeSec: 5, slimeRadius: 44, slow: 0.45 },
  fly: { label: '날파리 떼', description: '아주 빠르고 약하다', hp: 4, speed: 140, radius: 7, damage: 4, xp: 1, from: 150, weight: 5 },
  // 지그재그로 날아와 맞히기 어렵다.
  mosquito: { label: '모기', description: '지그재그로 날아와 맞히기 어렵다', hp: 5, speed: 125, radius: 7, damage: 4, xp: 1, from: 110, weight: 4, sway: 0.9 },
  // 웅크렸다가 한 번에 뛰어든다.
  spider: { label: '거미', description: '웅크렸다가 한 번에 뛰어든다', hp: 20, speed: 50, radius: 12, damage: 9, xp: 2, from: 140, weight: 3,
    leapEverySec: 2.4, crouchSec: 0.4, leapSec: 0.4, leapSpeed: 4.2, leapRange: 300 },
  // 가까이 오면 멈춰서 부풀다가 터진다. 터질 자리를 미리 보여 준다.
  // 가까이 오면 부풀다가 터지고, 쓰러져도 그 자리에서 조금 뒤 터진다.
  milk: { label: '상한 우유', description: '가까이 오면 부풀다가 터진다. 쓰러져도 잠시 뒤 터진다', hp: 26, speed: 62, radius: 13, damage: 6, xp: 3, from: 180, weight: 2,
    fuseRange: 85, fuseSec: 0.9, blastRadius: 72, blastDamage: 14, deathFuseSec: 0.6 },
  // 빠르고 단단하다.
  mouse: { label: '생쥐', description: '빠르고 단단하다', hp: 55, speed: 98, radius: 13, damage: 11, xp: 4, from: 220, weight: 2 },
  // 거리를 두고 세 갈래로 가루를 쏜다.
  // 탄막이 겹치면 감당이 안 돼서 드물게 나오고, 한 번에 여섯 마리까지만 있다.
  moth: { label: '나방', description: '거리를 두고 세 갈래로 가루를 쏜다. 드물게 나온다', hp: 18, speed: 66, radius: 11, damage: 6, xp: 3, from: 260, weight: 0.5, maxAlive: 6,
    range: 260, shootEverySec: 3.6, shotSpeed: 150, shotDamage: 6, spread: 0.3, sway: 0.35 },
  // 다섯 마리씩 무리 지어 나온다.
  ant: { label: '개미 떼', description: '다섯 마리씩 무리 지어 몰려온다', hp: 3, speed: 105, radius: 6, damage: 3, xp: 1, from: 200, weight: 2, group: 5 },
  // 지나간 자리에 밟으면 느려지는 점액을 남긴다.
  slug: { label: '민달팽이', description: '느리고 질기다. 지나간 자리에 미끄러운 점액을 남긴다', hp: 60, speed: 28, radius: 14, damage: 8, xp: 4,
    from: 240, weight: 2, trailEverySec: 0.7, trailRadius: 26, trailSec: 4 },
  // 가까이 있으면 냄새로 계속 피해를 준다.
  sock: { label: '냄새나는 양말', description: '가까이 있으면 지독한 냄새로 계속 아프다', hp: 30, speed: 50, radius: 12, damage: 6, xp: 3,
    from: 300, weight: 2, auraRadius: 85, auraEverySec: 1.2, auraDamage: 4 },
  // 때때로 오리 근처로 순간 이동한다.
  dustbunny: { label: '먼지 토끼', description: '때때로 오리 근처로 휙 순간 이동한다', hp: 24, speed: 70, radius: 11, damage: 7, xp: 3,
    from: 340, weight: 2, blinkEverySec: 3.2, blinkMin: 220, blinkTo: 140 },
  // 오리를 겨눈 뒤 일직선으로 내리꽂는다. 겨누는 동안 빨간 선이 보인다.
  pigeon: { label: '비둘기', description: '오리를 겨눈 뒤 일직선으로 날아와 내리꽂는다', hp: 18, speed: 60, radius: 12, damage: 9, xp: 3,
    from: 380, weight: 1.5, swoopEverySec: 4, aimSec: 0.6, swoopSec: 0.7, swoopSpeed: 6, swoopRange: 380 },
};

// 8분부터 일반 적의 정예가 order 순서대로 step초마다 한 종류씩 나오기 시작한다.
// 정예는 그 종류가 나올 때 chance 확률로 섞여 나오고, 그 확률은 분마다 조금씩 올라간다.
export const ELITE = {
  from: 480, step: 30,
  order: ['roach', 'trash', 'rust', 'mold', 'mosquito', 'spider', 'fly', 'milk', 'mouse', 'moth', 'ant', 'slug', 'sock', 'dustbunny', 'pigeon'],
  chance: 0.15, chancePerMin: 0.03, maxChance: 0.4,
  hp: 6, damage: 1.5, speed: 1.1, radius: 1.25, xp: 5, drop: 3,
};

export function eliteFrom(kind) {
  const index = ELITE.order.indexOf(kind);
  return index < 0 ? Infinity : ELITE.from + index * ELITE.step;
}

// 보스는 90초마다 나오고, 나올 때마다 더 세진다.
export const BOSS_EVERY_SEC = 90;
export const BOSSES = [
  { kind: 'kingRoach', label: '왕바퀴', description: '돌진한 뒤 사방으로 알을 뿌린다', hp: 480, speed: 78, radius: 30, damage: 20, xp: 40, chargeEverySec: 4,
    ringCount: 10, shotSpeed: 120, shotDamage: 8 },
  { kind: 'garbageGiant', label: '쓰레기 산', description: '떨어질 자리를 보여 주고 쓰레기를 던진다. 쓰러지면 쓰레기봉투 10개', hp: 1100, speed: 40, radius: 34, damage: 24, xp: 55, splitInto: 10,
    lobEverySec: 3.5, lobCount: 4, lobDelaySec: 1.1, lobRadius: 36, lobDamage: 16 },
  { kind: 'rustBoiler', label: '녹슨 보일러', description: '원형 탄막, 소용돌이 증기, 조준 부채꼴을 번갈아 쏜다', hp: 900, speed: 32, radius: 32, damage: 22, xp: 50,
    patternSec: 3.2, burstCount: 16, shotSpeed: 125, shotDamage: 9 },
  // 좌우로 크게 흔들리며 날아다니고, 조그만 날파리를 다섯 마리씩 불러낸다.
  { kind: 'kingFly', label: '대왕 파리', description: '좌우로 흔들리며 날아다니고 날파리를 다섯 마리씩 부른다', hp: 820, speed: 92, radius: 30, damage: 18, xp: 50,
    summonEverySec: 3.5, summonCount: 5, sway: 1.1 },
  // 6초마다 멈춰서 2초 동안 탈수: 두 줄 소용돌이 탄막을 뿜으며 오리를 빨아들인다.
  { kind: 'washer', label: '세탁기 괴물', description: '멈춰서 탈수하며 소용돌이 탄막을 뿜고 오리를 빨아들인다', hp: 1050, speed: 46, radius: 32,
    damage: 22, xp: 55, spinEverySec: 6, spinSec: 2, shotEverySec: 0.16, spin: 3.2, shotSpeed: 130, shotDamage: 6, pull: 45, pullRange: 380 },
  // 오리를 겨눈 증기 줄기 세 개를 미리 보여 주고 0.9초 뒤 뿜는다.
  { kind: 'riceCooker', label: '전기밥솥', description: '증기 줄기 세 개를 겨눴다가 뿜는다. 빨간 띠 밖으로 피하자', hp: 980, speed: 38, radius: 30,
    damage: 22, xp: 55, ventEverySec: 3.6, vents: 3, ventSpread: 0.38, aimSec: 1, ventLength: 560, ventWidth: 46, ventDamage: 15 },
  // 곰팡이를 부르고, 오리 둘레에 포자를 고리 모양으로 떨어뜨린다. 가만히 있으면 맞는다.
  { kind: 'moldQueen', label: '곰팡이 여왕', description: '곰팡이를 부르고, 오리 둘레에 포자를 고리 모양으로 떨어뜨린다', hp: 1150, speed: 34, radius: 34,
    damage: 24, xp: 60, summonEverySec: 6, summonCount: 3, sporeEverySec: 4.5, sporeCount: 5, sporeRing: 130, sporeRadius: 40, sporeSec: 1.4,
    sporeDamage: 11 },
];

// 보스는 도망만 다녀서는 따돌릴 수 없게 빠르게 쫓아온다.
export const BOSS_SPEED = 1.35;

export function bossStatsOf(index, time) {
  const base = BOSSES[index % BOSSES.length];
  const round = Math.floor(index / BOSSES.length);
  const hpScale = difficultyAt(time).hp * (1 + round * 0.9);
  // 보스도 나오는 시점의 난이도만큼 더 아프게 때린다.
  return { ...base, speed: base.speed * BOSS_SPEED, hp: Math.round(base.hp * hpScale), damage: base.damage * difficultyAt(time).damage * (1 + round * 0.5) };
}

// 무기. 배열은 1~5레벨 값이다.
export const WEAPONS = {
  spray: {
    label: '살충제', description: '가까운 적에게 약을 뿌린다',
    cooldown: [0.9, 0.8, 0.7, 0.6, 0.55], damage: [12, 15, 18, 22, 26], count: [1, 1, 2, 2, 3],
    pierce: [0, 1, 1, 2, 3], speed: 430, lifeSec: 1.1,
  },
  broom: {
    label: '빗자루', description: '주변을 크게 쓸어 버린다',
    cooldown: [1.4, 1.25, 1.1, 1.0, 0.85], damage: [20, 26, 33, 41, 50], radius: [76, 86, 96, 108, 122], knockback: 40,
  },
  bleach: {
    label: '락스', description: '적이 몰린 곳에 독한 웅덩이를 남긴다',
    cooldown: [3.2, 2.9, 2.6, 2.3, 2.0], dps: [22, 28, 35, 43, 54], radius: [58, 64, 70, 78, 88], count: [1, 1, 2, 2, 3],
    lifeSec: 3,
  },
  dehumidifier: {
    label: '제습기', description: '곁에 오는 적을 계속 말린다',
    dps: [12, 16, 21, 27, 34], radius: [95, 108, 122, 138, 156],
  },
  swatter: {
    label: '파리채', description: '가장 센 적을 세게 내려친다',
    cooldown: [2.0, 1.8, 1.6, 1.4, 1.2], damage: [60, 75, 90, 105, 120], radius: [42, 46, 52, 58, 66],
  },
  slipper: {
    label: '슬리퍼', description: '던지면 돌아오는 슬리퍼',
    cooldown: [1.9, 1.7, 1.5, 1.35, 1.2], damage: [16, 20, 25, 30, 36], count: [1, 1, 2, 2, 3], speed: 330, rangeSec: 0.75,
  },
  coil: {
    label: '모기향', description: '불씨가 주위를 빙빙 돌며 태운다',
    damage: [16, 20, 25, 31, 38], count: [2, 3, 3, 4, 5], orbit: [85, 92, 100, 110, 122], hitEverySec: 0.3, spin: 4.6,
  },
  zapper: {
    label: '전기 파리채', description: '전기가 적에서 적으로 튄다',
    cooldown: [1.8, 1.65, 1.5, 1.35, 1.2], damage: [24, 30, 38, 47, 58], chains: [4, 5, 6, 7, 9], jump: 140,
  },
  detergent: {
    label: '세제 거품', description: '둥둥 떠다니다 닿으면 터지는 거품',
    cooldown: [2.5, 2.3, 2.1, 1.9, 1.7], damage: [20, 25, 31, 38, 46], count: [4, 5, 6, 7, 8], radius: [38, 42, 46, 50, 56],
    speed: 120, lifeSec: 3.2,
  },
  roller: {
    label: '돌돌이', description: '바라보는 쪽으로 굴러가며 적을 모두 훑는다',
    cooldown: [2.6, 2.4, 2.2, 2.0, 1.7], damage: [30, 38, 47, 57, 70], size: [18, 20, 22, 25, 28], speed: 260, lifeSec: 1.8,
  },
  dryer: {
    label: '드라이기', description: '가까운 적 쪽으로 뜨거운 바람을 계속 쏜다',
    dps: [24, 31, 39, 48, 60], range: [135, 145, 157, 170, 185], spread: 0.45,
  },
  fan: {
    label: '선풍기', description: '강풍으로 앞의 적을 멀리 날린다',
    // cone은 바라보는 쪽에서 양옆으로 바람이 닿는 각도(라디안)다.
    cooldown: [2.6, 2.4, 2.2, 2.0, 1.8], damage: [14, 19, 25, 32, 40], range: [220, 240, 260, 285, 310], knockback: 38, cone: 1.0,
  },
  laser: {
    label: '레이저 포인터', description: '아무 방향으로나 곧게 뻗는 레이저를 쏜다',
    cooldown: [2.2, 2.0, 1.8, 1.6, 1.4], damage: [28, 35, 43, 52, 64], width: [14, 16, 18, 20, 24], count: [1, 1, 2, 2, 3],
    length: 900,
  },
  stapler: {
    label: '스테이플러', description: '바라보는 쪽으로 심을 마구 쏜다',
    cooldown: [0.16, 0.14, 0.12, 0.1, 0.085], damage: [6, 7, 8, 9.5, 11], speed: 520, lifeSec: 0.8, spread: 0.13,
  },
  ball: {
    label: '탱탱볼', description: '화면 안을 튕겨 다니며 부딪힌 적을 때린다',
    damage: [18, 22, 27, 33, 40], count: [1, 1, 2, 2, 3], speed: [300, 320, 340, 365, 390], radius: 10, hitEverySec: 0.35,
  },
  robot: {
    label: '로봇청소기', description: '혼자 돌아다니며 가까운 적을 들이받는다',
    damage: [10, 13, 16, 20, 25], count: [1, 1, 1, 2, 2], speed: [125, 134, 144, 156, 170], radius: 12, hitEverySec: 0.45,
  },
  towel: {
    // 젖어서 맞은 적은 잠깐 느려진다(보스 제외).
    label: '젖은 수건', description: '앞을 넓고 길게 후려치고, 맞은 적을 적셔 느리게 한다. 2레벨부터 양쪽',
    cooldown: [1.0, 0.92, 0.84, 0.76, 0.68], damage: [26, 33, 41, 50, 62], length: [170, 185, 200, 220, 245], count: [1, 2, 2, 2, 2],
    height: 64, knockback: 14, slow: 0.65, slowSec: 1,
  },
  paperplane: {
    label: '종이비행기', description: '적을 쫓아가는 비행기를 날린다',
    cooldown: [1.6, 1.45, 1.3, 1.15, 1.0], damage: [14, 17, 21, 25, 30], count: [1, 1, 2, 2, 2], speed: 260, turn: 4.5, lifeSec: 3,
  },
  mousetrap: {
    label: '쥐덫', description: '주변에 덫을 놓는다. 적이 밟으면 탁 닫힌다',
    cooldown: [2.5, 2.3, 2.1, 1.9, 1.7], damage: [60, 75, 95, 115, 140], count: [1, 1, 2, 2, 3], radius: [30, 32, 34, 37, 40],
    lifeSec: 8, maxTraps: 12,
  },
  microwave: {
    label: '전자레인지', description: '퍼져 나가는 파동으로 주변을 데운다',
    cooldown: [3, 2.8, 2.6, 2.4, 2.2], damage: [20, 25, 31, 38, 46], radius: [150, 165, 180, 200, 220], growSec: 0.55,
  },
  shower: {
    label: '샤워기', description: '적 머리 위로 물줄기를 떨어뜨린다',
    cooldown: [1.4, 1.3, 1.2, 1.1, 1.0], damage: [16, 19, 23, 27, 32], count: [2, 3, 3, 4, 5], radius: [34, 36, 38, 41, 44], fallSec: 0.35,
  },
};

// 패시브. 배열 길이가 곧 최대 레벨이다. 공격력, 이동 속도, 치명타 확률은 10레벨까지, 나머지는 5레벨까지 올린다.
export const PASSIVES = {
  sneakers: { label: '운동화', description: '더 빨리 움직인다', speed: [0.1, 0.2, 0.28, 0.35, 0.42, 0.48, 0.54, 0.6, 0.65, 0.7] },
  vacuum: { label: '청소기', description: '먼지를 더 멀리서 빨아들인다', pickup: [0.4, 0.8, 1.2, 1.6, 2.0] },
  vitamin: { label: '비타민', description: '최대 체력과 회복력이 오른다', maxHp: [10, 20, 30, 40, 50], regen: [0.4, 0.8, 1.2, 1.6, 2] },
  battery: { label: '보조배터리', description: '무기를 더 자주 쓴다', haste: [0.07, 0.13, 0.19, 0.24, 0.3] },
  candle: { label: '향초', description: '먼지에서 경험치를 더 얻는다', xpGain: [0.1, 0.2, 0.3, 0.4, 0.5] },
  // 범위는 반경과 사거리를 넓히고, 드라이기와 선풍기는 바람이 퍼지는 폭도 같이 넓힌다.
  wipes: { label: '물티슈', description: '무기 범위가 넓어지고, 드라이기·선풍기 바람 폭도 넓어진다', area: [0.08, 0.16, 0.24, 0.32, 0.4] },
  protein: { label: '단백질 셰이크', description: '모든 무기의 공격력이 오른다', might: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] },
  magnifier: { label: '돋보기', description: '날아가는 것들이 커진다', size: [0.3, 0.6, 0.9, 1.2, 1.5] },
  clover: { label: '네잎클로버', description: '레벨마다 치명타 확률 +6%, 최대 +60%', critChance: [0.06, 0.12, 0.18, 0.24, 0.3, 0.36, 0.42, 0.48, 0.54, 0.6] },
  // 치명타 확률이 없으면 쓸모가 없어서, 네잎클로버를 가진 뒤에만 나온다.
  hotsauce: { label: '핫소스', description: '치명타가 더 아프다', critDamage: [0.25, 0.5, 0.75, 1.0, 1.25], requires: 'clover' },
  // 보물 패시브: 보물 파트 20점이어야 나온다. 보물이 직접 주는 피해와 발동 주기만 바꾼다.
  polish: { label: '광택제', description: '보물을 반짝반짝 닦아 보물 피해가 오른다', relicPower: [0.15, 0.3, 0.45, 0.6, 0.75], treasureOnly: true },
  windup: { label: '태엽 열쇠', description: '보물이 더 자주 발동한다', relicHaste: [0.08, 0.16, 0.24, 0.32, 0.4], treasureOnly: true },
  // 공속 패시브: 패널티와 고정 피해가 함께 성장한다.
  precision: { label: '정밀 스프링', hasteOnly: true, description: '치확을 낮추고 타격당 고정 피해를 더한다(추가 피해는 치명타·공격력 증폭과 지속 피해 적용 제외)',
    critPenalty: [0.04, 0.08, 0.12, 0.16, 0.2], hitDamage: [12, 24, 36, 48, 60] },
  lightgear: { label: '경량 기어', hasteOnly: true, description: '무기 기본 피해를 낮추고 타격당 고정 피해를 더한다(추가 피해는 치명타·공격력 증폭과 지속 피해 적용 제외)',
    weaponPenalty: [0.15, 0.3, 0.45, 0.6, 0.75], hitDamage: [6, 12, 18, 24, 30] },
  counterweight: { label: '균형추', hasteOnly: true, description: '현재 공격력을 낮추고 타격당 고정 피해를 더한다(추가 피해는 치명타·공격력 증폭과 지속 피해 적용 제외)',
    attackPenalty: [0.15, 0.3, 0.45, 0.6, 0.75], hitDamage: [9, 18, 27, 36, 45] },
};

export const MAX_LEVEL = 5;

// 패시브마다 최대 레벨이 다르다. 효과 배열의 길이로 정한다.
export function passiveMaxLevel(id) {
  return Object.values(PASSIVES[id]).find(Array.isArray).length;
}

// 5레벨을 채운 무기는 완성형으로 한 번 더 바뀐다.
export const EVOLUTIONS = {
  spray: { label: '업소용 분사기', description: '사방으로 뿜고 약이 적을 모두 뚫는다', damage: 1.4, ring: 8 },
  broom: { label: '회오리 빗자루', description: '더 넓게, 연달아 두 번 쓴다', damage: 1.5, radius: 1.35 },
  bleach: { label: '원액 락스', description: '웅덩이가 넓고 오래 가며 적을 느리게 한다', dps: 1.6, radius: 1.35, lifeSec: 5, slow: 0.5 },
  dehumidifier: { label: '산업용 제습기', description: '넓은 범위의 적을 바싹 말려 느리게 한다', dps: 1.8, radius: 1.4, slow: 0.65 },
  swatter: { label: '전설의 파리채', description: '센 적 셋을 한꺼번에 내려친다', damage: 1.5, targets: 3 },
  slipper: { label: '슬리퍼 폭풍', description: '슬리퍼 여덟 짝이 사방으로 날아간다', damage: 1.3, count: 8 },
  coil: { label: '불꽃 모기향', description: '바깥에 불씨 고리가 하나 더 돈다', damage: 1.5, outer: 1.75 },
  zapper: { label: '벼락 파리채', description: '전기가 훨씬 멀리, 더 많이 튄다', damage: 1.5, chains: 16, jump: 1.5 },
  detergent: { label: '거품 폭탄', description: '거품이 두 배로 나오고 훨씬 크게 터진다', damage: 1.3, radius: 1.5, double: true },
  roller: { label: '대형 돌돌이', description: '앞뒤로 커다란 돌돌이를 굴린다', damage: 1.5, size: 1.5, both: true },
  dryer: { label: '업소용 열풍기', description: '더 멀리, 더 넓게, 더 뜨겁게', dps: 1.6, range: 1.4, wide: 0.75 },
  fan: { label: '태풍 선풍기', description: '사방의 적을 한 번에 날려 버린다', damage: 2, range: 1.3 },
  laser: { label: '레이저 쇼', description: '여섯 줄기가 사방으로 한꺼번에 뻗는다', damage: 1.3, count: 6 },
  stapler: { label: '전동 타카', description: '두 줄로 쏘고 못이 적을 뚫는다', damage: 1.4, pierce: 2 },
  ball: { label: '왕탱탱볼', description: '커다란 공 다섯 개가 튕겨 다닌다', damage: 1.5, count: 5, size: 1.8 },
  robot: { label: '로봇청소기 부대', description: '세 대가 몰려다니며 더 세게 들이받는다', damage: 1.2, count: 3 },
  towel: { label: '비치 타월', description: '양쪽을 한꺼번에, 더 넓고 세게 후려친다', damage: 1.5, size: 1.6 },
  paperplane: { label: '종이학 편대', description: '네 마리가 날아가 적을 꿰뚫는다', damage: 1.3, count: 4, pierce: 2 },
  mousetrap: { label: '대형 끈끈이', description: '덫이 커지고 훨씬 아프게 문다', damage: 1.6, radius: 1.5 },
  microwave: { label: '업소용 전자레인지', description: '더 멀리, 더 세게 데운다', damage: 1.5, radius: 1.35 },
  shower: { label: '수압 샤워', description: '물줄기가 두 배로 쏟아진다', damage: 1.3, double: true },
};

// 한 판에 만들 수 있는 합체 수. 다 채우면 합체는 더 이상 선택지에 나오지 않는다.
export const MAX_FUSIONS = 2;

// 완성형 두 개를 모두 가지고 있으면 합체할 수 있다. 원래 두 무기는 그대로 쓰면서 합체 효과가 더해진다.
export const FUSIONS = {
  thunderball: { label: '번개볼', description: '공이 주변 적에게 번개를 쏘고, 벽에 부딪히면 크게 방전한다', from: ['ball', 'zapper'],
    damage: 1.5, zapEverySec: 0.4, targets: 3, range: 170, zap: 1, blast: 150, blastDamage: 2 },
  spinlaser: { label: '회전 레이저', description: '꺼지지 않는 레이저 네 줄기가 빙글빙글 돌며 훑는다', from: ['laser', 'fan'],
    count: 4, length: 620, turn: 1.5, dps: 1.6 },
  // 살충제는 따로 뿌리지 않고, 스테이플러가 적을 쫓아가는 독침을 앞쪽으로 다섯 발씩 쏜다.
  poisongun: { label: '독침 기관총', description: '비행 거리가 2배인 유도 독침 다섯 발을 앞쪽으로 쏘아 중독시킨다. 기본 발사 속도 -20%. 살충제는 따로 뿌리지 않는다', from: ['stapler', 'spray'],
    shots: 5, spread: 0.2, cooldownScale: 1.25, damage: 0.75, pierce: 1, homing: 6, lifeScale: 2, poison: 0.6, poisonSec: 3 },
  bleachbot: { label: '소독 로봇', description: '로봇이 더 빠르게 달리며 지나간 자리에 락스를 남긴다', from: ['robot', 'bleach'],
    damage: 1.3, speed: 1.15, dropEverySec: 0.45, radius: 34, dps: 0.6, lifeSec: 2, slow: 0.4 },
  firering: { label: '화염 고리', description: '불씨 고리가 한 겹 더 돌고, 주기적으로 화염이 사방을 휩쓴다', from: ['coil', 'dryer'],
    damage: 1.6, outer: 2.6, novaEverySec: 2.4, novaRadius: 210, nova: 2.2 },
  // 톱날이 적에서 적으로 튕겨 다니다 돌아온다. 베인 적은 한동안 계속 피해를 입는다.
  sawblade: { label: '도탄 톱날', description: '톱날 셋이 적에서 적으로 튕겨 다니며 베고, 베인 적은 계속 피해를 입는다', from: ['slipper', 'roller'],
    count: 3, speed: 560, bounces: 6, hop: 260, seek: 420, radius: 24, damage: 1.5, bleed: 0.6, bleedSec: 2.5, idleOrbit: 60 },
  mopstorm: { label: '물걸레 회오리', description: '물걸레가 주위를 한 바퀴 휘감아 적을 끌어당기며 때린다', from: ['towel', 'broom'],
    everySec: 1.6, damage: 1.2, pull: 60 },
  // 파리채는 혼자 내려치지 않고 종이비행기를 따라서만 내려친다.
  bomber: { label: '파리채 폭격기', description: '종이비행기가 맞힌 자리에 파리채가 함께 내려친다. 파리채는 따로 치지 않는다', from: ['paperplane', 'swatter'],
    damage: 0.6, radius: 55 },
  foammine: { label: '거품 지뢰', description: '쥐덫이 닫힐 때 거품 여섯 개가 사방으로 터져 나간다', from: ['mousetrap', 'detergent'], bubbles: 6 },
  dryoven: { label: '건조 오븐', description: '파동이 두 번 퍼지고, 맞은 적을 느리게 하며 바싹 태운다', from: ['microwave', 'dehumidifier'],
    burnSec: 2, burn: 1, slow: 0.5 },
  shockshower: { label: '감전 샤워', description: '물줄기가 떨어진 자리에서 전기가 주변 적 셋에게 튄다', from: ['shower', 'zapper'],
    targets: 3, range: 170, damage: 0.5 },
};

// 한 판에 가질 수 있는 무기 수. 다 채우면 새 무기는 선택지에 나오지 않고 가진 무기만 강화한다.
export const MAX_WEAPONS = 8;

// 한 판에 가질 수 있는 보물 수(보물 파트 20점이면 6개). 다 채운 뒤의 보물 상자는 바꾸거나 레벨업 두 번이 된다.
export const MAX_RELICS = 3;

// 보물이 직접 주는 피해는 레벨마다 이만큼 세진다(공격력과 보물 피해도 곱한다). 후반에도 쓸모 있게.
export const RELIC_LEVEL_SCALE = 0.04;

// 보물. 게임을 시작할 때 하나, 보스를 잡을 때마다 하나를 고른다. 레벨이 없고 한 번 얻으면 끝까지 간다.
// stats는 카드에 적는 정확한 효과다.
export const RELICS = {
  twin: { label: '쌍둥이 노즐', description: '날아가는 무기를 두 번씩 쏜다',
    stats: ['살충제·슬리퍼·세제 거품·돌돌이·스테이플러·레이저·종이비행기 2번 발사', '두 번째 발사는 피해 -50%'],
    weapons: ['spray', 'slipper', 'detergent', 'roller', 'stapler', 'laser', 'paperplane'], echoSec: 0.12, echoDamage: 0.5 },
  blanket: { label: '두꺼운 이불', description: '멈춰 있으면 받는 피해가 줄어든다', stats: ['멈춰 있으면 받는 피해 -60%'], guard: 0.6 },
  energy: { label: '에너지 드링크', description: '움직이는 동안 힘이 넘친다', stats: ['움직이는 동안 공격력 +30%', '이동 속도 +10%'], might: 0.3, speed: 0.1 },
  magnet: { label: '냉장고 자석', description: '먼지를 아주 멀리서 끌어온다', stats: ['줍는 범위 +200%'], pickup: 2 },
  neko: { label: '행운의 고양이', description: '운이 좋아진다', stats: ['다시 뽑기 +1회', '치명타 확률 +10%'], rerolls: 1, critChance: 0.1 },
  firstaid: { label: '구급상자', description: '쓰러져도 한 번 일어난다', stats: ['한 번 체력 50%로 부활', '부활 뒤 3초 무적'], reviveHp: 0.5, reviveGuardSec: 3 },
  scrubber: { label: '철수세미', description: '부딪힌 적에게 따끔하게 돌려준다', stats: ['맞으면 주변 적에게 받은 피해의 500%'], reflect: 5, radius: 110 },
  alarm: { label: '알람시계', description: '때마다 울려 적을 얼린다', stats: ['20초마다 적 2.5초 얼림(보스 제외)'], everySec: 20, freezeSec: 2.5 },
  piggy: { label: '돼지 저금통', description: '차곡차곡 모아 더 빨리 큰다', stats: ['경험치 +20%', '레벨업마다 체력 +4'], xpGain: 0.2, levelHeal: 4 },
  lastcup: { label: '마지막 컵라면', description: '궁지에 몰리면 강해진다', stats: ['체력 30% 이하일 때 공격력 +60%', '쿨타임 -20%'],
    below: 0.3, might: 0.6, haste: 0.2 },
  bigpot: { label: '큰 냄비', description: '무엇이든 크게 만든다', stats: ['무기 범위 +25%', '투사체 크기 +25%'], area: 0.25, projectile: 0.25 },
  stopwatch: { label: '스톱워치', description: '손이 빨라진다', stats: ['모든 쿨타임 -15%'], haste: 0.15 },
  dice: { label: '주사위', description: '한 방을 노린다', stats: ['치명타 확률 +5%', '치명타 피해 +75%'], critChance: 0.05, critDamage: 0.75 },
  popcorn: { label: '팝콘 기계', description: '쓰러진 적이 펑 터진다', stats: ['적이 쓰러지면 25% 확률로 폭발', '폭발 피해 25(레벨·보물 피해 비례)'],
    chance: 0.25, radius: 70, damage: 25 },
  icetray: { label: '얼음틀', description: '때릴 때마다 차갑다', stats: ['맞은 적 8% 확률로 1.5초 얼림(보스 제외)'], chance: 0.08, freezeSec: 1.5 },
  umbrella: { label: '우산', description: '날아오는 것을 막아 준다', stats: ['탄막·떨어지는 쓰레기 피해 -60%'], guard: 0.6 },
  waterbottle: { label: '대용량 물병', description: '든든하게 버틴다', stats: ['최대 체력 +50', '초당 회복 +1'], maxHp: 50, regen: 1 },
  scooter: { label: '킥보드', description: '훨씬 빨리 달린다', stats: ['이동 속도 +25%'], speed: 0.25 },
  firecracker: { label: '폭죽', description: '때마다 크게 터진다', stats: ['25초마다 주변 큰 폭발', '폭발 피해 120(레벨·보물 피해 비례)'],
    everySec: 25, radius: 320, damage: 120 },
  lamp: { label: '형광등', description: '보스를 환하게 비춘다', stats: ['보스에게 주는 피해 +40%'], bossDamage: 0.4 },
  // 치명타를 버리고 한 대 한 대를 무겁게, 더 자주 때린다. 치명타 확률은 고정 피해로 바뀐다.
  mallet: { label: '고무망치', description: '치명타 대신 묵직하게, 자주 때린다',
    stats: ['치명타가 터지지 않음', '치명타 확률 5%마다 피해 +20', '공격 속도 +100%'], step: 0.05, flat: 20, attackSpeed: 1 },
  // 공격 보물: 보물 파트 20점이어야 나온다. 피해는 공격력, 레벨, 보물 피해에 비례한다.
  pas: { label: '물파스', treasureOnly: true, description: '때마다 화끈하게 터진다', stats: ['8초마다 주변 폭발', '폭발 피해 80(레벨·보물 피해 비례)'],
    everySec: 8, radius: 170, damage: 80 },
  heatpad: { label: '전기장판', treasureOnly: true, description: '넓은 장판이 때마다 뜨겁게 달아오른다',
    stats: ['0.8초마다 넓은 주변을 지짐', '지질 때 피해 8(레벨·보물 피해 비례)'], everySec: 0.8, radius: 175, damage: 8 },
  freshener: { label: '방향제', treasureOnly: true, description: '때마다 화면 가득 퍼진다', stats: ['12초마다 화면의 모든 적에게 피해 120(레벨·보물 피해 비례)'],
    everySec: 12, radius: 640, damage: 120 },
  clothespin: { label: '빨래집게', treasureOnly: true, description: '쓰러진 적 자리에 집게를 남긴다',
    stats: ['적이 쓰러지면 20% 확률로 집게 함정', '집게 피해 90(레벨·보물 피해 비례)'], chance: 0.2, damage: 90, radius: 46, lifeSec: 7, max: 12 },
  outlet: { label: '멀티탭', treasureOnly: true, description: '때마다 화면 곳곳에 벼락이 떨어진다', stats: ['5초마다 가까운 적 넷에게 벼락', '벼락 피해 160(레벨·보물 피해 비례)'],
    everySec: 5, strikes: 4, range: 520, radius: 44, damage: 160 },
  glove: { label: '고무장갑', treasureOnly: true, description: '때마다 앞으로 크게 후려친다', stats: ['4초마다 바라보는 쪽으로 충격파', '충격파 피해 130(레벨·보물 피해 비례)'],
    everySec: 4, length: 300, width: 80, damage: 130, knockback: 50 },
  match: { label: '성냥', treasureOnly: true, description: '맞은 적에게 불이 붙는다', stats: ['한 대씩 맞힐 때 12% 확률로 3초 동안 불붙임', '불 피해 초당 32(레벨·보물 피해 비례)'],
    chance: 0.12, burnSec: 3, dps: 32 },
  // 쿨타임마다 팽이를 하나 날린다. 팽이는 화면 가장자리에서 튕기며 4초 동안 돈다. 쿨타임이 짧을수록 많이 돈다.
  top: { label: '팽이', treasureOnly: true, description: '때마다 팽이를 날려 화면을 튕기며 돌게 한다',
    stats: ['2.5초마다 팽이 하나를 날림(4초 동안 돎)', '닿을 때 피해 60(레벨·보물 피해 비례)'],
    everySec: 2.5, lifeSec: 4, speed: 330, radius: 18, damage: 60, hitEverySec: 0.25, max: 8 },
  purifier: { label: '정수기', treasureOnly: true, description: '때마다 얼음 조각을 사방으로 쏜다', stats: ['6초마다 얼음 조각 12개를 사방으로', '조각 피해 80(레벨·보물 피해 비례), 셋까지 뚫음'],
    everySec: 6, shards: 12, speed: 320, lifeSec: 1.1, pierce: 3, damage: 80 },
};

// 맵에 같은 종류의 아이템은 이만큼까지만 떨어져 있을 수 있다(보물 상자는 빼고).
export const DROP_LIMIT = 2;

// 바닥에 떨어지는 아이템과 떨어질 확률(적 하나당)
export const DROPS = {
  ramen: { label: '라면', description: '체력 15 회복', chance: 0.0015 },
  vacuumBag: { label: '청소기 먼지통', description: '바닥의 먼지를 모두 끌어온다', chance: 0.001 },
  bugBomb: { label: '연막 살충제', description: '화면의 적을 모두 쓰러뜨린다(보스 제외)', chance: 0.0005 },
  coffee: { label: '아이스 아메리카노', description: '10초 동안 빨라지고 무기를 더 자주 쓴다', chance: 0.0007 },
  chicken: { label: '치킨', description: '체력을 모두 회복한다', chance: 0.0003 },
  icepack: { label: '얼음팩', description: '4초 동안 적이 얼어붙는다(보스 제외)', chance: 0.0006 },
  box: { label: '택배 상자', description: '5초 동안 피해를 받지 않는다', chance: 0.0006 },
};

export function xpToNext(level) {
  return 5 + (level - 1) * 6 + Math.floor((level - 1) ** 1.6);
}
