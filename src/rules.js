// 숫자는 모두 여기서 바꾼다. 시간 단위는 초, 거리는 월드 픽셀이다.
export const ARENA = { width: 3000, height: 3000 };

export const PLAYER = { speed: 150, maxHp: 50, radius: 16, pickupRadius: 90, invulnerableSec: 0.8 };

// 시간이 갈수록 끝없이 세진다. 정해진 끝이 없어서 오래 버틴 사람이 이긴다.
export function difficultyAt(time) {
  const minutes = time / 60;
  // 4분부터는 합체 무기까지 갖춘 오리를 상대해야 해서 훨씬 가파르게 세진다.
  const late = Math.max(0, minutes - 4);
  return {
    hp: 1 + minutes * 0.45 + minutes * minutes * 0.09 + late * late * 0.35 + late * late * late * 0.04,
    damage: 1 + minutes * 0.25 + minutes * minutes * 0.02 + late * 0.25,
    speed: 1 + Math.min(0.45, minutes * 0.04) + Math.min(0.25, late * 0.03),
    spawnPerSec: Math.min(46, 1.4 + minutes * 1.8 + minutes * minutes * 0.3 + late * 1.2),
    maxEnemies: Math.min(640, 110 + Math.floor(minutes * 65)),
  };
}

export const ENEMIES = {
  roach: { label: '바퀴벌레', hp: 7, speed: 72, radius: 10, damage: 5, xp: 1, from: 0, weight: 10 },
  trash: { label: '쓰레기봉투', hp: 34, speed: 44, radius: 19, damage: 10, xp: 3, from: 25, weight: 4 },
  scrap: { label: '쓰레기 조각', hp: 6, speed: 82, radius: 9, damage: 5, xp: 1, from: Infinity, weight: 0 },
  rust: { label: '녹물 방울', hp: 16, speed: 58, radius: 13, damage: 7, xp: 2, from: 50, weight: 2,
    range: 230, shootEverySec: 3.2, shotSpeed: 160, shotDamage: 6 },
  mold: { label: '곰팡이', hp: 22, speed: 36, radius: 15, damage: 8, xp: 2, from: 80, weight: 3,
    slimeSec: 5, slimeRadius: 44, slow: 0.45 },
  fly: { label: '날파리 떼', hp: 4, speed: 140, radius: 7, damage: 4, xp: 1, from: 150, weight: 5 },
  // 지그재그로 날아와 맞히기 어렵다.
  mosquito: { label: '모기', hp: 5, speed: 125, radius: 7, damage: 4, xp: 1, from: 110, weight: 4, sway: 0.9 },
  // 웅크렸다가 한 번에 뛰어든다.
  spider: { label: '거미', hp: 20, speed: 50, radius: 12, damage: 9, xp: 2, from: 140, weight: 3,
    leapEverySec: 2.4, crouchSec: 0.4, leapSec: 0.4, leapSpeed: 4.2, leapRange: 300 },
  // 가까이 오면 멈춰서 부풀다가 터진다. 터질 자리를 미리 보여 준다.
  milk: { label: '상한 우유', hp: 26, speed: 62, radius: 13, damage: 6, xp: 3, from: 180, weight: 2,
    fuseRange: 85, fuseSec: 0.9, blastRadius: 72, blastDamage: 14 },
  // 빠르고 단단하다.
  mouse: { label: '생쥐', hp: 55, speed: 98, radius: 13, damage: 11, xp: 4, from: 220, weight: 2 },
  // 거리를 두고 세 갈래로 가루를 쏜다.
  moth: { label: '나방', hp: 18, speed: 66, radius: 11, damage: 6, xp: 3, from: 260, weight: 2,
    range: 260, shootEverySec: 3.6, shotSpeed: 150, shotDamage: 6, spread: 0.3, sway: 0.35 },
};

