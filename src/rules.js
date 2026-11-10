// 숫자는 모두 여기서 바꾼다. 시간 단위는 초, 거리는 월드 픽셀이다.
export const ARENA = { width: 3000, height: 3000 };

export const PLAYER = { speed: 150, maxHp: 100, radius: 16, pickupRadius: 90, invulnerableSec: 0.8 };

// 시간이 갈수록 끝없이 세진다. 정해진 끝이 없어서 오래 버틴 사람이 이긴다.
export function difficultyAt(time) {
  const minutes = time / 60;
  return {
    hp: 1 + minutes * 0.3 + minutes * minutes * 0.05,
    damage: 1 + minutes * 0.15,
    speed: 1 + Math.min(0.45, minutes * 0.04),
    spawnPerSec: Math.min(24, 0.7 + minutes * 1.1 + minutes * minutes * 0.2),
    maxEnemies: Math.min(420, 70 + Math.floor(minutes * 45)),
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
};

// 보스는 90초마다 나오고, 나올 때마다 더 세진다.
export const BOSS_EVERY_SEC = 90;
export const BOSSES = [
  { kind: 'kingRoach', label: '왕바퀴', hp: 480, speed: 78, radius: 34, damage: 20, xp: 40, chargeEverySec: 4 },
  { kind: 'garbageGiant', label: '쓰레기 산', hp: 1100, speed: 40, radius: 44, damage: 24, xp: 55, splitInto: 10 },
  { kind: 'rustBoiler', label: '녹슨 보일러', hp: 900, speed: 32, radius: 38, damage: 22, xp: 50,
    burstEverySec: 3, burstCount: 14, shotSpeed: 150, shotDamage: 10 },
];

export function bossStatsOf(index, time) {
  const base = BOSSES[index % BOSSES.length];
  const round = Math.floor(index / BOSSES.length);
  const hpScale = difficultyAt(time).hp * (1 + round * 0.9);
  return { ...base, hp: Math.round(base.hp * hpScale), damage: base.damage * (1 + round * 0.5) };
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
    cooldown: [1.7, 1.5, 1.35, 1.2, 1.0], damage: [14, 18, 23, 28, 34], radius: [72, 82, 92, 104, 118], knockback: 40,
  },
  bleach: {
    label: '락스', description: '적이 몰린 곳에 독한 웅덩이를 남긴다',
    cooldown: [4, 3.6, 3.2, 2.8, 2.4], dps: [14, 18, 23, 28, 35], radius: [50, 56, 62, 70, 80], count: [1, 1, 2, 2, 3],
    lifeSec: 3,
  },
  dehumidifier: {
    label: '제습기', description: '곁에 오는 적을 계속 말린다',
    dps: [7, 10, 13, 17, 22], radius: [64, 72, 82, 92, 104],
  },
  swatter: {
    label: '파리채', description: '가장 센 적을 세게 내려친다',
    cooldown: [2.4, 2.1, 1.85, 1.6, 1.35], damage: [40, 55, 72, 92, 120], radius: [36, 40, 44, 50, 56],
  },
  slipper: {
    label: '슬리퍼', description: '던지면 돌아오는 슬리퍼',
    cooldown: [1.9, 1.7, 1.5, 1.35, 1.2], damage: [16, 20, 25, 30, 36], count: [1, 1, 2, 2, 3], speed: 330, rangeSec: 0.75,
  },
  coil: {
    label: '모기향', description: '불씨가 주위를 빙빙 돌며 태운다',
    damage: [8, 10, 13, 16, 20], count: [2, 2, 3, 3, 4], orbit: [62, 66, 70, 76, 82], hitEverySec: 0.45,
  },
  zapper: {
    label: '전기 파리채', description: '전기가 적에서 적으로 튄다',
    cooldown: [2.2, 2.0, 1.8, 1.6, 1.4], damage: [18, 23, 29, 36, 44], chains: [3, 4, 5, 6, 8], jump: 130,
  },
  fan: {
    label: '선풍기', description: '강풍으로 앞의 적을 멀리 날린다',
    cooldown: [3, 2.8, 2.6, 2.4, 2.2], damage: [8, 11, 14, 18, 22], range: [150, 165, 180, 200, 220], knockback: 95,
  },
};

// 패시브. 배열은 1~5레벨 효과다.
export const PASSIVES = {
  gloves: { label: '고무장갑', description: '받는 피해가 줄어든다', armor: [0.08, 0.15, 0.21, 0.26, 0.3] },
  sneakers: { label: '운동화', description: '더 빨리 움직인다', speed: [0.1, 0.2, 0.28, 0.35, 0.42] },
  vacuum: { label: '청소기', description: '먼지를 더 멀리서 빨아들인다', pickup: [0.4, 0.8, 1.2, 1.6, 2.0] },
  vitamin: { label: '비타민', description: '최대 체력과 회복력이 오른다', maxHp: [20, 40, 60, 80, 100], regen: [0.4, 0.8, 1.2, 1.6, 2] },
  battery: { label: '보조배터리', description: '무기를 더 자주 쓴다', haste: [0.07, 0.13, 0.19, 0.24, 0.3] },
  candle: { label: '향초', description: '먼지에서 경험치를 더 얻는다', xpGain: [0.1, 0.2, 0.3, 0.4, 0.5] },
  wipes: { label: '물티슈', description: '무기가 닿는 범위가 넓어진다', area: [0.08, 0.16, 0.24, 0.32, 0.4] },
  clover: { label: '네잎클로버', description: '아이템이 더 자주 떨어진다', luck: [0.3, 0.6, 0.9, 1.2, 1.5] },
};

export const MAX_LEVEL = 5;

// 바닥에 떨어지는 아이템과 떨어질 확률(적 하나당)
export const DROPS = {
  ramen: { label: '라면', description: '체력 30 회복', chance: 0.012 },
  vacuumBag: { label: '청소기 먼지통', description: '바닥의 먼지를 모두 끌어온다', chance: 0.004 },
  bugBomb: { label: '연막 살충제', description: '화면의 적을 모두 쓰러뜨린다(보스 제외)', chance: 0.0025 },
  coffee: { label: '아이스 아메리카노', description: '10초 동안 빨라지고 무기를 더 자주 쓴다', chance: 0.004 },
  chicken: { label: '치킨', description: '체력을 모두 회복한다', chance: 0.0015 },
  icepack: { label: '얼음팩', description: '4초 동안 적이 얼어붙는다(보스 제외)', chance: 0.003 },
  box: { label: '택배 상자', description: '5초 동안 피해를 받지 않는다', chance: 0.003 },
};

export function xpToNext(level) {
  return 5 + (level - 1) * 6 + Math.floor((level - 1) ** 1.6);
}
