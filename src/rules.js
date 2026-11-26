// 숫자는 모두 여기서 바꾼다. 시간 단위는 초, 거리는 월드 픽셀이다.
export const ARENA = { width: 3000, height: 3000 };

// 캐릭터 보너스는 30점 능력치 투자와 별도로 적용한다.
export const CHARACTERS = {
  normal: { label: '일반 오리', description: '치명타로 한 방을 노리는 기본 오리',
    stats: ['치명타 확률 +20%p', '치명타 피해 +35%p'], critChance: 0.2, critDamage: 0.35 },
  summoner: { label: '소환사 오리', description: '동료를 한 명씩 더 부르는 지휘자',
    stats: ['각 소환 무기의 소환 수 +1', '용은 머리 대신 몸통 +2마디'], summonCount: 1 },
  hunter: { label: '트레저헌터 오리', description: '보물을 더 많이 챙기는 탐험가',
    stats: ['보물 슬롯 +1', '보물 20점이면 최대 7칸'], maxRelics: 1 },
  gunner: { label: '총잡이 오리', description: '빠른 연사와 고정 피해를 사용하는 사수',
    stats: ['공격 속도 +30%', '무기 타격당 고정 피해 +8, 레벨마다 +1', '전체 고정 피해 +25%, 레벨마다 +12%'], attackSpeed: 0.3, hitDamage: 8, fixedPower: 0.25,
    levelGrowth: { hitDamage: 1, fixedPower: 0.12 } },
  alchemist: { label: '연금술사 오리', description: '열기와 독, 속성 반응으로 적을 녹이는 연구자',
    stats: ['지속 피해 +25%', '화염·냉기·번개·독·물 속성 피해 +20%', '레벨마다 모든 피해 +10%', '시작 무기: 드라이기'], dotPower: 0.25, elementalPower: 0.2, starter: 'dryer',
    levelGrowth: { might: 0.1 } },
  necromancer: { label: '괴담 오리', description: '원룸 괴담 속 해골 세입자들을 영혼으로 불러 모으고, 병사를 바쳐 건물주까지 키우는 오리',
    stats: ['처치하면 영혼을 얻고(정예 5, 보스 30) R을 눌러 해골을 모집한다', '영혼 창에서 병사를 바쳐 해골 관리인, 집주인, 건물주로 키운다', '레벨업에서 괴담과 지휘 능력을 고르고, 단단한 뼈로 소환수 체력을 강화한다'],
    souls: true, undeadStarter: 'bone' },
  diy: { label: '집돌이 오리', description: '공구로 포탑과 덫을 깔아 자취방을 요새로 만드는 오리',
    stats: ['무기 대신 설치물을 고르고, 설치물은 소환으로 친다', '설치물은 오리 주변에 저절로 깔리고 24초 뒤 해체된다', '못총 포탑으로 시작한다'], builder: true, structureStarter: 'nailgun' },
};
// 집돌이 오리의 설치물. 배열은 1~5레벨 값이다. count는 동시에 깔 수 있는 수다.
export const STRUCTURE_LIFE = 24;
export const STRUCTURE_DEPLOY_SEC = 2.5;
export const STRUCTURES = {
  nailgun: { label: '못총 포탑', description: '가까운 적에게 못을 쉴 새 없이 박는다',
    count: [1, 1, 2, 2, 3], damage: [14, 19, 25, 32, 40], cooldown: [0.55, 0.5, 0.45, 0.4, 0.34], pierce: [0, 0, 1, 1, 2], range: 330, speed: 640 },
  trap: { label: '끈끈이 덫', description: '밟은 적을 붙잡아 느리게 하고 계속 피해를 준다',
    count: [1, 2, 2, 3, 3], damage: [12, 16, 22, 28, 36], radius: [72, 80, 90, 100, 115], tickSec: 0.5, slow: 0.25 },
  barricade: { label: '택배 상자 벽', description: '주변 적을 끌어당기고, 붙은 적을 가시 테이프로 찌른다',
    count: [1, 1, 2, 2, 3], damage: [30, 42, 56, 72, 92], taunt: [200, 225, 250, 280, 310], reach: 42, tickSec: 0.5 },
  mortar: { label: '압력밥솥 박격포', description: '적이 몰린 곳에 뜨거운 밥솥 폭탄을 쏘아 넓게 터뜨린다',
    count: [1, 1, 1, 2, 2], damage: [45, 60, 78, 100, 125], cooldown: [2.6, 2.4, 2.2, 2, 1.8], radius: [72, 80, 88, 98, 110], range: 440, flightSec: 0.7 },
  tesla: { label: '멀티탭 전기 탑', description: '전기를 튀겨 여러 적을 줄줄이 지진다',
    count: [1, 1, 1, 2, 2], damage: [17, 22, 28, 36, 45], cooldown: [1.1, 1, 0.9, 0.8, 0.7], chains: [3, 3, 4, 5, 6], range: 270, jump: 130 },
  blower: { label: '회전 선풍기', description: '적을 향해 부채꼴 바람을 보내 밀어내고 진입을 막는다',
    count: [1, 1, 2, 2, 3], damage: [8, 11, 15, 20, 26], cooldown: [0.75, 0.7, 0.65, 0.6, 0.55], range: 210, cone: 0.85, push: [140, 170, 200, 230, 260] },
  workbench: { label: '공구 작업대', description: '주변 설치물의 공격 속도를 높인다. 여러 작업대는 가장 강한 효과 하나만 적용한다',
    count: [1, 1, 1, 2, 2], radius: [170, 185, 200, 220, 240], haste: [0.15, 0.2, 0.25, 0.3, 0.35] },
};
// 설치물 완성형: Lv 5가 되면 레벨업 첫 칸에 나온다. 배율은 기본값에 곱하고, count, pierce, chains는 더한다.
export const STRUCTURE_EVOLUTIONS = {
  nailgun: { label: '네일건 개틀링', description: '포탑이 하나 더 깔리고, 못을 두 배로 빠르게 박으며 더 많이 꿰뚫는다',
    stats: ['동시에 +1개', '피해 1.7배, 공격 주기 절반', '관통 +2'], count: 1, damage: 1.7, cooldown: 0.5, pierce: 2 },
  trap: { label: '초강력 끈끈이 바닥', description: '더 넓게 깔려 밟은 적을 거의 멈춰 세운다',
    stats: ['범위 1.5배, 피해 2배', '느려짐 85%'], radius: 1.5, damage: 2, slow: 0.15 },
  barricade: { label: '냉장고 요새', description: '냉장고로 쌓은 벽이 더 멀리서 끌어당기고, 붙은 적을 세게 찌른다',
    stats: ['끌어당기는 범위 1.3배', '피해 2.3배, 찌르는 거리 64'], taunt: 1.3, damage: 2.3, reach: 64 },
  mortar: { label: '전기밥솥 폭격', description: '한 번에 밥솥 폭탄 셋을 쏘아 넓게 쓸어 버린다',
    stats: ['폭탄 3발', '범위 1.3배, 피해 1.7배'], shells: 3, radius: 1.3, damage: 1.7 },
  tesla: { label: '멀티탭 폭주', description: '과부하 걸린 멀티탭이 더 멀리, 더 많이, 더 자주 전기를 튀긴다',
    stats: ['연쇄 +4명, 튀는 거리 1.5배', '피해 1.8배, 공격 주기 0.7배'], chains: 4, jump: 1.5, damage: 1.8, cooldown: 0.7 },
  blower: { label: '공업용 송풍기', description: '더 넓고 강한 바람으로 몰려오는 적을 밀어낸다',
    stats: ['사거리 1.3배, 피해 1.6배', '밀어내기 1.4배, 공격 주기 0.8배', '바람이 퍼지는 각도 확대'], range: 1.3, damage: 1.6, push: 1.4, cooldown: 0.8, cone: 1.15 },
  workbench: { label: '자동 공구 작업대', description: '더 넓은 곳의 설치물을 더 빠르게 작동시킨다',
    stats: ['지원 범위 1.25배', '공격 속도 지원 효과 1.5배', '여러 작업대의 효과는 중첩되지 않음'], radius: 1.25, haste: 1.5 },
};
// 설치물 합체: 두 완성형을 갖추면 레벨업 첫 칸에 나온다. 두 설치물은 그대로 남고 능력이 더해진다.
export const STRUCTURE_FUSIONS = {
  zapgun: { label: '전기 못총', parts: ['nailgun', 'tesla'], description: '박힌 못에서 전기가 튀어 주변 적 둘을 더 지진다',
    stats: ['못이 맞힐 때마다 주변 2명에게 연쇄', '연쇄 피해는 못 피해의 60%'], chains: 2, damage: 0.6, jump: 120 },
  stickybomb: { label: '끈끈이 폭탄', parts: ['trap', 'mortar'], description: '밥솥 폭탄이 떨어진 자리에 끈끈이가 5초 동안 눌어붙는다',
    stats: ['폭탄 자리마다 끈끈이 덫', '5초 동안 남고 덫 개수에 들지 않음'], puddleSec: 5 },
  stickyspray: { label: '끈끈이 살포기', parts: ['blower', 'trap'], description: '바람에 끈끈이를 실어 적을 둔화시키고 전방에 끈끈이를 깐다',
    stats: ['바람에 맞은 일반 적을 85% 둔화', '3초마다 전방에 3초 유지되는 끈끈이', '선풍기마다 끈끈이 하나 유지, 설치 수에 들지 않음'], slow: 0.15, slowSec: 0.9, puddleSec: 3, everySec: 3, distance: 125 },
  autoturret: { label: '자동 조립 포탑', parts: ['workbench', 'nailgun'], description: '작업대가 수명이 짧은 소형 못총 포탑을 자동으로 조립한다',
    stats: ['작업대마다 8초마다 소형 포탑 조립', '수명 6초, 못총 기본 피해의 55%', '작업대마다 하나 유지, 설치 수에 들지 않음'], everySec: 8, life: 6, damage: 0.55 },
};
// 집돌이 오리만 보물 상자에서 받는 공구 보물. 보물 칸을 쓰지 않는다.
export const DIY_RELICS = {
  toolbox: { label: '공구함', description: '공구가 넉넉해 설치물을 더 깔 수 있다', stats: ['모든 설치물 동시에 +1개'], extra: 1 },
  ducttape: { label: '강력 테이프', description: '설치물이 쉽게 무너지지 않는다', stats: ['설치물 수명 +50%'], life: 0.5 },
  powerdrill: { label: '충전 드릴', description: '설치가 빨라진다', stats: ['설치 주기 -40%'], deploy: 0.4 },
  blueprint: { label: '설계도', description: '제대로 만든 설치물은 더 아프다', stats: ['설치물 피해 +40%'], damage: 0.4 },
  extension: { label: '연장선', description: '설치물 손이 더 멀리 닿는다', stats: ['설치물 사거리와 범위 +30%'], reach: 0.3 },
};

// 강령술사 전용. 영혼은 처치할 때 바로 모이고, R을 눌러 영혼 창에서 쓴다.
// 영혼 흡수: 지금까지 모은 영혼이 많을수록 해골과 강령술 피해가 오른다. 후반 적 체력을 따라가도록 거듭제곱으로 키운다.
export const SOUL_GROWTH = { per: 1000, power: 0.75, scale: 0.07 };
export const SOULS = { normal: 1, elite: 5, boss: 30 };