// 보스는 90초마다 나오고, 나올 때마다 더 세진다.
export const BOSS_EVERY_SEC = 90;
export const BOSSES = [
  { kind: 'kingRoach', label: '왕바퀴', hp: 480, speed: 78, radius: 30, damage: 20, xp: 40, chargeEverySec: 4,
    ringCount: 10, shotSpeed: 120, shotDamage: 8 },
  { kind: 'garbageGiant', label: '쓰레기 산', hp: 1100, speed: 40, radius: 34, damage: 24, xp: 55, splitInto: 10,
    lobEverySec: 3.5, lobCount: 4, lobDelaySec: 1.1, lobRadius: 36, lobDamage: 16 },
  { kind: 'rustBoiler', label: '녹슨 보일러', hp: 900, speed: 32, radius: 32, damage: 22, xp: 50,
    patternSec: 3.2, burstCount: 16, shotSpeed: 125, shotDamage: 9 },
  // 좌우로 크게 흔들리며 날아다니고, 조그만 날파리를 다섯 마리씩 불러낸다.
  { kind: 'kingFly', label: '대왕 파리', hp: 820, speed: 92, radius: 30, damage: 18, xp: 50,
    summonEverySec: 3.5, summonCount: 5, sway: 1.1 },
];

export function bossStatsOf(index, time) {
  const base = BOSSES[index % BOSSES.length];
  const round = Math.floor(index / BOSSES.length);
  const hpScale = difficultyAt(time).hp * (1 + round * 0.9);
  // 보스도 나오는 시점의 난이도만큼 더 아프게 때린다.
  return { ...base, hp: Math.round(base.hp * hpScale), damage: base.damage * difficultyAt(time).damage * (1 + round * 0.5) };
}

// 무기. 배열은 1~5레벨 값이다.
export const WEAPONS = {
  spray: {
    label: '살충제', description: '가까운 적에게 약을 뿌린다',
    cooldown: [0.7, 0.62, 0.55, 0.48, 0.42], damage: [12, 15, 18, 22, 26], count: [1, 1, 2, 2, 3],
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
    dps: [12, 16, 21, 27, 34], radius: [70, 80, 90, 102, 116],
  },
  swatter: {
    label: '파리채', description: '가장 센 적을 세게 내려친다',
    cooldown: [2.0, 1.8, 1.6, 1.4, 1.2], damage: [60, 80, 105, 135, 170], radius: [42, 46, 52, 58, 66],
  },
  slipper: {
    label: '슬리퍼', description: '던지면 돌아오는 슬리퍼',
    cooldown: [1.9, 1.7, 1.5, 1.35, 1.2], damage: [16, 20, 25, 30, 36], count: [1, 1, 2, 2, 3], speed: 330, rangeSec: 0.75,
  },
  coil: {
    label: '모기향', description: '불씨가 주위를 빙빙 돌며 태운다',
    damage: [12, 15, 19, 24, 30], count: [2, 3, 3, 4, 5], orbit: [62, 66, 70, 76, 82], hitEverySec: 0.35,
  },
  zapper: {
    label: '전기 파리채', description: '전기가 적에서 적으로 튄다',
    cooldown: [1.8, 1.65, 1.5, 1.35, 1.2], damage: [24, 30, 38, 47, 58], chains: [4, 5, 6, 7, 9], jump: 140,
  },
  detergent: {
    label: '세제 거품', description: '둥둥 떠다니다 닿으면 터지는 거품',
    cooldown: [1.9, 1.75, 1.6, 1.45, 1.3], damage: [20, 25, 31, 38, 46], count: [4, 5, 6, 7, 8], radius: [38, 42, 46, 50, 56],
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
    cooldown: [2.6, 2.4, 2.2, 2.0, 1.8], damage: [14, 19, 25, 32, 40], range: [160, 175, 190, 210, 230], knockback: 95,
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
    damage: [8, 10, 13, 16, 20], count: [1, 1, 1, 2, 2], speed: [130, 140, 150, 165, 180], radius: 14, hitEverySec: 0.5,
  },
};