// 강령술사의 레벨업 선택지. 오리가 직접 쓰는 강령술과 군단을 키우는 지휘 능력뿐이다.
export const UNDEAD = {
  bone: { label: '뼈 투척', description: '빙글빙글 도는 뼈를 던져 줄지어 선 적을 꿰뚫는다',
    count: [1, 2, 2, 3, 3], damage: [18, 24, 31, 40, 52], cooldown: [1.1, 1, 0.92, 0.84, 0.75], pierce: [2, 2, 3, 3, 4], speed: 420, range: 480 },
  wraith: { label: '망령', description: '오리 둘레를 도는 망령이 닿은 적을 베고 얼려 느리게 한다',
    count: [2, 2, 3, 3, 4], damage: [11, 15, 19, 24, 30], orbit: [70, 75, 80, 88, 96], spin: 2.2, hitEverySec: 0.5, slow: 0.6, slowSec: 0.8 },
  scythe: { label: '저승사자 낫', description: '주위를 크게 베며, 가진 영혼이 많을수록 세게 벤다',
    damage: [34, 45, 58, 74, 92], cooldown: [1.6, 1.5, 1.4, 1.3, 1.2], radius: [80, 86, 92, 100, 110], perSoul: 0.01, maxSoulBonus: 1 },
};
// 강령술 완성형: Lv 5에 짝이 되는 지휘 능력을 가지고 있으면 레벨업에서 나온다.
export const UNDEAD_EVOLUTIONS = {
  bone: { label: '뼈 폭풍', needs: 'drill', description: '커다란 뼈 6개를 한꺼번에 던져 모든 적을 꿰뚫는다',
    stats: ['뼈 6개, 크기 1.7배', '피해 1.5배, 모든 적을 꿰뚫음', '쿨타임 0.6초'], count: 6, damage: 1.5, cooldown: 0.6, pierce: 99, size: 1.7 },
  wraith: { label: '망령 군무', needs: 'march', description: '망령 7마리가 더 넓게 돌며 닿은 적을 거의 멈춰 세운다',
    stats: ['망령 7마리, 도는 거리 1.3배', '피해 1.7배, 0.3초마다 벤다', '느려짐 65%'], count: 7, damage: 1.7, orbit: 1.3, hitEverySec: 0.3, slow: 0.35 },
  scythe: { label: '저승사자 대낫', needs: 'harvest', description: '거대한 낫으로 앞뒤 두 번 베고, 영혼으로 얻는 피해 상한이 두 배가 된다',
    stats: ['범위 2.1배, 피해 1.5배', '0.22초 뒤 반대로 한 번 더 벤다', '영혼 피해 상한 +200%'], damage: 1.5, radius: 2.1, maxSoulBonus: 2, echo: 0.22 },
};
export const COMMANDS = {
  legion: { icon: 'soldier', label: '군단 확장', description: '거느릴 수 있는 병력이 늘어난다', cap: [8, 16, 24, 32, 40] },
  harvest: { icon: 'soul', label: '영혼 수확', description: '처치할 때 얻는 영혼이 늘어난다', soulGain: [0.08, 0.16, 0.24, 0.32, 0.4] },
  drill: { icon: 'giant2', label: '군단 훈련', description: '모든 해골의 공격력이 늘어난다', damage: [0.15, 0.3, 0.45, 0.6, 0.8] },
  vigor: { icon: 'soldier', label: '단단한 뼈', description: '해골과 좀비의 최대 체력이 레벨마다 20% 늘어난다(최대 +100%)', health: [0.2, 0.4, 0.6, 0.8, 1] },
  thrift: { icon: 'soul', label: '값싼 뼈', description: '해골 모집 비용이 줄어든다', discount: [0.08, 0.16, 0.24, 0.32, 0.4] },
  reach: { icon: 'archer', label: '긴 뼈창', description: '해골의 공격 범위와 궁수 사거리가 늘어난다', range: [0.12, 0.24, 0.36, 0.48, 0.6] },
  drum: { icon: 'giant3', label: '전쟁 북', description: '해골의 공격 속도가 빨라진다', attackSpeed: [0.1, 0.2, 0.3, 0.4, 0.5] },
  march: { icon: 'wraith', label: '행군', description: '해골의 이동 속도가 빨라진다', speed: [0.1, 0.2, 0.3, 0.4, 0.5] },
};

// 군단 유닛. cap은 병력 한도에서 차지하는 칸이다. 거인은 모집하지 않고 보물 상자의 의식으로만 만든다.
export const ARMY = {
  soldier: { label: '해골 병사', hp: 80, damage: 24, cooldown: 0.75, speed: 240, range: 46, arc: 2.4, radius: 8, cap: 1 },
  archer: { label: '해골 궁수', hp: 55, damage: 22, cooldown: 1, speed: 220, range: 250, radius: 8, cap: 1, ranged: true, arrowSpeed: 440 },
  giant1: { label: '해골 관리인', hp: 700, damage: 110, cooldown: 1.2, speed: 190, range: 170, slam: 0.7, scar: true, radius: 18, cap: 6, taunt: 160, scale: 1 },
  giant2: { label: '해골 집주인', hp: 1500, damage: 260, cooldown: 1.3, speed: 185, range: 240, slam: 0.75, scar: true, radius: 26, cap: 14, taunt: 210, scale: 1 },
  ranger1: { label: '해골 석궁수', hp: 240, damage: 90, cooldown: 0.9, speed: 220, range: 320, radius: 12, cap: 5, ranged: true, arrowSpeed: 620, bolts: 1, pierce: 3, size: 2 },
  ranger2: { label: '해골 쇠뇌병', hp: 520, damage: 210, cooldown: 1, speed: 205, range: 380, radius: 16, cap: 12, ranged: true, arrowSpeed: 700, bolts: 3, pierce: 6, size: 3 },
  ranger3: { label: '해골 명궁', hp: 900, damage: 520, cooldown: 1.4, speed: 195, range: 440, radius: 20, cap: 20, ranged: true, arrowSpeed: 900, pierce: 0, size: 4, soulArrow: { width: 18, reach: 1.4, blast: 210 } },
  giant3: { label: '해골 건물주', hp: 2600, damage: 380, cooldown: 1.6, speed: 180, range: 260, arc: 6.3, scar: true, radius: 34, cap: 24, taunt: 270, scale: 1, quake: 0.18 },
};
export const ARMY_CAP = 30;
export const NECRO_HEALTH = { levelGrowth: 0.04, invulnerabilitySec: 0.5 };
// 영혼 모집 창. 한 번에 여러 마리를 뽑으며, 남은 병력 칸만큼만 들어온다.
export const RECRUITS = {
  soldier: { label: '해골 병사 모집', description: '해골 병사 2명이 옷장에서 걸어 나온다. 많이 깔려 꾸준히 싸운다', unit: 'soldier', amount: 2, price: 30 },
  archer: { label: '해골 궁수 모집', description: '해골 궁수 2명이 뒤에서 활을 쏜다. 약해서 지켜 줘야 한다', unit: 'archer', amount: 2, price: 60 },
};
// R로 여는 영혼 창에서 고르는 의식. 해골과 영혼을 함께 바치며, 바친 병사만큼 병력 칸을 그대로 차지한다.
export const RITUALS = {
  giant1: { label: '관리인 의식', description: '해골 병사 6명을 바쳐 해골 관리인을 세운다. 적을 끌어모아 내리친다', cost: { soldier: 6 }, souls: 700 },
  giant2: { label: '집주인 의식', description: '관리인과 해골 병사 8명을 합쳐 해골 집주인으로 키운다', cost: { giant1: 1, soldier: 8 }, souls: 3000 },
  ranger1: { label: '석궁 의식', description: '해골 궁수 5명을 바쳐 꿰뚫는 석궁을 쏘는 해골 석궁수를 세운다', cost: { archer: 5 }, souls: 600 },
  ranger2: { label: '쇠뇌 의식', description: '석궁수와 해골 궁수 7명을 합쳐 볼트 3발을 쏘는 해골 쇠뇌병으로 키운다', cost: { ranger1: 1, archer: 7 }, souls: 2400 },
  ranger3: { label: '명궁 의식', description: '쇠뇌병과 해골 궁수 8명을 합쳐 닿는 순간 크게 터지는 영혼 화살을 쏘는 해골 명궁으로 키운다', cost: { ranger2: 1, archer: 8 }, souls: 7200 },
  giant3: { label: '건물주 의식', description: '집주인과 해골 병사 10명을 합쳐 해골 건물주로 키운다. 대검을 한 바퀴 휘두른다', cost: { giant2: 1, soldier: 10 }, souls: 9000 },
};
// 강령술사만 보물 상자에서 받는 보물. 보물 칸을 쓰지 않는다.
export const NECRO_RELICS = {
  gravesoil: { icon: 'ghoul', label: '화분 흙', description: '처치한 적이 보라빛 좀비로 일어나 잠시 함께 싸운다',
    stats: ['처치한 적의 25%가 좀비로 일어난다', '좀비는 7초 동안 싸우고 최대 20마리'], chance: 0.25, max: 20, lifeSec: 7, hp: 45, damage: 15 },
  corpsebomb: { icon: 'corpse', label: '시체 폭탄', description: '쓰러진 적의 시체가 잠시 뒤 터진다',
    stats: ['처치한 적의 35%가 시체를 남긴다', '0.7초 뒤 반경 70 안에 피해 45'], chance: 0.35, damage: 45, radius: 70, fuseSec: 0.7 },
  bonepipe: { label: '뼈 피리', description: '옷장 문을 두드리는 피리. 모집이 싸진다', stats: ['해골 모집 비용 -30%'], discount: 0.3 },
  darkcrown: { label: '등기부등본', description: '의식으로 키운 해골이 더 강해진다', stats: ['관리인 계열과 석궁수 계열의 피해 +50%'], giantPower: 0.5 },
  soulurn: { label: '영혼 저금통', description: '영혼을 더 많이 담는다', stats: ['처치할 때 얻는 영혼 +50%'], soulGain: 0.5 },
};

// 능력치 투자. 게임을 시작할 때 모두 같은 30점을 다섯 파트에 나눈다(파트당 최대 20).
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
      20: { name: '급소 마스터', text: '치명타 확률 +70%p, 치명타 피해 +50%, 치명 전용 장비 해금. 치확 100% 초과분으로 추가 치명 단계 적용(치명 보너스 합연산). 치명타마다 피해 30% 광역 폭발, 0.8초 기절(보스 제외, 해제 후 1.2초 면역)', critChance: 0.7, critDamage: 0.5, stun: 0.8, blastShare: 0.3, blastRadius: 90, blastVisualEverySec: 0.1 },
    } },
  haste: { label: '공속', icon: 'battery', per: { attackSpeed: 0.005 },
    perks: {
      5: { name: '레벨업 질주', text: '레벨업하면 5초 동안 공격 속도 +40%', rushSec: 5, rush: 0.4 },
      10: { name: '큰 손', text: '투사체 크기 +20%, 공격 범위 +10%', projectile: 0.2, area: 0.1 },
      20: { name: '과충전', text: '공격 속도 +10%, 8초마다 3초 동안 공격 속도 1.5배, 고정 피해 패시브 해금', attackSpeed: 0.1, everySec: 8, burstSec: 3, burst: 0.5 },
    } },
  summon: { label: '소환', icon: 'toydrone', per: { summonPower: 0.02, summonSpeed: 0.01 },
    perks: {
      5: { name: '신속 집결', text: '소환 이동 속도 +20%, 탐색·사격 사거리 +20%', speed: 0.2, range: 0.2 },
      10: { name: '군단 훈련', text: '소환 공격 속도 +25%', attackSpeed: 0.25 },
      20: { name: '군단 지휘', text: '소환 휘장·증원 호루라기 패시브 해금: 레벨업으로 소환 피해와 소환수 증가' },
    } },
  // 보물 피해는 폭죽, 팝콘 기계, 물파스처럼 보물이 직접 주는 피해다.
  treasure: { label: '보물', icon: 'chest', per: { relicPower: 0.02, relicHaste: 0.01 },
    perks: {
      5: { name: '보물 하나 더', text: '시작할 때 보물을 하나 더 골라요', relics: 1 },
      10: { name: '반짝반짝', text: '보물 피해 +30%, 보물 발동 주기 -30%', relicPower: 0.3, relicHaste: 0.3 },
      20: { name: '보물 사냥꾼', text: '보물 6칸, 공격 보물과 보물 패시브가 나와요. 리롤 +1회, 일반 몹 처치 시 0.02% 확률로 보물상자. 대신 무기는 1칸', maxRelics: 3, offers: 1, maxWeapons: 1, rerolls: 1, chestChance: 0.0002, chestLimit: 2 },
    } },
  // 기존 저장 배분의 우선순위를 보존하도록 마지막에 추가한다.
  dot: { label: '지속·속성', icon: 'thermos', per: { dotPower: 0.015, elementalPower: 0.01 },
    perks: {
      5: { name: '농도 조절', text: '지속 피해 +15%', dotPower: 0.15 },
      10: { name: '속성 연구', text: '화염·냉기·번개·독·물 속성 피해 +20%', elementalPower: 0.2 },
      20: { name: '연금술 완성', text: '보스·정예에게 지속 피해 +25%, 지속·속성 전용 패시브와 보물 해금', dotElitePower: 0.25 },
    } },
  // 강령술사의 해골 군단을 키운다. 다른 오리에게는 효과가 없다.
  necro: { label: '괴담', icon: 'soldier', per: { armyPower: 0.03 },
    perks: {
      5: { name: '룸메이트 모집', text: '모집할 때 해골이 1명 더 일어난다', recruitBonus: 1 },
      10: { name: '세입자 군단', text: '병력 한도 +20, 처치할 때 영혼 +1', cap: 20, souls: 1 },
      20: { name: '건물주의 위엄', text: '해골 피해 +25%, 의식에 바치는 병사와 궁수 -4명', power: 0.25, ritualDiscount: 4 },
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
    const points = Math.max(0, Math.min(BUILD_MAX, left, Math.floor(Number(tree === 'summon' ? build.summon ?? build.survival : build[tree]) || 0)));
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

// 밀어내기 대신 짧은 타격 둔화. 연타로 감소율이 중첩되지 않고 보스는 면역이다.
export const HIT_SLOW = { speed: 0.75, eliteSpeed: 0.85, durationSec: 0.35 };

// 타격 기절·빙결은 연타로 연장하지 않고 해제 후 회복 시간을 공유한다.
export const HIT_FREEZE = { recoverySec: 1.2 };

// 8분에 체력을 두 배로 올린 뒤 기존 난이도에 분당 15%를 추가로 곱한다.
export const HP_SURGE = { from: 8 * 60, warningSec: 5, multiplier: 2, growthPerMinute: 0.15 };

export function hpSurgeAt(time) {
  if (time < HP_SURGE.from) return 1;
  return HP_SURGE.multiplier * (1 + HP_SURGE.growthPerMinute) ** ((time - HP_SURGE.from) / 60);
}

// 시간이 갈수록 끝없이 세진다. 정해진 끝은 없지만, 14분부터는 벽처럼 세져서 20분 안팎이 한계다.
export function difficultyAt(time) {
  const minutes = time / 60;
  // 6분부터는 보물과 합체 무기까지 갖춘 오리를 상대해야 해서 훨씬 가파르게 세진다.
  const late = Math.max(0, minutes - 6);
  // 14분부터는 벽: 체력이 크게 뛰고, 한 번에 깎이는 체력 상한도 커진다.
  const wall = Math.max(0, minutes - 14);
  return {
    hp: (1 + minutes * 0.45 + minutes * minutes * 0.09 + late * 1.2 + late * late * 0.45 + late * late * late * 0.05 + wall * wall * wall * 1.5) * hpSurgeAt(time),
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
  dustbunny: { label: '먼지 토끼', description: '착지 위치를 예고한 뒤 충분한 거리를 두고 순간 이동한다', hp: 24, speed: 70, radius: 11, damage: 7, xp: 3,
    from: 340, weight: 2, blinkEverySec: 4.2, blinkMin: 320, blinkTo: 280, blinkSafe: 240, blinkAimSec: 0.9, blinkGraceSec: 0.65 },
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
// 선택 카드에 보이는 공격 유형
export const WEAPON_TYPES = {
  spray: '투사체', slipper: '투사체', roller: '투사체', laser: '관통', stapler: '투사체', ball: '투사체', paperplane: '유도', coin: '투사체', hourglass: '투사체',
  dehumidifier: '지속', dryer: '지속', coil: '지속', bleach: '장판',
  broom: '범위', fan: '범위', towel: '범위', microwave: '범위', handbell: '범위', swatter: '강타',
  sawblade: '투사체', mopstorm: '범위',
  zapper: '연쇄', compass: '연쇄', detergent: '설치', mousetrap: '설치', shower: '낙하', seal: '낙하',
};

export function weaponTypeOf(id) {
  if (WEAPON_TYPES[id]) return WEAPON_TYPES[id];
  if (WEAPONS[id]?.summon) return '소환';
  const fused = FUSIONS[id];
  if (fused) return fused.primary ? weaponTypeOf(fused.primary) : '소환';
  return '';
}

// 공격 모양(투사체·연쇄)과 빌드 계열은 별도다. 완성형은 기본 무기 ID를 쓴다.
export const WEAPON_CATEGORIES = { strike: '타격', dot: '지속', summon: '소환', treasure: '보물', elemental: '속성' };
export const ELEMENTS = { fire: '화염', ice: '냉기', lightning: '번개', poison: '독', water: '물' };
// 속성 타격마다 붙는 상태 이상. 지속 피해로 붙인 상태는 다시 속성 효과를 일으키지 않는다.
export const ELEMENT_EFFECTS = {
  fire: { label: '화상', text: '2초 동안 불타 맞은 피해의 25%를 초당 입는다', burnSec: 2, burn: 0.25 },
  poison: { label: '중독', text: '3초 동안 독이 쌓인다. 최대 5중첩, 중첩마다 맞은 피해의 6%를 초당 입는다', poisonSec: 3, poison: 0.06, maxStacks: 5 },
  ice: { label: '둔화', text: '1.5초 동안 이동 속도 40% 감소(보스 15%)', slowSec: 1.5, slow: 0.6, bossSlow: 0.85 },
  lightning: { label: '감전', text: '30% 확률로 근처 적에게 피해 40% 전이. 젖은 적은 2명에게 전이하고 피해 +30%', chance: 0.3, chain: 0.4, range: 130, wetTargets: 2, wetBonus: 0.3 },
  water: { label: '젖음', text: '3초 동안 이동 속도 20% 감소, 번개에 약해지고 화상이 꺼진다', wetSec: 3, slow: 0.8 },
};
// 장판·불꽃처럼 매 순간 닿는 공격은 이 간격마다 한 번만 상태 이상을 건다.
export const ELEMENT_DOT_GAP = 0.25;
const DOT_WEAPONS = new Set(['bleach', 'dehumidifier', 'dryer', 'poisongun', 'dryoven', 'sawblade', 'bleachbot', 'spinlaser']);
const WEAPON_ELEMENTS = {
  spray: ['poison'], bleach: ['poison'], dryer: ['fire'], dehumidifier: ['fire'], coil: ['fire'],
  zapper: ['lightning'], detergent: ['water'], towel: ['water'], microwave: ['fire'], shower: ['water'],
  thunderdragons: ['lightning'], stormcrane: ['lightning'], stormcompass: ['lightning'], thunderball: ['lightning'],
  shockshower: ['water', 'lightning'], firelegion: ['fire'], firering: ['fire'], dryoven: ['fire'],
  poisongun: ['poison'], bleachbot: ['poison'], thorngarden: ['poison'],
};
export function weaponElementsOf(id) {
  if (Object.hasOwn(WEAPON_ELEMENTS, id)) return [...WEAPON_ELEMENTS[id]];
  const fusion = Object.hasOwn(FUSIONS, id) ? FUSIONS[id] : null;
  return fusion ? [...new Set(fusion.from.flatMap(weaponElementsOf))] : [];
}
export function weaponCategoriesOf(id) {
  const weapon = Object.hasOwn(WEAPONS, id) ? WEAPONS[id] : null;
  const fusion = Object.hasOwn(FUSIONS, id) ? FUSIONS[id] : null;
  if (!weapon && !fusion) return [];
  const primary = weapon ?? WEAPONS[fusion.primary ?? fusion.from.find(part => WEAPONS[part].summon) ?? fusion.from[0]];
  const categories = [];
  if (primary.summon) categories.push('summon');
  if (primary.treasureScaling) categories.push('treasure');
  if (DOT_WEAPONS.has(id)) categories.push('dot');
  if (weaponElementsOf(id).length) categories.push('elemental');
  return categories.length ? categories : ['strike'];
}
export const weaponCategoryOf = id => weaponCategoriesOf(id)[0] ?? '';

// 보물도 속성 피해 계산에 같은 정의를 사용한다. 중복 속성은 배율을 중첩하지 않는다.
export const RELIC_ELEMENTS = {
  match: 'fire', heatpad: 'fire', firecracker: 'fire', freshener: 'poison',
  outlet: 'lightning', purifier: 'ice', pas: 'ice', humidifier: 'water',
};

export const WEAPONS = {
  papercrane: {
    label: "종이학",
    summon: "ranged",
    pierce: 1,
    description: "접은 종이학이 빠른 관통 깃털을 쏜다",
    damage: [12, 16, 21, 28, 36],
    count: [1, 1, 1, 2, 2],
    cooldown: [0.8, 0.752, 0.696, 0.64, 0.576],
    speed: [150, 165, 180, 200, 225],
    range: [420, 454, 487, 525, 567],
    bulletSpeed: 520,
  },
  cactus: {
    label: "선인장 포대",
    summon: "artillery",
    description: "선인장이 넓게 터지는 가시 열매를 포격한다",
    damage: [25, 33, 43, 55, 70],
    count: [1, 1, 1, 2, 2],
    cooldown: [1.8, 1.692, 1.566, 1.44, 1.296],
    speed: [150, 165, 180, 200, 225],
    range: [450, 486, 522, 562, 608],
    bulletSpeed: 340,
    radius: [44, 50, 58, 66, 76],
  },
  chessrook: {
    label: "체스 룩",
    summon: "charge",
    description: "돌로 만든 룩이 적 무리를 일직선으로 관통 돌진한다",
    damage: [32, 43, 56, 72, 92],
    count: [1, 1, 1, 2, 2],
    cooldown: [2.2, 2.068, 1.914, 1.76, 1.584],
    speed: [230, 260, 290, 320, 350],
    range: [430, 464, 499, 538, 580],
    radius: 22,
  },
  plushbear: {
    label: "곰 인형",
    finisher: { label: "대지 강타", damage: 3.5, radius: 150, cooldown: 2.5 },
    summon: "melee",
    description: "곰 인형이 앞장서 근접한 적 무리를 함께 후려친다",
    damage: [31, 41, 53, 69, 88],
    count: [1, 1, 1, 2, 2],
    cooldown: [0.88, 0.827, 0.766, 0.704, 0.634],
    speed: [188, 207, 225, 250, 282],
    range: [42, 45, 49, 52, 57],
    seek: 500,
    cleave: 36,
  },
  toyaxe: {
    label: "태엽 도끼병",
    finisher: { label: "거인 내려찍기", damage: 4, length: 320, halfWidth: 80, cooldown: 2.5 },
    summon: "sword",
    description: "도끼병이 바라보는 쪽으로 도끼를 내리쳐 일직선의 적을 벤다",
    damage: [36, 48, 62, 81, 104],
    count: [1, 1, 1, 2, 2],
    cooldown: [1.36, 1.278, 1.183, 1.088, 0.979],
    speed: [188, 207, 225, 250, 282],
    range: [90, 97, 104, 112, 122],
    seek: 520,
    arc: 3.5,
    scarSec: 0.55,
    // 원호 대신 일직선으로 벤다. 길이는 사거리의 배수, 폭은 반폭이다.
    line: true,
    lineScale: 1.8,
    lineWidth: 20,
  },
  coin: {
    label: "행운 동전",
    pattern: "fan",
    treasureScaling: true,
    description: "앞쪽 부채꼴로 동전을 흩뿌린다 · 보물 피해 증가도 적용",
    damage: [24, 31, 41, 53, 67],
    cooldown: [1, 0.95, 0.9, 0.85, 0.8],
    range: [260, 281, 302, 325, 351],
    radius: [40, 46, 53, 61, 70],
    count: [3, 3, 4, 4, 5],
  },
  handbell: {
    label: "손종",
    pattern: "pulse",
    treasureScaling: true,
    description: "주변을 둥글게 울려 가까운 적을 한 번씩 때린다 · 보물 피해 증가도 적용",
    damage: [44, 57, 75, 97, 123],
    cooldown: [2.2, 2.09, 1.98, 1.87, 1.76],
    range: [220, 238, 255, 275, 297],
  },
  compass: {
    label: "나침반",
    pattern: "chain",
    treasureScaling: true,
    description: "가까운 적부터 길을 잇듯 연쇄 타격한다 · 보물 피해 증가도 적용",
    damage: [26, 34, 44, 57, 73],
    cooldown: [1.5, 1.425, 1.35, 1.275, 1.2],
    range: [330, 356, 383, 412, 446],
    radius: [40, 46, 53, 61, 70],
    count: [3, 3, 4, 4, 5],
  },
  seal: {
    label: "보물 도장",
    pattern: "stamp",
    treasureScaling: true,
    description: "멀리 있는 적의 위치에 도장을 찍어 뭉친 적을 공격한다 · 보물 피해 증가도 적용",
    damage: [65, 84, 110, 143, 182],
    cooldown: [2.5, 2.375, 2.25, 2.125, 2.0],
    range: [460, 497, 534, 575, 621],
    radius: [40, 46, 53, 61, 70],
    count: [3, 3, 4, 4, 5],
  },
  hourglass: {
    label: "모래시계",
    pattern: "cross",
    treasureScaling: true,
    description: "시계 방향으로 회전하는 십자 모양 모래 바람을 보낸다 · 보물 피해 증가도 적용",
    damage: [38, 49, 65, 84, 106],
    cooldown: [1.7, 1.615, 1.53, 1.445, 1.36],
    range: [300, 324, 348, 375, 405],
    radius: [40, 46, 53, 61, 70],
  },

  spray: {
    label: '살충제', description: '가까운 적에게 약을 뿌린다',
    cooldown: [0.9, 0.8, 0.7, 0.6, 0.55], damage: [12, 15, 18, 22, 26], count: [1, 1, 2, 2, 3],
    pierce: [0, 1, 1, 2, 3], speed: 430, lifeSec: 1.1,
  },
  broom: {
    label: '빗자루', description: '주변을 크게 쓸어 버린다',
    cooldown: [1.4, 1.25, 1.1, 1.0, 0.85], damage: [20, 26, 33, 41, 50], radius: [76, 86, 96, 108, 122], slows: true,
  },
  bleach: {
    label: '락스', description: '적이 몰린 곳에 독한 웅덩이를 남긴다',
    cooldown: [3.2, 2.9, 2.6, 2.3, 2.0], dps: [22, 28, 35, 43, 54], radius: [58, 64, 70, 78, 88], count: [1, 1, 2, 2, 3],
    lifeSec: 3,
  },
  dehumidifier: {
    label: '제습기', description: '곁에 오는 적을 계속 말린다',
    dps: [18, 24, 31, 39, 48], radius: [95, 108, 122, 138, 156],
  },
  swatter: {
    label: '파리채', description: '가장 센 적을 세게 내려친다',
    cooldown: [2.0, 1.8, 1.6, 1.4, 1.2], damage: [60, 75, 90, 105, 120], radius: [42, 46, 52, 58, 66],
  },
  slipper: {
    label: '슬리퍼', description: '가까운 적을 따라 날아가고, 돌아오며 한 번 더 때린다',
    cooldown: [1.9, 1.7, 1.5, 1.35, 1.2], damage: [16, 20, 25, 30, 36], count: [1, 1, 2, 2, 3], speed: 390, rangeSec: 0.85, turn: 3.2,
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
    label: '돌돌이', description: '가까운 적 쪽으로 굴러가며 경로의 적을 모두 훑는다',
    cooldown: [2.6, 2.4, 2.2, 2.0, 1.7], damage: [30, 38, 47, 57, 70], size: [18, 20, 22, 25, 28], speed: 330, lifeSec: 1.8,
  },
  dryer: {
    label: '드라이기', description: '가까운 적 쪽으로 뜨거운 바람을 계속 쏜다',
    dps: [30, 39, 49, 61, 76], range: [150, 165, 180, 200, 220], spread: 0.5, turn: 10,
  },
  fan: {
    label: '선풍기', description: '강풍으로 앞의 적을 때리고 느리게 한다',
    // cone은 바라보는 쪽에서 양옆으로 바람이 닿는 각도(라디안)다.
    cooldown: [2.6, 2.4, 2.2, 2.0, 1.8], damage: [18, 25, 33, 42, 52], range: [220, 240, 260, 285, 310], slows: true, cone: 1.0,
  },
  laser: {
    label: '레이저 포인터', description: '가까운 적을 조준해 일직선의 적을 꿰뚫는다',
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
    label: '로봇청소기', summon: 'robot', description: '혼자 돌아다니며 가까운 적을 들이받는다',
    damage: [10, 13, 16, 20, 25], count: [1, 1, 1, 2, 2], speed: [125, 134, 144, 156, 170], radius: 12, hitEverySec: 0.45,
  },
  towel: {
    // 젖어서 맞은 적은 잠깐 느려진다(보스 제외).
    label: '젖은 수건', description: '앞을 넓고 길게 후려치고, 맞은 적을 적셔 느리게 한다. 2레벨부터 양쪽',
    cooldown: [1.0, 0.92, 0.84, 0.76, 0.68], damage: [26, 33, 41, 50, 62], length: [170, 185, 200, 220, 245], count: [1, 2, 2, 2, 2],
    height: 64, slows: true, slow: 0.65, slowSec: 1,
  },
  paperplane: {
    label: '종이비행기', description: '적을 쫓아가는 비행기를 날린다',
    cooldown: [1.6, 1.45, 1.3, 1.15, 1.0], damage: [14, 17, 21, 25, 30], count: [1, 1, 2, 2, 2], speed: 260, turn: 4.5, lifeSec: 3,
  },
  mousetrap: {
    label: '쥐덫', description: '다가오는 적의 경로에 덫을 놓고, 밟으면 탁 닫힌다',
    cooldown: [2.5, 2.3, 2.1, 1.9, 1.7], damage: [60, 75, 95, 115, 140], count: [1, 1, 2, 2, 3], radius: [30, 32, 34, 37, 40],
    lifeSec: 8, maxTraps: 12,
  },
  microwave: {
    label: '전자레인지', description: '퍼져 나가는 파동으로 주변을 데운다',
    cooldown: [2.6, 2.4, 2.2, 2, 1.8], damage: [28, 35, 44, 54, 66], radius: [150, 165, 180, 200, 220], growSec: 0.55,
  },
  shower: {
    label: '샤워기', description: '적 머리 위로 물줄기를 떨어뜨린다',
    cooldown: [1.4, 1.3, 1.2, 1.1, 1.0], damage: [16, 19, 23, 27, 32], count: [2, 3, 3, 4, 5], radius: [34, 36, 38, 41, 44], fallSec: 0.35,
  },
  sockpuppet: {
    label: '양말 인형', summon: 'melee', description: '양말 인형이 적을 쫓아가 가까이서 주먹을 날린다',
    damage: [22, 29, 38, 50, 64], count: [1, 1, 2, 2, 3], cooldown: [0.72, 0.672, 0.624, 0.576, 0.52],
    speed: [182, 198, 215, 235, 257], range: [32, 35, 38, 42, 46], seek: 500,
  },
  toydrone: {
    label: '장난감 드론', summon: 'ranged', description: '호위 드론이 플레이어 곁을 돌며 적을 조준해 사격한다',
    damage: [10, 13, 17, 22, 28], count: [1, 1, 2, 2, 3], cooldown: [1.05, 0.96, 0.86, 0.76, 0.65],
    speed: [150, 165, 180, 195, 210], range: [330, 365, 405, 450, 490], bulletSpeed: 460,
  },
  windcar: {
    label: '태엽 자동차', summon: 'charge', description: '태엽 자동차가 적을 향해 돌진해 경로를 쓸고 돌아온다',
    damage: [24, 32, 42, 54, 68], count: [1, 1, 1, 2, 2], cooldown: [2, 1.85, 1.7, 1.5, 1.3],
    speed: [240, 270, 300, 330, 360], range: [280, 315, 350, 390, 430], radius: 18,
  },
  toydragon: {
    label: '장난감 용', summon: 'dragon', description: '한 마리의 긴 용이 적을 휘감는다. 소환 수가 늘면 몸통이 길어진다',
    damage: [18, 24, 31, 40, 52], count: [1, 1, 2, 2, 3],
    speed: [145, 160, 175, 195, 215], range: [340, 370, 410, 450, 500],
    segments: 6, segmentsPerCount: 2, spacing: 20, radius: 12, hitEverySec: 0.4,
    turnSpeed: 3.5, circleRadius: 100, passRange: 100, passDistance: 100, roam: 560, recall: 850,
  },
  toyknight: {
    label: '장난감 검사', finisher: { label: '회전 섬멸', damage: 3, radius: 180, cooldown: 2.5 }, summon: 'sword', description: '검사가 적을 추격해 넓게 베고 바닥에 푸른 검흔을 남긴다',
    damage: [32, 42, 55, 71, 90], count: [1, 1, 1, 2, 2], cooldown: [1.275, 1.19, 1.105, 0.977, 0.892],
    speed: [194, 213, 232, 250, 275], range: [76, 84, 94, 106, 118], seek: 520,
    arc: 2.6, scarSec: 0.7,
  },
  plantspirit: {
    label: '화분 정령', summon: 'artillery', description: '따라다니는 화분 정령이 적중하면 넓게 터지는 씨앗을 던진다',
    damage: [20, 27, 35, 44, 54], count: [1, 1, 1, 2, 2], cooldown: [1.7, 1.55, 1.4, 1.25, 1.1],
    speed: [120, 135, 150, 165, 180], range: [300, 340, 380, 420, 460], radius: [36, 42, 49, 56, 64], bulletSpeed: 300,
  },
};

// 패시브의 배열 길이가 최대 레벨이다. 공격력은 20, 이동 속도·치명타 확률은 10, 증원 호루라기는 3, 나머지는 5레벨이다.
export const SECRET_MAPS = ['mapnorth', 'mapsouth', 'mapwest', 'mapeast'];
// 네 조각을 합한 적 처치당 확률. 일반 소모품과 따로 굴리고 정예·우상 보정을 받지 않는다.
export const SECRET_MAP_DROP_CHANCE = 0.0004;
export const PASSIVES = {
  sights: { label: '붉은 조준경', critOnly: true, description: '치명 20점 전용. 치명타 확률을 높인다', critChance: [0.03, 0.06, 0.09, 0.12, 0.15] },
  redink: { label: '급소 잉크', critOnly: true, description: '치명 20점 전용. 치명타 한 방의 위력을 높인다', critDamage: [0.15, 0.3, 0.45, 0.6, 0.75] },
  shatterlens: { label: '파쇄 렌즈', critOnly: true, description: '치명 20점 전용. 치명 폭발의 반경을 넓힌다', critBlastArea: [0.08, 0.16, 0.24, 0.32, 0.4] },
  catalyst: { label: '반응 촉매', dot20Only: true, description: '지속·속성 20점 전용. 독·화상·장판과 연속 피해를 강화한다', dotPower: [0.12, 0.24, 0.36, 0.48, 0.6] },
  spectrum: { label: '분광 시약', dot20Only: true, description: '지속·속성 20점 전용. 속성 무기와 속성 공격 보물의 피해를 높인다. 고정 피해 제외', elementalPower: [0.08, 0.16, 0.24, 0.32, 0.4] },
  corrosion: { label: '부식 용액', dot20Only: true, description: '지속·속성 20점 전용. 보스·정예에게 주는 지속 피해를 높인다', dotElitePower: [0.1, 0.2, 0.3, 0.4, 0.5] },
  displaystand: { label: '진열 받침대', treasureOnly: true, description: '보물 20점 전용. 공격 보물의 범위와 사거리를 넓힌다', relicRange: [0.06, 0.12, 0.18, 0.24, 0.3] },
  appraisal: { label: '감정 수첩', treasureOnly: true, description: '보물 20점 전용. 캐릭터 레벨마다 보물 피해가 추가로 오른다', relicLevelPower: [0.004, 0.008, 0.012, 0.016, 0.02] },
  collection: { label: '수집 도감', treasureOnly: true, description: '보물 20점 전용. 사용 중인 보물 슬롯 하나마다 보물 피해가 오른다', relicSlotPower: [0.02, 0.04, 0.06, 0.08, 0.1] },
  mapnorth: { label:'상단 지도',description:'잃어버린 지도의 위쪽 조각',hidden:true,treasureOnly:true,relicPower:[0.15] },
  mapsouth: { label:'하단 지도',description:'잃어버린 지도의 아래쪽 조각',hidden:true,treasureOnly:true,relicPower:[0.15] },
  mapwest: { label:'왼쪽 지도',description:'잃어버린 지도의 왼쪽 조각',hidden:true,treasureOnly:true,relicPower:[0.15] },
  mapeast: { label:'오른쪽 지도',description:'잃어버린 지도의 오른쪽 조각',hidden:true,treasureOnly:true,relicPower:[0.15] },
  idol: { label:'우상',description:'상하좌우 지도 네 조각을 주우면 고대의 우상이 깨어난다',hidden:true,treasureOnly:true,requiresMaps:true,
    inheritedRelicPower:[0.6],relicPower:[0.5],relicRepeats:[1],echoDamage:[1],dropBonus:[0.01],echoDelay:0.18 },

  sneakers: { label: '운동화', description: '더 빨리 움직인다', speed: [0.1, 0.2, 0.28, 0.35, 0.42, 0.48, 0.54, 0.6, 0.65, 0.7] },
  vacuum: { label: '청소기', description: '먼지를 더 멀리서 빨아들인다', pickup: [0.4, 0.8, 1.2, 1.6, 2.0] },
  vitamin: { label: '비타민', description: '최대 체력과 회복력이 오른다', maxHp: [10, 20, 30, 40, 50], regen: [0.4, 0.8, 1.2, 1.6, 2] },
  battery: { label: '보조배터리', description: '무기를 더 자주 쓴다', haste: [0.07, 0.13, 0.19, 0.24, 0.3] },
  candle: { label: '향초', description: '먼지에서 경험치를 더 얻는다', xpGain: [0.1, 0.2, 0.3, 0.4, 0.5] },
  // 범위는 반경과 사거리를 넓히고, 드라이기와 선풍기는 바람이 퍼지는 폭도 같이 넓힌다.
  wipes: { label: '물티슈', description: '무기 범위가 넓어지고, 드라이기·선풍기 바람 폭도 넓어진다', area: [0.08, 0.16, 0.24, 0.32, 0.4] },
  protein: { label: '단백질 셰이크', description: '모든 무기의 공격력이 오른다', might: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0] },
  magnifier: { label: '돋보기', description: '날아가는 것들이 커진다', size: [0.3, 0.6, 0.9, 1.2, 1.5] },
  clover: { label: '네잎클로버', description: '레벨마다 치명타 확률 +6%, 최대 +60%', critChance: [0.06, 0.12, 0.18, 0.24, 0.3, 0.36, 0.42, 0.48, 0.54, 0.6] },
  // 치명타 확률이 없으면 쓸모가 없어서, 네잎클로버를 가진 뒤에만 나온다.
  hotsauce: { label: '핫소스', description: '치명타가 더 아프다', critDamage: [0.25, 0.5, 0.75, 1.0, 1.25], requires: 'clover' },
  // 보물 패시브: 보물 파트 20점이어야 나온다. 보물이 직접 주는 피해와 발동 주기만 바꾼다.
  polish: { label: '광택제', description: '보물을 반짝반짝 닦아 보물 피해가 오른다', relicPower: [0.15, 0.3, 0.45, 0.6, 0.75], treasureOnly: true },
  windup: { label: '태엽 열쇠', description: '보물이 더 자주 발동한다', relicHaste: [0.08, 0.16, 0.24, 0.32, 0.4], treasureOnly: true },
  // 공속 패시브: 패널티와 고정 피해가 함께 성장한다.
  precision: { label: '정밀 스프링', hasteOnly: true, requiresFixedDamage: true, description: '직접 타격 시 10~50% 확률로 현재 고정 피해를 한 번 더 적용한다. 공속 20점·고정 피해 보유 시 등장. 추가 피해는 치명타·공격력 증폭·타격 효과·연타 수·재발동 적용 제외',
    fixedEchoChance: [0.1, 0.2, 0.3, 0.4, 0.5] },
  lightgear: { label: '경량 기어', hasteOnly: true, description: '무기 기본 피해를 낮추고 타격당 고정 피해를 더한다(추가 피해는 치명타·공격력 증폭과 지속 피해 적용 제외)',
    weaponPenalty: [0.15, 0.3, 0.45, 0.6, 0.75], hitDamage: [24, 48, 72, 96, 120] },
  counterweight: { label: '균형추', hasteOnly: true, description: '공격력을 낮추는 대신 고정 피해를 더하고 경량 기어·균형추의 고정 피해가 캐릭터 레벨에 비례해 성장한다. 5레벨부터 같은 적 8회 타격 시 주변에 추가 고정 피해의 40% 방출(원래 적 제외, 연쇄 발동 없음)',
    attackPenalty: [0.15, 0.3, 0.45, 0.6, 0.75], hitDamage: [32, 64, 96, 128, 160], fixedGrowth: [0.002, 0.004, 0.006, 0.008, 0.01], fixedSplash: [0, 0, 0, 0, 0.4], dischargeHits: 8, dischargeRadius: 90 },
  summoncrest: { label: '소환 휘장', summonOnly: true, description: '소환 20점 전용. 소환 피해를 레벨마다 +12%, 최대 +60% 올린다', summonPower: [0.12, 0.24, 0.36, 0.48, 0.6] },
  summonwhistle: { label: '증원 호루라기', summonOnly: true, description: '소환 20점 전용. 각 소환 무기의 소환수를 레벨마다 한 명, 최대 세 명 추가한다', summonCount: [1, 2, 3] },
};

export const MAX_LEVEL = 5;

// 패시브마다 최대 레벨이 다르다. 효과 배열의 길이로 정한다.
export function passiveMaxLevel(id) {
  return Object.values(PASSIVES[id]).find(Array.isArray).length;
}

// 5레벨을 채운 무기는 완성형으로 한 번 더 바뀐다.
export const EVOLUTIONS = {
  papercrane: {
    label: "백학 편대",
    icon: "papercraneplus",
    description: "접은 종이학이 빠른 관통 깃털을 쏜다 · 소환 수와 공격이 강화된다",
    damage: 1.8,
    count: 3,
    shots: 3,
    pierce: 2,
  },
  cactus: {
    label: "사막 수호자",
    icon: "cactusplus",
    description: "선인장이 넓게 터지는 가시 열매를 포격한다 · 소환 수와 공격이 강화된다",
    damage: 1.8,
    count: 3,
    shots: 2,
    radius: 1.4,
  },
  chessrook: {
    label: "철벽 캐슬",
    icon: "chessrookplus",
    description: "돌로 만든 룩이 적 무리를 일직선으로 관통 돌진한다 · 소환 수와 공격이 강화된다",
    damage: 1.8,
    count: 3,
    size: 1.4,
    blast: 110,
  },
  plushbear: {
    label: "대장 곰",
    icon: "plushbearplus",
    description: "곰 인형이 앞장서 근접한 적 무리를 함께 후려친다 · 소환 수와 공격이 강화된다",
    damage: 1.8,
    count: 3,
    cleave: 80,
  },
  toyaxe: {
    label: "쌍날 도끼병",
    icon: "toyaxeplus",
    description: "도끼병이 일직선으로 내리쳐 벤다 · 소환 수와 공격이 강화되고 베기 폭이 넓어진다",
    damage: 1.8,
    count: 3,
    arc: 5.2,
    range: 1.3,
    lineWidth: 28,
  },
  coin: {
    label: "금화 주머니",
    icon: "coinplus",
    description: "앞쪽 부채꼴로 동전을 흩뿌린다 · 피해와 범위가 증가하고 타격 횟수가 늘어난다",
    damage: 2,
    range: 1.25,
    radius: 1.5,
    count: 7,
  },
  handbell: {
    label: "풍요의 종",
    icon: "handbellplus",
    description: "주변을 둥글게 울려 가까운 적을 한 번씩 때린다 · 피해와 공격 범위가 크게 증가한다",
    damage: 2,
    range: 1.25,
  },
  compass: {
    label: "황금 나침반",
    icon: "compassplus",
    description: "가까운 적부터 길을 잇듯 연쇄 타격한다 · 피해와 범위가 증가하고 타격 횟수가 늘어난다",
    damage: 2,
    range: 1.25,
    radius: 1.5,
    count: 7,
  },
  seal: {
    label: "왕실 도장",
    icon: "sealplus",
    description: "멀리 있는 적의 위치에 도장을 찍어 뭉친 적을 공격한다 · 피해와 범위가 증가하고 타격 횟수가 늘어난다",
    damage: 2,
    range: 1.25,
    radius: 1.5,
    count: 7,
  },
  hourglass: {
    label: "영원의 모래시계",
    icon: "hourglassplus",
    description: "시계 방향으로 회전하는 십자 모양 모래 바람을 보낸다 · 피해와 공격 범위가 크게 증가한다",
    damage: 2,
    range: 1.25,
    radius: 1.5,
  },

  spray: { label: '업소용 분사기', description: '사방으로 뿜고 약이 적을 모두 뚫는다', damage: 1.4, ring: 8 },
  broom: { label: '회오리 빗자루', description: '더 넓게, 연달아 두 번 쓴다', damage: 1.5, radius: 1.35 },
  bleach: { label: '원액 락스', description: '웅덩이가 넓고 오래 가며 적을 느리게 한다', dps: 1.6, radius: 1.35, lifeSec: 5, slow: 0.5 },
  dehumidifier: { label: '산업용 제습기', description: '넓은 범위의 적을 바싹 말려 느리게 한다', dps: 1.8, radius: 1.4, slow: 0.65 },
  swatter: { label: '전설의 파리채', description: '센 적 셋을 한꺼번에 내려친다', damage: 1.5, targets: 3 },
  slipper: { label: '슬리퍼 폭풍', description: '슬리퍼 여덟 짝이 사방으로 날아간다', damage: 1.3, count: 8 },
  coil: { label: '불꽃 모기향', description: '바깥에 불씨 고리가 하나 더 돈다', damage: 1.5, outer: 1.75 },
  zapper: { label: '벼락 파리채', description: '전기가 훨씬 멀리, 더 많이 튄다', damage: 1.5, chains: 16, jump: 1.5 },
  detergent: { label: '거품 폭탄', description: '거품이 두 배로 나오고 훨씬 크게 터진다', damage: 1.3, radius: 1.5, double: true },
  roller: { label: '대형 돌돌이', description: '표적 쪽과 반대쪽으로 커다란 돌돌이를 굴린다', damage: 1.5, size: 1.5, both: true },
  dryer: { label: '업소용 열풍기', description: '더 멀리, 더 넓게, 더 뜨겁게', dps: 1.6, range: 1.4, wide: 0.75 },
  fan: { label: '태풍 선풍기', description: '사방의 적을 한 번에 날려 버린다', damage: 2, range: 1.3 },
  laser: { label: '레이저 쇼', description: '여섯 줄기가 여러 적을 나눠 조준한다. 같은 적에게는 발사당 최대 두 줄기 적중', damage: 1.3, count: 6, maxHitsPerTarget: 2 },
  stapler: { label: '전동 타카', description: '두 줄로 쏘고 못이 적을 뚫는다', damage: 1.4, pierce: 2 },
  ball: { label: '왕탱탱볼', description: '커다란 공 다섯 개가 튕겨 다닌다', damage: 1.5, count: 5, size: 1.8 },
  robot: { label: '스페이스 마린', icon: 'marine', description: '장갑병 셋이 자율 이동하며 관통탄을 쏘고 수류탄을 던진다', damage: 1.4, count: 3, speed: 1.2, fireEverySec: 0.55, shots: 2, range: 520, bulletSpeed: 540, bulletLifeSec: 1.2, pierce: 1,
    keepRange: 0.5, strafeAngle: 0.35, seekScale: 1.35, leash: 560, regroup: 180, recall: 900,
    grenadeEverySec: 4, grenadePower: 2.4, grenadeRadius: 90, grenadeFlightSec: 0.65, grenadeFuseSec: 0.2, grenadeArc: 52, grenadeStartSec: 1 },
  towel: { label: '비치 타월', description: '양쪽을 한꺼번에, 더 넓고 세게 후려친다', damage: 1.5, size: 1.6 },
  paperplane: { label: '종이학 편대', description: '네 마리가 날아가 적을 꿰뚫는다', damage: 1.3, count: 4, pierce: 2 },
  mousetrap: { label: '대형 끈끈이', description: '덫이 커지고 훨씬 아프게 문다', damage: 1.6, radius: 1.5 },
  microwave: { label: '업소용 전자레인지', description: '더 멀리, 더 세게 데운다', damage: 1.5, radius: 1.35 },
  shower: { label: '수압 샤워', description: '물줄기가 두 배로 쏟아진다', damage: 1.3, double: true },
  sockpuppet: { label: '양말 기사단', icon: 'sockknight', description: '투구를 쓴 인형 셋이 주먹으로 주변 적을 함께 때린다', damage: 1.7, count: 3, speed: 1.15, cleave: 64 },
  toydrone: { label: '쌍포 드론', icon: 'dronemk2', description: '드론 셋이 두 발씩 관통탄을 발사한다', damage: 1.6, count: 3, shots: 2, pierce: 2 },
  windcar: { label: '태엽 전차', icon: 'windtank', description: '전차 셋이 돌진하고 끝에서 충격파를 터뜨린다', damage: 1.7, count: 3, size: 1.25, blast: 90 },
  toydragon: { label: '청룡', icon: 'azuredragon', description: '한 마리의 청룡으로 자라 몸통이 더 굵고 길어진다. 증원은 머리 수 대신 몸통 마디를 늘린다', damage: 1.6, count: 4, size: 1.2, speed: 2.0 },
  toyknight: { label: '검흔 수호자', icon: 'bladeguardian', description: '대검을 든 검사 셋이 더 넓게 베고 겹친 검흔을 남긴다', damage: 1.65, count: 3, range: 1.2, arc: 3.5, scarSec: 1 },
  plantspirit: { label: '숲의 수호자', icon: 'plantguardian', description: '정령 셋이 씨앗 두 발씩 던지고 폭발 범위가 커진다', damage: 1.6, count: 3, shots: 2, radius: 1.35 },
};

// 한 판에 만들 수 있는 합체 수. 다 채우면 합체는 더 이상 선택지에 나오지 않는다.
export const MAX_FUSIONS = 2;

// 완성형 두 개의 독립 공격을 합체 공격으로 대체한다. primary는 재사용할 공격 경로(별도 구현이면 null), power는 통합 피해 배율이다.
export const FUSIONS = {
  thunderdragons: { label: '쌍룡 뇌우', icon: 'thunderdragons', description: '청룡 두 마리가 독립적으로 적을 관통하고, 각 용 주변에 불규칙한 낙뢰를 세 번씩 떨어뜨린다. 증원은 두 용의 몸통을 늘린다', primary: 'toydragon', power: 1.6, from: ['toydragon', 'zapper'], heads: 2, lightningEverySec: 0.85, strikes: 3, stormRange: 220, blastRadius: 65, lightningDamage: 1.15 },
  stormcrane: {
    label: "천둥학",
    icon: "stormcrane",
    description: "다섯 갈래 관통 깃털로 적 무리를 꿰뚫는 학 넷을 소환한다",
    primary: "papercrane",
    power: 3.2,
    summonBoost: {"count": 4, "shots": 5, "pierce": 5},
    from: ["papercrane", "zapper"],
  },
  thorngarden: {
    label: "가시 폭격 정원",
    icon: "thorngarden",
    description: "포대 넷이 거대 가시 열매를 네 발씩 퍼부어 넓게 폭격한다",
    primary: "cactus",
    power: 3.2,
    summonBoost: {"count": 4, "shots": 4, "radius": 1.8},
    from: ["cactus", "detergent"],
  },
  siegerook: {
    label: "공성 룩",
    icon: "siegerook",
    description: "거대 룩 넷이 적진을 뚫고 돌진 끝에 큰 충격파를 터뜨린다",
    primary: "chessrook",
    power: 3.2,
    summonBoost: {"count": 4, "size": 1.8, "blast": 170},
    from: ["chessrook", "roller"],
  },
  janitorbear: {
    label: "청소반장 곰",
    icon: "janitorbear",
    description: "곰 넷이 빗자루로 넓은 범위를 동시에 후려친다",
    primary: "plushbear",
    power: 3.2,
    summonBoost: {"count": 4, "cleave": 155},
    from: ["plushbear", "broom"],
  },
  firelegion: {
    label: "불꽃 도끼 군단",
    icon: "firelegion",
    description: "도끼병 넷이 거대한 불꽃 도끼로 넓고 길게 내리친다",
    primary: "toyaxe",
    power: 3.2,
    summonBoost: {"count": 4, "range": 1.8, "lineWidth": 64, "lineScale": 2.2, "coil": true},
    from: ["toyaxe", "coil"],
  },
  goldrain: {
    label: "황금 소나기",
    icon: "goldrain",
    description: "앞쪽 부채꼴로 동전을 흩뿌린다 · 재료 공격을 통합해 피해·범위·갈래가 크게 증가한다. 보물 피해 증가 적용",
    primary: "coin",
    power: 3.6,
    patternBoost: 1.5,
    from: ["coin", "paperplane"],
  },
  goldbell: {
    label: "황금 공명종",
    icon: "goldbell",
    description: "주변을 둥글게 울려 가까운 적을 한 번씩 때린다 · 재료 공격을 통합해 피해·범위·갈래가 크게 증가한다. 보물 피해 증가 적용",
    primary: "handbell",
    power: 3.6,
    patternBoost: 1.5,
    from: ["handbell", "microwave"],
  },
  stormcompass: {
    label: "뇌전 나침반",
    icon: "stormcompass",
    description: "가까운 적부터 길을 잇듯 연쇄 타격한다 · 재료 공격을 통합해 피해·범위·갈래가 크게 증가한다. 보물 피해 증가 적용",
    primary: "compass",
    power: 3.6,
    patternBoost: 1.5,
    from: ["compass", "zapper"],
  },
  royalseal: {
    label: "황금 인장",
    icon: "royalseal",
    description: "멀리 있는 적의 위치에 도장을 찍어 뭉친 적을 공격한다 · 재료 공격을 통합해 피해·범위·갈래가 크게 증가한다. 보물 피해 증가 적용",
    primary: "seal",
    power: 3.6,
    patternBoost: 1.5,
    from: ["seal", "swatter"],
  },
  timewind: {
    label: "시간의 바람",
    icon: "timewind",
    description: "시계 방향으로 회전하는 십자 모양 모래 바람을 보낸다 · 재료 공격을 통합해 피해·범위·갈래가 크게 증가한다. 보물 피해 증가 적용",
    primary: "hourglass",
    power: 3.6,
    patternBoost: 1.5,
    from: ["hourglass", "fan"],
  },

  thunderball: { label: '번개볼', description: '공이 주변 적에게 번개를 쏘고, 벽에 부딪히면 크게 방전한다', primary: 'ball', power: 3.5, from: ['ball', 'zapper'],
    damage: 1.5, zapEverySec: 0.4, targets: 3, range: 170, zap: 1, blast: 150, blastDamage: 2 },
  spinlaser: { label: '메가 레이저', description: '0.7초 충전 후 한 방향에 초대형 빔을 터뜨려 3초간 지진다. 공속은 발사 후 대기 시간을 줄인다', primary: 'laser', power: 1, from: ['laser', 'fan'],
    chargeSec: 0.7, durationSec: 3, restSec: 1.8, length: 1100, width: 240, maxWidth: 400, impact: 28, dps: 34 },
  // 살충제는 따로 뿌리지 않고, 스테이플러가 적을 쫓아가는 독침을 앞쪽으로 다섯 발씩 쏜다.
  poisongun: { label: '독침 기관총', description: '비행 거리가 2배인 유도 독침 다섯 발을 앞쪽으로 쏘아 중독시킨다. 한 적에게는 한 번에 최대 두 발이 적중한다. 기본 발사 속도 -20%. 살충제는 따로 뿌리지 않는다', primary: 'stapler', power: 4, from: ['stapler', 'spray'],
    shots: 5, maxHitsPerTarget: 2, spread: 0.2, cooldownScale: 1.25, damage: 0.75, pierce: 1, homing: 6, lifeScale: 2, poison: 0.6, poisonSec: 3 },
  bleachbot: { label: '소독 강습대', description: '스페이스 마린의 강화 탄환이 적중한 자리에 소독 장판을 남긴다', primary: 'robot', power: 1.5, from: ['robot', 'bleach'],
    damage: 1.5, speed: 1.15, impactEverySec: 0.45, radius: 42, dps: 1.2, lifeSec: 2, slow: 0.4 },
  firering: { label: '화염 고리', description: '큰 불씨 고리가 돌고, 주기적으로 화염이 사방을 휩쓴다', primary: 'coil', power: 1.3, from: ['coil', 'dryer'],
    damage: 1.6, outer: 2.6, novaEverySec: 2, novaRadius: 230, nova: 3.2 },
  // 톱날이 적에서 적으로 튕겨 다니다 돌아온다. 베인 적은 한동안 계속 피해를 입는다.
  sawblade: { label: '도탄 톱날', description: '톱날 셋이 적 사이를 튕겨 다닌다. 같은 적에게는 0.16초마다 적중하고 출혈은 중첩되지 않는다', primary: null, power: 10, from: ['slipper', 'roller'],
    count: 3, speed: 560, bounces: 6, hop: 260, seek: 420, radius: 24, maxRadius: 56, hitEverySec: 0.16, damage: 1.5, bleed: 0.6, bleedSec: 2.5, idleOrbit: 60 },
  mopstorm: { label: '물걸레 회오리', description: '물걸레가 주위를 한 바퀴 크게 휘감아 적을 때리고 느리게 한다', primary: null, power: 1, from: ['towel', 'broom'],
    everySec: 1.6, damage: 6.8, slow: 0.6 },
  // 파리채는 혼자 내려치지 않고 종이비행기를 따라서만 내려친다.
  bomber: { label: '파리채 폭격기', description: '종이비행기가 맞힌 자리에 파리채가 함께 내려친다. 파리채는 따로 치지 않는다', primary: 'paperplane', power: 1, from: ['paperplane', 'swatter'],
    damage: 0.6, radius: 55 },
  foammine: { label: '거품 지뢰', description: '쥐덫이 닫히면 여섯 파편의 피해를 모은 거대 거품이 한 번 폭발한다', primary: 'mousetrap', power: 3.5, from: ['mousetrap', 'detergent'], bubbles: 1, blast: 6, hitEverySec: 0.18 },
  dryoven: { label: '건조 오븐', description: '강화 파동 두 번이 퍼지고, 맞은 적을 3초 동안 느리게 하며 태운다', primary: 'microwave', power: 1, from: ['microwave', 'dehumidifier'],
    waves: 2, damage: 1.2, burnSec: 3, burn: 1.5, slow: 0.5 },
  // 드론은 따로 쏘지 않고, 기지에서 뜬 드론들이 오리 주변을 돌아다니며 관통 레이저를 쏜다.
  dronebase: { label: '레이저 드론 기지', description: '드론 넷이 오리 주변을 돌아다니며 관통 레이저를 45도로 한 번 긁는다. 빔이 지나간 부채꼴의 적을 모두 벤다',
    primary: null, power: 1, from: ['toydrone', 'laser'],
    count: 4, speed: 240, patrol: 260, range: 460, beamLength: 620, beamWidth: 20, fireSec: 0.7, damage: 1.3, beamSec: 0.3, sweep: Math.PI / 4 },
  shockshower: { label: '감전 샤워', description: '물줄기가 떨어진 자리에서 전기가 주변 적 셋에게 튄다', primary: 'shower', power: 1.3, from: ['shower', 'zapper'],
    targets: 3, range: 170, damage: 0.5 },
};

// 한 판에 가질 수 있는 무기 수. 다 채우면 새 무기는 선택지에 나오지 않고 가진 무기만 강화한다.
export const MAX_WEAPONS = 8;

// 한 판에 가질 수 있는 보물 수(보물 파트 20점이면 6개). 다 채운 뒤의 보물 상자는 바꾸거나 레벨업 두 번이 된다.
export const MAX_RELICS = 3;

// 보물이 직접 주는 피해는 레벨마다 이만큼 세진다(공격력과 보물 피해도 곱한다). 후반에도 쓸모 있게.
export const RELIC_LEVEL_SCALE = 0.04;

// 다연장 미사일 5중첩의 독립 지원 공격. 공속·태엽·우상 추가 발동과 별도로 20초에 한 번이다.
// 돼지코 어댑터 5개: 멀티탭이 터질 때마다 전기 구체를 날린다. 구체는 날아가며 주변을 계속 감전시키고 끝에서 크게 터진다.
export const BALL_LIGHTNING = {
  stacks: 5, speed: 240, lifeSec: 2.4, zapRadius: 170, zapDamage: 70, tickSec: 0.3, burstRadius: 320, burstDamage: 400,
};

export const NUCLEAR_STRIKE = {
  stacks: 5, everySec: 12, warningSec: 1.3, radius: 640, maxRadius: 900,
  damage: 900, falloutRadius: 0.58, falloutSec: 3, falloutDps: 90, tickSec: 0.25,
};

// 보물. 게임을 시작할 때 하나, 보스를 잡을 때마다 하나를 고른다. 레벨이 없고 한 번 얻으면 끝까지 간다.
// stats는 카드에 적는 정확한 효과다.
export const RELICS = {
  rubyglass: { label: '루비 안경', critOnly: true, category: 'crit', description: '급소를 더 쉽게, 더 깊게 찌른다',
    stats: ['치명 20점 전용', '치명타 확률 +15%p · 치명타 피해 +40%'], critChance: 0.15, critDamage: 0.4 },
  redthread: { label: '운명의 실', critOnly: true, category: 'crit', description: '네 번째 직접 공격의 치명 단계를 하나 더 올린다',
    stats: ['치명 20점 전용', '직접 타격 적중 4회마다 치명 단계 +1(치명 보너스 합연산)', '지속 피해·추가 고정 피해·치명 폭발은 횟수 제외', '고무망치 보유 시 확정 치명타 비활성화'], everyHits: 4 },
  prism: { label: '오색 프리즘', dot20Only: true, category: 'dot', description: '속성 무기와 공격 보물의 속성 에너지를 응축한다',
    stats: ['지속·속성 20점 전용', '화염·냉기·번개·독·물 속성 피해 +45%', '여러 속성이 있어도 한 번만 적용 · 고정 피해 제외'], elementalPower: 0.45 },
  contagion: { label: '전염 플라스크', dot20Only: true, category: 'dot', description: '독·화상에 걸린 적이 쓰러지면 주변에 옮긴다',
    stats: ['지속·속성 20점 전용', '처치 시 반경 140 안의 최대 3명에게 남은 독·화상 전염', '초당 피해 65%, 남은 시간 최대 3초', '전염된 적은 재전염 불가 · 장판·출혈은 전염하지 않음'], radius: 140, targets: 3, power: 0.65, maxSec: 3 },
  jewelcase: { label: '보석 진열함', treasureOnly: true, category: 'treasure', description: '보물을 모을수록 소장품이 강해진다',
    stats: ['보물 20점 전용', '사용 중인 보물 슬롯 하나마다 보물 피해 +8%', '이 보물도 슬롯 수에 포함'], relicSlotPower: 0.08 },
  expedition: { label: '탐험가의 나침반', treasureOnly: true, category: 'treasure', description: '멀리 있는 적까지 공격 보물이 닿는다',
    stats: ['보물 20점 전용', '공격 보물의 범위·사거리 +45%', '무기 범위에는 적용하지 않음'], relicRange: 0.45 },
  twin: { label: '쌍둥이 노즐', description: '날아가는 무기를 두 번씩 쏜다',
    stats: ['살충제·슬리퍼·세제 거품·돌돌이·스테이플러·레이저·종이비행기·전기 파리채·락스·샤워기·행운 동전·나침반 2번 발사',
      '합체: 독침 기관총·파리채 폭격기·감전 샤워·황금 소나기·뇌전 나침반도 2번 발사', '두 번째 발사는 피해 -50%'],
    weapons: ['spray', 'slipper', 'detergent', 'roller', 'stapler', 'laser', 'paperplane', 'zapper', 'bleach', 'shower', 'coin', 'compass'],
    fusions: ['poisongun', 'bomber', 'shockshower', 'goldrain', 'stormcompass'], echoSec: 0.12, echoDamage: 0.5 },
  blanket: { label: '두꺼운 이불', description: '멈춰 있으면 받는 피해가 줄어든다', stats: ['멈춰 있으면 받는 피해 -60%'], guard: 0.6 },
  energy: { label: '에너지 드링크', description: '움직이는 동안 힘이 넘친다', stats: ['움직이는 동안 공격력 +30%', '이동 속도 +10%'], might: 0.3, speed: 0.1 },
  magnet: { label: '냉장고 자석', description: '먼지를 아주 멀리서 끌어온다', stats: ['줍는 범위 +200%'], pickup: 2 },
  neko: { label: '행운의 고양이', description: '운이 좋아진다', stats: ['다시 뽑기 +1회', '치명타 확률 +10%'], rerolls: 1, critChance: 0.1 },
  firstaid: { label: '구급상자', description: '쓰러져도 한 번 일어난다', stats: ['한 번 체력 50%로 부활', '부활 뒤 3초 무적'], reviveHp: 0.5, reviveGuardSec: 3 },
  scrubber: { label: '철수세미', description: '부딪힌 적에게 따끔하게 돌려준다', stats: ['맞으면 주변 적에게 받은 피해의 500%'], reflect: 5, radius: 110 },
  alarm: { label: '알람시계', description: '때마다 울려 적을 얼린다', stats: ['20초마다 적 2.5초 얼림(보스 제외)', '쿨타임 감소와 재발동 효과를 받지 않음'], everySec: 20, freezeSec: 2.5 },
  piggy: { label: '돼지 저금통', description: '차곡차곡 모아 더 빨리 큰다', stats: ['경험치 +20%', '레벨업마다 체력 +4'], xpGain: 0.2, levelHeal: 4 },
  lastcup: { label: '마지막 컵라면', description: '궁지에 몰리면 강해진다', stats: ['체력 30% 이하일 때 공격력 +60%', '쿨타임 -20%'],
    below: 0.3, might: 0.6, haste: 0.2 },
  bigpot: { label: '큰 냄비', description: '무엇이든 크게 만든다', stats: ['무기 범위 +25%', '투사체 크기 +25%'], area: 0.25, projectile: 0.25 },
  stopwatch: { label: '스톱워치', description: '손이 빨라진다', stats: ['모든 쿨타임 -15%'], haste: 0.15 },
  dice: { label: '주사위', description: '한 방을 노린다', stats: ['치명타 확률 +5%', '치명타 피해 +75%'], critChance: 0.05, critDamage: 0.75 },
  popcorn: { label: '팝콘 기계', description: '쓰러진 적이 펑 터진다', stats: ['적이 쓰러지면 25% 확률로 폭발', '폭발 피해 25(레벨·보물 피해 비례)'],
    chance: 0.25, radius: 70, damage: 25 },
  icetray: { label: '얼음틀', description: '때릴 때마다 차갑다', stats: ['맞은 적 8% 확률로 1.5초 얼림(보스 제외)', '기절·빙결 해제 후 1.2초 재발동 면역'], chance: 0.08, freezeSec: 1.5 },
  umbrella: { label: '우산', description: '날아오는 것을 막아 준다', stats: ['탄막·떨어지는 쓰레기 피해 -60%'], guard: 0.6 },
  waterbottle: { label: '대용량 물병', description: '든든하게 버틴다', stats: ['최대 체력 +50', '초당 회복 +1'], maxHp: 50, regen: 1 },
  scooter: { label: '킥보드', description: '훨씬 빨리 달린다', stats: ['이동 속도 +25%'], speed: 0.25 },
  firecracker: { label: '폭죽', description: '적을 조준한 로켓 여덟 발이 날아가 차례로 폭발한다',
    stats: ['12초마다 조준 로켓 8발, 빠르게 순차 착탄(낙하 속도 +30%)', '발당 범위 135 · 피해 125(레벨·보물 피해 비례)'],
    everySec: 9, radius: 135, damage: 125, rockets: 8, range: 520, aimSec: 0.5, gapSec: 0.16, fallSpeed: 0.3 },
  // 보물 20점 전용이고 폭죽이 있어야 나온다. 여러 개 가질 수 있고, 하나마다 보물 칸을 하나 쓴다.
  mlrs: { label: '다연장 미사일', treasureOnly: true, stackable: true, requiresRelic: 'firecracker',
    description: '폭죽 로켓이 늘고 세지며 5개를 모으면 별도의 핵미사일 지원이 열린다', stats: ['폭죽 로켓 +4발, 로켓 피해 +70(중복 가능, 하나마다 보물 칸 1개)', '5중첩부터 기존 미사일과 별도로 20초마다 핵미사일 1발', '핵: 1.3초 예고 · 피해 900 · 반경 640(최대 900)', '충돌 지점 안쪽에 3초간 초당 피해 90, 핵 주기는 공속·우상 추가 발동 적용 제외', '보물 20점·폭죽 보유 시 등장'],
    rockets: 4, damage: 70 },
  // 보물 20점 전용이고 멀티탭이 있어야 나온다. 여러 개 가질 수 있고, 하나마다 보물 칸을 하나 쓴다.
  splitplug: { label: '3구 분배기', treasureOnly: true, requiresRelic: 'outlet',
    description: '멀티탭의 일반 연쇄 번개가 세 줄로 갈라져 나간다',
    stats: ['멀티탭 일반 연쇄 번개 +2줄(총 3줄)', '각 줄의 연쇄 대상 수는 기존 효과 그대로 적용', '한 줄 안에서는 같은 적을 다시 맞히지 않으며 서로 다른 줄은 같은 적을 맞힐 수 있음', '보물 20점·멀티탭 보유 시 등장, 중복 획득 불가', '전기 구체 개수에는 영향 없음'], extraChains: 2 },
  adapter: { label: '돼지코 어댑터', treasureOnly: true, stackable: true, requiresRelic: 'outlet',
    description: '멀티탭 전기가 훨씬 많은 적에게 이어진다',
    stats: ['멀티탭 연쇄 대상 +10명(여러 개 가지면 겹쳐 쌓임)', '5개 모으면 멀티탭이 전기 구체를 날려 주변 적을 모두 감전',
      '보물 20점·멀티탭 보유 시 등장, 하나마다 보물 칸 1개'], strikes: 10 },
  lamp: { label: '형광등', description: '보스를 환하게 비춘다', stats: ['보스에게 주는 피해 +40%'], bossDamage: 0.4 },
  // 치명타를 버리고 한 대 한 대를 무겁게, 더 자주 때린다. 치명타 확률은 고정 피해로 바뀐다.
  mallet: { label: '고무망치', description: '치명타 대신 묵직하게, 자주 때린다',
    stats: ['치명타가 터지지 않음', '치명타 확률 5%마다 피해 +20', '공격 속도 +100%'], step: 0.05, flat: 20, attackSpeed: 1 },
  // 공격 보물: 보물 파트 20점이어야 나온다. 피해는 공격력, 레벨, 보물 피해에 비례한다.
  pas: { label: '물파스', treasureOnly: true, description: '차가운 파동이 퍼져 나가 적을 한 번씩 훑고 느리게 한다',
    stats: ['8초마다 반경 240까지 0.7초 동안 퍼지는 냉각 파동', '피해 80 · 1.5초 동안 이동 속도 -35%(보스 제외)'],
    everySec: 8, radius: 240, damage: 80, waveSec: 0.7, slow: 0.65, slowSec: 1.5 },
  heatpad: { label: '전기장판', treasureOnly: true, description: '지나간 바닥에 열선 장판을 남겨 뒤따라오는 적을 지진다',
    stats: ['0.8초마다 현재 위치에 0.8초 남는 직사각형 장판', '0.2초마다 피해 2, 장판 하나에 총 피해 8(지속 피해)'],
    everySec: 0.8, radius: 175, halfHeight: 70, damage: 8, zoneSec: 0.8, tickSec: 0.2 },
  freshener: { label: '방향제', treasureOnly: true, description: '가까운 적 쪽에 향기 구름을 뿌려 머무르는 적을 중독시킨다',
    stats: ['12초마다 가까운 적 위치에 3초 동안 향기 구름(반경 160)', '0.25초마다 피해 10, 끝까지 머무르면 총 피해 120(지속 피해)'],
    everySec: 12, radius: 160, range: 480, damage: 120, zoneSec: 3, tickSec: 0.25 },
  clothespin: { label: '빨래집게', treasureOnly: true, description: '쓰러진 적 자리에 집게를 남긴다',
    stats: ['적이 쓰러지면 20% 확률로 집게 함정', '집게 피해 90(레벨·보물 피해 비례)'], chance: 0.2, damage: 90, radius: 46, lifeSec: 7, max: 12 },
  outlet: { label: '멀티탭', treasureOnly: true, description: '가장 가까운 적을 감전시키고 주변 적에게 전류를 이어 보낸다',
    stats: ['5초마다 가까운 적에서 최대 4명에게 순차 연쇄 번개', '탐색 520 · 전이 거리 220 · 대상당 피해 160, 중복 적중 없음'],
    everySec: 5, strikes: 4, range: 520, hop: 220, radius: 44, hopSec: 0.08, damage: 160 },
  glove: { label: '고무장갑', treasureOnly: true, description: '때마다 앞으로 크게 후려친다', stats: ['4초마다 바라보는 쪽으로 충격파', '충격파 피해 130(레벨·보물 피해 비례)'],
    everySec: 4, length: 300, width: 80, damage: 130, slows: true },
  match: { label: '성냥', treasureOnly: true, description: '맞은 적에게 불이 붙는다', stats: ['한 대씩 맞힐 때 12% 확률로 3초 동안 불붙임', '불 피해 초당 32(레벨·보물 피해 비례)'],
    chance: 0.12, burnSec: 3, dps: 32 },
  // 쿨타임마다 팽이를 하나 날린다. 팽이는 화면 가장자리에서 튕기며 4초 동안 돈다. 쿨타임이 짧을수록 많이 돈다.
  top: { label: '팽이', treasureOnly: true, description: '때마다 팽이를 날려 화면을 튕기며 돌게 한다',
    stats: ['2.5초마다 팽이 하나를 날림(4초 동안 돎)', '닿을 때 피해 60(레벨·보물 피해 비례)'],
    everySec: 2.5, lifeSec: 4, speed: 330, radius: 18, damage: 60, hitEverySec: 0.25, max: 8 },
  purifier: { label: '정수기', treasureOnly: true, description: '가까운 적에게 노즐을 돌려 얼음 탄환을 세 번 연사한다',
    stats: ['6초마다 조준 얼음 4발씩 3연사(발사 간격 0.14초)', '탄당 피해 32(레벨·보물 피해 비례), 셋까지 뚫음'],
    everySec: 6, shards: 12, volleys: 3, burstGap: 0.14, speed: 420, lifeSec: 1.1, pierce: 3, damage: 32 },
  precisionscale: { label: '정밀 저울', hasteOnly: true, category: 'fixed', description: '한 대의 고정 피해를 무겁게 만든다',
    stats: ['공속 20점 전용', '타격당 고정 피해 +20', '전체 고정 피해 +25%(고무망치·패시브 포함)'], hitDamage: 20, fixedPower: 0.25 },
  resonator: { label: '공진 못', hasteOnly: true, requiresFixedDamage: true, category: 'fixed', description: '같은 적을 연속 타격하면 고정 피해가 울려 퍼진다',
    stats: ['공속 20점·고정 피해 보유 시 등장', '같은 적을 직접 6회 타격하면 현재 고정 피해의 2배 추가', '추가 피해는 치명타·공격력·진화·합체 배율 적용 제외'], everyHits: 6, flatPulse: 2 },
  thermos: { label: '보온병', dotOnly: true, category: 'dot', description: '독과 열기, 장판의 지속 피해가 강해진다',
    stats: ['지속 피해를 주는 무기·합체 또는 성냥 보유 시 등장', '지속 피해 +40%', '직접 타격 피해는 증가하지 않음'], dotPower: 0.4 },
  concentrate: { label: '농축 앰플', dotOnly: true, category: 'dot', description: '같은 적에게 계속 닿는 지속 피해가 점점 독해진다',
    stats: ['지속 피해 사용 시 등장', '같은 적에게 3초간 지속 피해를 주면 최대 +60%', '지속 피해가 0.5초 끊기면 초기화, 중첩 소스로 더 빨리 쌓이지 않음'], power: 0.6, rampSec: 3, resetSec: 0.5 },
  humidifier: { label: '휴대용 가습기', summonOnly: true, category: 'summon', description: '소환수가 해로운 안개를 두르고 근처 적에게 지속 피해를 준다',
    stats: ['소환 20점 전용', '각 소환수 주변 반경 80, 초당 피해 24(0.25초마다 적용)', '공격력·레벨·보물 피해·소환 피해·지속 피해 증가 적용', '중첩 제한 없음: 주변 모든 소환수의 안개 피해 합산, 범위 증가 적용', '고정 피해·타격 효과·우상 추가 발동·공속은 적용하지 않음'],
    radius: 80, dps: 24, tickSec: 0.25 },
  baton: { label: '지휘봉', summonOnly: true, category: 'summon', description: '소환 군단을 더 멀리, 더 강하게 지휘한다',
    stats: ['소환 20점 전용', '소환 최종 피해 +35%', '소환 탐색·사격 사거리 +20%'], power: 0.35, range: 0.2 },
  marchdrum: { label: '행군 북', summonOnly: true, category: 'summon', description: '소환수들이 박자에 맞춰 빠르게 움직이고 공격한다',
    stats: ['소환 20점 전용', '소환 공격 속도 +25%', '소환 이동 속도 +25%'], attackSpeed: 0.25, speed: 0.25 },
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