// 패시브. 배열 길이가 곧 최대 레벨이다. 공격력과 이동 속도는 10레벨까지, 나머지는 5레벨까지 올린다.
export const PASSIVES = {
  gloves: { label: '고무장갑', description: '받는 피해가 줄어든다', armor: [0.08, 0.15, 0.21, 0.26, 0.3] },
  sneakers: { label: '운동화', description: '더 빨리 움직인다', speed: [0.1, 0.2, 0.28, 0.35, 0.42, 0.48, 0.54, 0.6, 0.65, 0.7] },
  vacuum: { label: '청소기', description: '먼지를 더 멀리서 빨아들인다', pickup: [0.4, 0.8, 1.2, 1.6, 2.0] },
  vitamin: { label: '비타민', description: '최대 체력과 회복력이 오른다', maxHp: [10, 20, 30, 40, 50], regen: [0.4, 0.8, 1.2, 1.6, 2] },
  battery: { label: '보조배터리', description: '무기를 더 자주 쓴다', haste: [0.07, 0.13, 0.19, 0.24, 0.3] },
  candle: { label: '향초', description: '먼지에서 경험치를 더 얻는다', xpGain: [0.1, 0.2, 0.3, 0.4, 0.5] },
  wipes: { label: '물티슈', description: '무기가 닿는 범위가 넓어진다', area: [0.08, 0.16, 0.24, 0.32, 0.4] },
  protein: { label: '단백질 셰이크', description: '모든 무기의 공격력이 오른다', might: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] },
  magnifier: { label: '돋보기', description: '날아가는 것들이 커진다', size: [0.15, 0.3, 0.45, 0.6, 0.75] },
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
  robot: { label: '로봇청소기 부대', description: '세 대가 몰려다니며 더 세게 들이받는다', damage: 1.3, count: 3 },
};

// 완성형 두 개를 모두 가지고 있으면 합체할 수 있다. 원래 두 무기는 그대로 쓰면서 합체 효과가 더해진다.
export const FUSIONS = {
  thunderball: { label: '번개볼', description: '공이 주변 적에게 번개를 쏘고, 벽에 부딪히면 크게 방전한다', from: ['ball', 'zapper'],
    damage: 1.5, zapEverySec: 0.4, targets: 3, range: 170, zap: 1, blast: 150, blastDamage: 2 },
  spinlaser: { label: '회전 레이저', description: '꺼지지 않는 레이저 네 줄기가 빙글빙글 돌며 훑는다', from: ['laser', 'fan'],
    count: 4, length: 620, turn: 1.5, dps: 1.6 },
  poisongun: { label: '독침 기관총', description: '세 줄로 쏘는 독침이 적을 모두 뚫고 중독시킨다', from: ['stapler', 'spray'],
    poison: 0.9, poisonSec: 3 },
  bleachbot: { label: '소독 로봇', description: '로봇이 더 빠르게 달리며 지나간 자리에 락스를 남긴다', from: ['robot', 'bleach'],
    damage: 1.3, speed: 1.15, dropEverySec: 0.45, radius: 34, dps: 0.6, lifeSec: 2, slow: 0.4 },
  firering: { label: '화염 고리', description: '불씨 고리가 한 겹 더 돌고, 주기적으로 화염이 사방을 휩쓴다', from: ['coil', 'dryer'],
    damage: 1.6, outer: 2.6, novaEverySec: 2.4, novaRadius: 210, nova: 2.2 },
  sawblade: { label: '회전 톱날', description: '커다란 톱날 둘이 화면을 크게 돌며 닿는 적을 갈아 버린다', from: ['slipper', 'roller'],
    count: 2, orbit: 170, spin: 2.6, radius: 30, damage: 1.2, hitEverySec: 0.22 },
};

// 바닥에 떨어지는 아이템과 떨어질 확률(적 하나당)
export const DROPS = {
  ramen: { label: '라면', description: '체력 15 회복', chance: 0.0025 },
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
