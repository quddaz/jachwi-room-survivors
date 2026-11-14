import { createMusic } from './audio.js';
import { inFusion, applyBuild, maxRelicsOf, maxWeaponsOf, choose, createGame, declineChoice, formatTime, passiveLines, reroll, startWithRelic, statSheet, statsOf, update } from './engine.js';
import { fetchRanking, isShared, SEASON, SEASONS, submitRecord } from './leaderboard.js';
import { PIXEL, render } from './render.js';
import {
  BOSS_EVERY_SEC, BOSSES, BUILD, BUILD_MAX, BUILD_POINTS, BUILD_STEPS, buildEfficiency, DROP_LIMIT, DROPS, normalizeBuild, ELITE, eliteFrom, ENEMIES, EVOLUTIONS, FUSIONS, MAPS, MAX_FUSIONS, MAX_RELICS, MAX_WEAPONS, PASSIVES, PLAYER, RELICS, WEAPONS,
} from './rules.js';
import { iconSheetUrl, iconUrl } from './sprites.js';

const EFFECTS_KEY = 'room-survivors:effects';
const SOUND_KEY = 'room-survivors:sound';
const music = createMusic();
const NAME_KEY = 'room-survivors:crew-name';
const MAP_KEY = 'room-survivors:map';
const BUILD_KEY = 'room-survivors:build';
const STEP = 1 / 60;
const JOYSTICK_RADIUS = 50;

const app = document.querySelector('.app');
const screens = [...document.querySelectorAll('[data-screen]')];
const gameScreen = document.querySelector('[data-screen="game"]');
const canvas = document.querySelector('.world');
const ctx = canvas.getContext('2d');
const nameInput = document.querySelector('#crew-name');
const joystick = document.querySelector('.joystick');
const knob = document.querySelector('.joystick-knob');
const levelupOverlay = document.querySelector('.levelup');
const pausedOverlay = document.querySelector('.paused');
const banner = document.querySelector('.banner');

let game = null;
let crewName = '';
let frameId = 0;
let lastFrame = 0;
let carry = 0;
let paused = false;
let viewport = { width: 0, height: 0 };
const input = { x: 0, y: 0 };
const keys = new Set();
let touch = null;
let shownBannerAge = null;
let shownChoices = null;
let musicMuted = recall(SOUND_KEY) === 'off';
let effectsMuted = recall(EFFECTS_KEY) === 'off';
let heardObjects = new WeakSet();
const EFFECT_SOUNDS = { sweep: 'slash', towel: 'slash', punch: 'impact', swat: 'impact', slam: 'impact',
  bolt: 'zap', laser: 'zap', nova: 'impact', bomb: 'impact', pickup: 'pickup' };

function syncSound() {
  music.setEffectsMuted(effectsMuted);
  music.setMuted(document.hidden || paused);
  music.setPlaying(Boolean(!musicMuted && game && !game.over && !game.choices && !paused && !document.hidden
    && gameScreen.classList.contains('is-active')));
}

function drawSoundButtons() {
  document.querySelectorAll('[data-action="sound"], [data-action="effects"]').forEach((button) => {
    const effects = button.dataset.action === 'effects';
    const muted = effects ? effectsMuted : musicMuted;
    const label = effects ? '효과음' : '배경음악';
    button.setAttribute('aria-pressed', String(!muted));
    button.title = `${label} ${muted ? '켜기' : '끄기'}`;
    button.setAttribute('aria-label', button.title);
  });
  document.querySelector('[data-sound-status]').textContent = musicMuted ? '배경음악 꺼짐' : '배경음악 켜짐';
  document.querySelector('[data-effects-status]').textContent = effectsMuted ? '효과음 꺼짐' : '효과음 켜짐';
}

function playCombatSounds() {
  const bosses = game.enemies.some((enemy) => enemy.boss && !enemy.dead);
  music.setBoss(bosses);
  for (const effect of game.effects) {
    if (heardObjects.has(effect)) continue;
    heardObjects.add(effect);
    const sound = effect.sound ?? EFFECT_SOUNDS[effect.type];
    if (sound) music.playEffect(sound);
  }
  for (const shot of game.shots) {
    if (heardObjects.has(shot)) continue;
    heardObjects.add(shot);
    music.playEffect(shot.sound ?? 'shoot');
  }
}

function show(name) {
  screens.forEach((screen) => screen.classList.toggle('is-active', screen.dataset.screen === name));
  syncSound();
}

function remember(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 저장하지 못해도 게임은 그대로 한다.
  }
}

function recall(key) {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
}

function resize() {
  const box = gameScreen.getBoundingClientRect();
  // 화면의 1/PIXEL 크기 버퍼에 그리고 CSS로 키워 도트가 또렷하게 보이게 한다.
  viewport = { width: Math.ceil(box.width / PIXEL), height: Math.ceil(box.height / PIXEL) };
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.style.width = `${viewport.width * PIXEL}px`;
  canvas.style.height = `${viewport.height * PIXEL}px`;
  // 넓은 화면에서는 적이 화면 밖에서 나오도록 보이는 범위를 알려 준다.
  if (game) {
    game.viewRadius = Math.hypot(viewport.width, viewport.height);
    // 버퍼 1픽셀이 월드 2칸이라, 버퍼 크기가 곧 화면 절반의 월드 길이다. 탱탱볼이 이 가장자리에서 튕긴다.
    game.view = { halfW: viewport.width, halfH: viewport.height };
  }
}

// 한글 입력 상태에서는 event.key가 'ㅈ', 'ㅁ'처럼 들어와서, 글자가 아니라 자판 위치(event.code)로 읽는다.
const MOVE_KEYS = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
};

function readKeys() {
  const x = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
  const y = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
  return { x, y };
}

// 반짝이는 아이템 아이콘. 프레임 묶음을 CSS가 차례로 넘긴다.
function itemIcon(id, evolved = false) {
  const iconId = evolved ? EVOLUTIONS[id]?.icon ?? id : id;
  return `<i class="item" style="--sheet: url(${iconSheetUrl(iconId)})"></i>`;
}

function currentInput() {
  if (touch) return input;
  const keyboard = readKeys();
  const length = Math.hypot(keyboard.x, keyboard.y);
  return length > 0 ? { x: keyboard.x / length, y: keyboard.y / length } : { x: 0, y: 0 };
}

// 화면 글자와 막대는 값이 바뀔 때만 건드린다. 같은 값을 매 프레임 다시 넣어도 브라우저는 다시 배치를 계산한다.
const hudShown = new Map();
function setHud(selector, kind, value) {
  if (hudShown.get(selector) === value) return;
  hudShown.set(selector, value);
  const element = document.querySelector(selector);
  if (kind === 'text') element.textContent = value;
  else element.style.transform = value;
}

function drawHud() {
  const { player } = game;
  setHud('.time-value', 'text', formatTime(game.time));
  setHud('.kills-value', 'text', game.kills.toLocaleString('ko-KR'));
  setHud('.level-value', 'text', String(game.level));
  setHud('.xp-fill', 'bar', `scaleX(${Math.round(Math.min(1, game.xp / game.nextXp) * 200) / 200})`);
  const { maxHp } = statsOf(game);
  setHud('.hp-fill', 'bar', `scaleX(${Math.round(Math.max(0, player.hp / maxHp) * 200) / 200})`);

  // 보스가 여럿이면 체력 막대도 여럿. 보스가 바뀔 때만 다시 만들고, 체력은 매번 채운다.
  const bosses = game.enemies.filter((enemy) => enemy.boss && !enemy.dead);
  const bossKey = bosses.map((boss) => boss.id).join(',');
  const bossBars = document.querySelector('.boss-bars');
  if (bossKey !== shownBosses) {
    shownBosses = bossKey;
    bossBars.innerHTML = bosses.map((boss) => `
      <div class="boss-bar"><span class="boss-name">${escapeHtml(boss.label)}</span><div class="boss-hp"><div class="boss-hp-fill"></div></div></div>`)
      .join('');
  }
  bossBars.querySelectorAll('.boss-hp-fill').forEach((fill, index) => {
    const value = `scaleX(${Math.round(Math.max(0, bosses[index].hp / bosses[index].maxHp) * 300) / 300})`;
    if (fill.style.transform !== value) fill.style.transform = value;
  });

  const latest = game.effects.findLast((effect) => effect.type === 'banner' && effect.warning)
    ?? game.effects.findLast((effect) => effect.type === 'banner');
  if (latest && latest !== shownBannerAge) {
    shownBannerAge = latest;
    banner.textContent = latest.text;
    banner.classList.toggle('is-boss', Boolean(latest.boss));
    banner.classList.toggle('is-warning', Boolean(latest.warning));
  }
  if (banner.classList.contains('is-visible') !== Boolean(latest)) banner.classList.toggle('is-visible', Boolean(latest));
}

function drawLoadout() {
  const items = [
    ...Object.entries(game.weapons).filter(([id]) => !inFusion(game, id)),
    ...Object.entries(game.passives),
  ];
  const owned = Object.keys(game.relics).map((id) => `<span class="is-relic">${itemIcon(id)}</span>`).join('');
  const fused = Object.keys(game.fusions).map((id) => `<span class="is-fusion">${itemIcon(id)}합체</span>`).join('');
  document.querySelector('.loadout').innerHTML = owned + fused + items
    .map(([id, level]) => (game.evolved[id]
      ? `<span class="is-evolved">${itemIcon(id, true)}★</span>`
      : `<span>${itemIcon(id)}${level}</span>`)).join('');
}

function drawChoices() {
  if (game.choices === shownChoices) return;
  shownChoices = game.choices;
  syncSound();
  levelupOverlay.hidden = !game.choices;
  if (!game.choices) return;
  music.playEffect(game.choices[0]?.kind.startsWith('relic') ? 'chest' : 'levelup');
  touch = null;
  joystick.hidden = true;
  const treasure = game.choices[0]?.kind.startsWith('relic');
  const weaponSwapping = game.choices[0]?.kind === 'weapon-swap';
  const swapping = game.choices[0]?.kind === 'relic-swap' || weaponSwapping;
  const owned = Object.keys(game.relics).length;
  levelupOverlay.classList.toggle('is-relic', treasure);
  levelupOverlay.classList.toggle('is-weapon-swap', weaponSwapping);
  document.querySelector('.levelup .panel-title').textContent = weaponSwapping ? '무기 교체' : swapping ? '보물 교체'
    : treasure ? (game.time === 0 ? '시작 보물' : '보물 상자!') : '레벨 업!';
  document.querySelector('.levelup .panel-sub').textContent = weaponSwapping
    ? `무기 칸이 가득 찼어요 (${maxWeaponsOf(game)}/${maxWeaponsOf(game)}). ${WEAPONS[game.weaponSwap.id].label} 대신 내려놓을 무기를 골라 주세요`
    : swapping ? `${RELICS[game.swapIn].label} 대신 내려놓을 보물을 골라 주세요`
    : treasure && owned >= maxRelicsOf(game) ? `보물이 가득 찼어요 (${owned}/${maxRelicsOf(game)}). 바꾸거나 그대로 두세요`
      : treasure ? `보물을 하나 골라 주세요 (${owned + 1}/${maxRelicsOf(game)})` : '하나를 골라 주세요';
  document.querySelector('.choices').innerHTML = game.choices.map((choice, index) => {
    const icon = itemIcon(choice.icon ?? (choice.kind === 'heal' ? 'heal' : choice.id));
    const tag = choice.kind === 'heal' || choice.kind === 'relic-keep' || choice.kind === 'weapon-cancel' ? '' : choice.kind.endsWith('-swap') ? '<small class="choice-swap">내려놓기</small>'
      : choice.kind === 'relic' ? '<small class="choice-relic">보물</small>' : choice.kind === 'fusion' ? `<small class="choice-fusion">합체 ${Object.keys(game.fusions).length + 1}/${MAX_FUSIONS}</small>`
      : choice.kind === 'evolve' ? '<small class="choice-evolve">완성형</small>' : choice.level === 1
      ? `<small class="choice-new">NEW${choice.kind !== 'weapon' ? '' : Object.keys(game.weapons).length >= maxWeaponsOf(game) ? ' · 교체' : ` 무기 ${Object.keys(game.weapons).length + 1}/${maxWeaponsOf(game)}`}</small>` : `<small>Lv ${choice.level}</small>`;
    return `
      <button class="choice${choice.kind === 'evolve' ? ' is-evolve' : ''}${choice.kind === 'fusion' ? ' is-evolve is-fusion' : ''}${choice.kind === 'relic' ? ' is-evolve is-relic' : ''}${choice.kind.endsWith('-swap') ? ' is-swap' : ''}" type="button" data-choice="${index}">
        <span class="choice-icon">${icon}</span>
        <span class="choice-name">${escapeHtml(choice.label)}${tag}</span>
        <span class="choice-desc">${escapeHtml(choice.description)}</span>
        <span class="choice-stats">${(choice.details ?? []).map((line) => `<span>${escapeHtml(line)}</span>`).join('')}</span>
      </button>`;
  }).join('');
  const button = document.querySelector('.reroll');
  button.disabled = game.rerollLeft <= 0 || swapping;
  button.querySelector('b').textContent = game.rerollLeft;
}

function rerollChoices() {
  if (reroll(game)) { music.playEffect('select'); drawChoices(); }
}

let shownStats = '';
let shownBosses = '';

// 오른쪽 아래 능력치 창. 바뀔 때만 다시 그린다.
function drawStats() {
  const rows = statSheet(game);
  const key = rows.map(([, value]) => value).join('|');
  if (key === shownStats) return;
  shownStats = key;
  document.querySelector('.stats-list').innerHTML = rows
    .map(([label, value]) => `<dt>${label}</dt><dd class="${/^[+-]/.test(value) ? 'is-changed' : ''}">${value}</dd>`)
    .join('');
}

function frame(now) {
  const elapsed = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  if (!paused) {
    const hp = game.player.hp;
    const kills = game.kills;
    const xp = game.xp;
    const bossIndex = game.bossIndex;
    carry += elapsed;
    while (carry >= STEP) {
      update(game, STEP, currentInput());
      carry -= STEP;
      if (game.choices || game.over) {
        carry = 0;
        break;
      }
    }
    if (game.player.hp < hp) music.playEffect('hurt');
    if (game.kills > kills) music.playEffect('kill');
    if (game.bossIndex > bossIndex) music.playEffect('boss');
    if (game.xp > xp) music.playEffect('xp');
    playCombatSounds();
  }
  render(ctx, game, viewport.width, viewport.height, now / 1000);
  drawHud();
  drawChoices();
  drawStats();
  if (game.over) {
    finish();
    return;
  }
  frameId = requestAnimationFrame(frame);
}

function start() {
  music.reset();
  heardObjects = new WeakSet();
  music.unlock();
  cancelAnimationFrame(frameId);
  game = createGame();
  game.map = selectedMap;
  applyBuild(game, selectedBuild);
  paused = false;
  carry = 0;
  touch = null;
  shownChoices = null;
  shownBannerAge = null;
  shownStats = '';
  shownBosses = '';
  hudShown.clear();
  pausedOverlay.hidden = true;
  levelupOverlay.hidden = true;
  joystick.hidden = true;
  show('game');
  resize();
  startWithRelic(game);
  drawLoadout();
  // 주소 끝에 #debug를 붙이면 콘솔에서 게임 상태를 볼 수 있다.
  if (window.location.hash === '#debug') window.__game = game;
  lastFrame = performance.now();
  frameId = requestAnimationFrame(frame);
}

function setPaused(value) {
  if (!game || game.over) return;
  paused = value;
  if (!value) music.unlock();
  syncSound();
  pausedOverlay.hidden = !value;
  touch = null;
  joystick.hidden = true;
}

function drawResultItems() {
  const groups = [
    ['무기', Object.entries(game.weapons).filter(([id]) => !inFusion(game, id)).map(([id, level]) => ({ id,
      name: game.evolved[id] ? EVOLUTIONS[id].label : WEAPONS[id].label,
      icon: game.evolved[id] ? EVOLUTIONS[id].icon : undefined, badge: game.evolved[id] ? '완성형' : `Lv ${level}`, kind: game.evolved[id] ? 'evolved' : 'weapon' }))],
    ['합체', Object.keys(game.fusions).map((id) => ({ id, name: FUSIONS[id].label, badge: '합체', kind: 'fusion' }))],
    ['패시브', Object.entries(game.passives).map(([id, level]) => ({ id, name: PASSIVES[id].label, badge: `Lv ${level}`, kind: 'passive' }))],
    ['보물', Object.keys(game.relics).map((id) => ({ id, name: RELICS[id].label, badge: '보물', kind: 'relic' }))],
  ];
  document.querySelector('.result-items').innerHTML = groups.filter(([, items]) => items.length).map(([title, items]) => `
    <section class="result-item-group"><h3>${title}<small>${items.length}</small></h3><ul>
    ${items.map((item) => `<li class="result-item is-${item.kind}">${itemIcon(item.icon ?? item.id)}<span>${escapeHtml(item.name)}<small>${item.badge}</small></span></li>`).join('')}
    </ul></section>`).join('');
}

async function finish() {
  cancelAnimationFrame(frameId);
  music.setPlaying(false);
  music.playEffect('gameover');
  const survivedMs = Math.round(game.time * 1000);
  document.querySelector('.result-name').textContent = crewName;
  document.querySelector('.result-time-value').textContent = formatTime(game.time);
  const stats = [
    ['잡은 적', game.kills.toLocaleString('ko-KR')],
    ['레벨', game.level],
    ['보스', `${game.bossIndex}마리`],
  ];
  document.querySelector('.result-stats').innerHTML = stats
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
  const rankText = document.querySelector('.result-rank');
  rankText.textContent = '순위를 확인하고 있어요';
  drawResultItems();
  show('result');
  try {
    await submitRecord({ crewName, survivedMs, kills: game.kills, level: game.level });
    const ranking = await fetchRanking();
    const index = ranking.findIndex((entry) => entry.crewName === crewName);
    const best = ranking[index];
    rankText.textContent = index < 0 ? '기록을 남겼어요'
      : `시즌 ${SEASON} ${index + 1}위${best.survivedMs > survivedMs ? ` (최고 ${formatTime(best.survivedMs / 1000)})` : ''}`;
  } catch (error) {
    rankText.textContent = error.message;
  }
}

// 도감. 모두 규칙에서 바로 만들어서, 수치를 고치면 도감도 같이 바뀐다.
const clock = (seconds) => formatTime(seconds);
const spriteImg = (name) => `<img class="px codex-sprite" src="${iconUrl(name)}" alt="" />`;
const statLine = (id, key, unit = '', scale = 1) => {
  const values = WEAPONS[id][key];
  const show = (value) => `${Math.round(value * scale * 100) / 100}${unit}`;
  return `${show(values[0])} → ${show(values[values.length - 1])}`;
};
const CODEX_TABS = [
  ['fusion', '합체', () => {
    const part = (id) => `<span class="recipe-part">${itemIcon(id)}<span>${escapeHtml(WEAPONS[id].label)}</span><small>${escapeHtml(EVOLUTIONS[id].label)}</small></span>`;
    return `<p class="ranking-note">두 무기를 모두 5레벨까지 올려 <b>완성형</b>으로 만들면, 레벨업 선택지 맨 앞에 <b>합체</b>가 나와요. 합체하면 재료 두 무기의 개별 공격은 사라지고, 더 강한 합체 공격만 나가요. 같은 재료를 다른 합체에 다시 쓸 수 없어요. 한 판에 <b>최대 ${MAX_FUSIONS}개</b>까지 만들 수 있어요.</p>
      <ol class="recipe-list">${Object.entries(FUSIONS).map(([id, fusion]) => `
        <li class="recipe">
          <div class="recipe-formula">${part(fusion.from[0])}<span class="recipe-op">+</span>${part(fusion.from[1])}<span class="recipe-op">→</span>
            <span class="recipe-part is-result">${itemIcon(id)}<span>${escapeHtml(fusion.label)}</span></span></div>
          <p class="recipe-desc">${escapeHtml(fusion.description)}</p>
        </li>`).join('')}</ol>`;
  }],
  ['relic', '보물', () => `<p class="ranking-note">시작할 때 하나, 보스를 잡고 보물 상자를 열 때마다 셋 가운데 하나를 골라요. 한 판에 <b>최대 ${MAX_RELICS}개</b>(보물 파트 20점이면 ${MAX_RELICS + BUILD.treasure.perks[20].maxRelics}개)까지 가지고, 가득 찬 뒤에는 가진 보물과 <b>바꾸거나</b> 그대로 두고 레벨업 두 번을 받아요. 보물이 직접 주는 피해는 공격력에 비례하고 <b>레벨마다 4%씩</b> 세지며, 범위와 쿨타임도 무기처럼 영향을 받아요. 보물 파트와 광택제로 더 올릴 수 있어요. 일부 <b>공격 보물</b>은 보물 파트 20점에서 열려요. 고정 피해 전용은 공속 20점, 소환 전용은 소환 20점, 지속 피해 전용은 관련 무기·합체나 성냥이 있어야 나와요.</p>
    <ul class="evolve-list">${Object.entries(RELICS).map(([id, relic]) => `
      <li>${itemIcon(id)}<span><b>${escapeHtml(relic.label)}${relic.treasureOnly ? ' <small>보물 20점</small>' : relic.hasteOnly ? ' <small>공속 20점</small>' : relic.summonOnly ? ' <small>소환 20점</small>' : relic.dotOnly ? ' <small>지속 피해</small>' : ''}</b><em>${escapeHtml(relic.description)}</em>${relic.stats.map((line) => `<i>${escapeHtml(line)}</i>`).join('')}</span></li>`).join('')}</ul>`],
  ['weapon', '무기', () => `<p class="ranking-note">무기는 한 판에 <b>최대 ${MAX_WEAPONS}개</b>(보물 파트 20점이면 ${BUILD.treasure.perks[20].maxWeapons}개)까지 가질 수 있어요. 다 채운 뒤 새 무기를 고르면 가진 무기 하나와 <b>바꿀 수 있어요</b>(합체에 쓰인 무기는 빼고). 탱탱볼·도탄 톱날·로봇·팽이의 이동 속도도 공격 속도에 비례해요. 로봇청소기·양말 인형·장난감 드론·태엽 자동차·화분 정령은 소환 능력치를 받아요. 무기는 5레벨까지 올리고, 5레벨이 되면 <b>완성형</b>이 선택지에 나와요. 수치는 1레벨 → 5레벨이에요.</p>
    <ul class="evolve-list">${Object.entries(WEAPONS).map(([id, weapon]) => {
      const lines = [
        weapon.damage && `피해 ${statLine(id, 'damage')}`,
        weapon.dps && `초당 피해 ${statLine(id, 'dps')}`,
        weapon.cooldown && `쿨타임 ${statLine(id, 'cooldown', '초')}`,
        Array.isArray(weapon.count) && `개수 ${statLine(id, 'count')}`,
      ].filter(Boolean);
      return `<li>${itemIcon(id)}<span><b>${escapeHtml(weapon.label)}</b><em>${escapeHtml(weapon.description)}</em>${lines.map((line) => `<i>${line}</i>`).join('')}
        <i class="is-evolve">★ ${escapeHtml(EVOLUTIONS[id].label)}: ${escapeHtml(EVOLUTIONS[id].description)}</i></span></li>`;
    }).join('')}</ul>`],
  ['passive', '패시브', () => `<p class="ranking-note">무기와 함께 레벨업 선택지에 나와요. 치명타 피해(핫소스)는 네잎클로버를 가진 뒤에만 나오고, 보물 패시브(광택제, 태엽 열쇠)는 보물 파트 20점, 고정 피해 패시브(정밀 스프링, 경량 기어, 균형추)는 공속 파트 20점이어야 나와요. 소환 휘장·증원 호루라기는 소환 파트 20점부터 나와요.</p>
    <ul class="evolve-list">${Object.entries(PASSIVES).map(([id, passive]) => {
      const max = Object.values(passive).find(Array.isArray).length;
      return `<li>${itemIcon(id)}<span><b>${escapeHtml(passive.label)} <small>최대 ${max}레벨${passive.treasureOnly ? ' · 보물 20점' : passive.hasteOnly ? ' · 공속 20점' : passive.summonOnly ? ' · 소환 20점' : ''}</small></b><em>${escapeHtml(passive.description)}</em>
        <i>1레벨: ${escapeHtml(passiveLines(id, 1).join(', '))}</i><i>${max}레벨: ${escapeHtml(passiveLines(id, max).join(', '))}</i></span></li>`;
    }).join('')}</ul>`],
  ['enemy', '적', () => `<p class="ranking-note">시간이 갈수록 체력, 공격력, 속도, 수가 끝없이 늘어요. 한 번에 받는 피해는 최대 체력의 ${Math.round(PLAYER.maxHitShare * 100)}%를 넘지 않아요.
      <b>${clock(ELITE.from)}</b>부터는 금빛 테두리에 왕관을 쓴 <b>정예</b>가 ${ELITE.step}초마다 한 종류씩 풀려요(체력 ${ELITE.hp}배, 공격력 ${ELITE.damage}배, 경험치 ${ELITE.xp}배).</p>
    <ul class="evolve-list">${Object.entries(ENEMIES).map(([kind, enemy]) => `
      <li>${spriteImg(kind === 'scrap' ? 'scrap' : `${kind}A`)}<span><b>${escapeHtml(enemy.label)}</b><em>${escapeHtml(enemy.description ?? '')}</em>
        <i>${enemy.from === Infinity ? '쓰레기봉투에서 나옴' : `등장 ${clock(enemy.from)}`}${Number.isFinite(eliteFrom(kind)) ? ` · 정예 ${clock(eliteFrom(kind))}` : ''}</i></span></li>`).join('')}</ul>`],
  ['item', '아이템', () => `<p class="ranking-note">적이 가끔 떨어뜨려요. 같은 종류는 맵에 ${DROP_LIMIT}개까지만 떨어져 있어요.</p>
    <ul class="evolve-list">${Object.entries(DROPS).map(([id, drop]) => `
      <li>${itemIcon(id)}<span><b>${escapeHtml(drop.label)}</b><em>${escapeHtml(drop.description)}</em></span></li>`).join('')}</ul>`],
  ['build', '능력치', () => `<p class="ranking-note">시작할 때 모두 같은 <b>${BUILD_POINTS}점</b>을 네 파트에 나눠요(파트당 최대 ${BUILD_MAX}). 포인트마다 기본 수치가 조금 오르고, <b>5·10·20점</b>에 그 파트만의 능력이 열려요.</p>
    <ul class="evolve-list">${Object.entries(BUILD).map(([tree, def]) => `
      <li>${itemIcon(def.icon)}<span><b>${def.label}</b><em>1점당: ${escapeHtml(buildEffect(tree, 1))}</em>
        ${Object.entries(def.perks).map(([at, perk]) => `<i class="${Number(at) === BUILD_MAX ? 'is-evolve' : ''}">${at}점 ${escapeHtml(perk.name)}: ${escapeHtml(perk.text)}</i>`).join('')}</span></li>`).join('')}</ul>`],
  ['map', '맵', () => `<p class="ranking-note">바닥 타일만 다르고 규칙은 같아서 순위는 함께 매겨요.</p>
    <ul class="evolve-list">${Object.entries(MAPS).map(([, map]) => `
      <li><span class="map-swatch" style="--a: ${map.swatch[0]}; --b: ${map.swatch[1]}"></span><span><b>${escapeHtml(map.label)}</b><em>${escapeHtml(map.description)}</em></span></li>`).join('')}</ul>`],
  ['boss', '보스', () => `<p class="ranking-note">${BOSS_EVERY_SEC}초마다 아래 순서로 돌아가며 나오고, 한 바퀴 돌 때마다 더 세져요. 화면 밖에 있으면 가장자리에 빨간 화살표가 떠요. 잡으면 보물 상자가 나와요.</p>
    <ul class="evolve-list">${BOSSES.map((boss, index) => `
      <li>${spriteImg(`${boss.kind}A`)}<span><b>${escapeHtml(boss.label)}</b><em>${escapeHtml(boss.description ?? '')}</em><i>첫 등장 ${clock(BOSS_EVERY_SEC * (index + 1))}</i></span></li>`).join('')}</ul>`],
];
let codexTab = 'fusion';

function openRecipes(tab = codexTab) {
  show('recipes');
  codexTab = tab;
  document.querySelector('.codex-tabs').innerHTML = CODEX_TABS.map(([id, label]) => `
    <button class="season-tab${id === tab ? ' is-active' : ''}" type="button" data-codex="${id}">${label}</button>`).join('');
  document.querySelector('.codex-body').innerHTML = CODEX_TABS.find(([id]) => id === tab)[2]();
  document.querySelector('.screen-recipes').scrollTop = 0;
}

// 시작 화면의 능력치 투자. 모두 같은 30점을 네 파트에 나누고, 나눈 대로 다음 판에도 기억한다.
let selectedBuild = normalizeBuildSafe();

function normalizeBuildSafe(raw) {
  try {
    return normalizeBuild(raw ?? JSON.parse(recall(BUILD_KEY) || '{}'));
  } catch {
    return normalizeBuild({});
  }
}

const BUILD_TEXT = {
  critChance: ['치명타 확률', (value) => `+${Math.round(value * 1000) / 10}%`],
  critDamage: ['치명타 피해', (value) => `+${Math.round(value * 100)}%`],
  summonPower: ['소환 피해', (value) => `+${Math.round(value * 100)}%`],
  summonSpeed: ['소환 이동 속도', (value) => `+${Math.round(value * 100)}%`],
  attackSpeed: ['공격 속도', (value) => `+${Math.round(value * 100)}%`],
  maxHp: ['최대 체력', (value) => `+${Math.round(value)}`],
  armor: ['받는 피해', (value) => `-${Math.round(value * 1000) / 10}%`],
  xpGain: ['경험치', (value) => `+${Math.round(value * 100)}%`],
  pickup: ['줍는 범위', (value) => `+${Math.round(value * 100)}%`],
  drop: ['아이템 드랍', (value) => `+${Math.round(value * 100)}%`],
  relicPower: ['보물 피해', (value) => `+${Math.round(value * 100)}%`],
  relicHaste: ['보물 발동 주기', (value) => `-${Math.round(value * 100)}%`],
};

// 그 파트에 points점을 넣었을 때의 효과 글
function buildEffect(tree, points) {
  const efficiency = buildEfficiency(points);
  return Object.entries(BUILD[tree].per).map(([key, per]) => `${BUILD_TEXT[key][0]} ${BUILD_TEXT[key][1](per * points * efficiency)}`).join(', ');
}

function drawBuild() {
  const used = Object.values(selectedBuild).reduce((sum, points) => sum + points, 0);
  document.querySelector('.build-left').textContent = `${BUILD_POINTS - used}`;
  document.querySelector('.build-list').innerHTML = Object.entries(BUILD).map(([tree, def]) => {
    const points = selectedBuild[tree];
    const steps = BUILD_STEPS.map(([at, bonus]) => `<span class="build-step${points >= at ? ' is-on' : ''}" style="left: ${(at / BUILD_MAX) * 100}%">${at}</span>`).join('');
    const perks = Object.entries(def.perks).map(([at, perk]) => `
      <li class="${points >= Number(at) ? 'is-on' : ''}"><span class="build-perk-at">${at}점</span><b>${escapeHtml(perk.name)}</b><span>${escapeHtml(perk.text)}</span></li>`).join('');
    return `
      <li class="build-row">
        <div class="build-head">
          ${itemIcon(def.icon)}<b>${def.label}</b><span class="build-points">${points}<small>/${BUILD_MAX}</small></span>
          <span class="build-eff">기본 ×${Math.round(buildEfficiency(points) * 100) / 100}</span>
          <button class="build-button" type="button" data-build="${tree}" data-delta="-1" aria-label="${def.label} 빼기"${points === 0 ? ' disabled' : ''}>−</button>
          <button class="build-button" type="button" data-build="${tree}" data-delta="1" aria-label="${def.label} 더하기"${points >= BUILD_MAX || used >= BUILD_POINTS ? ' disabled' : ''}>+</button>
        </div>
        <div class="build-bar"><div class="build-fill" style="width: ${(points / BUILD_MAX) * 100}%"></div>${steps}</div>
        <ol class="build-perks">${perks}</ol>
        <p class="build-effect">기본: ${escapeHtml(buildEffect(tree, Math.max(points, 1)))}${points ? '' : ' (1점당)'}</p>
      </li>`;
  }).join('');
}

function changeBuild(tree, delta) {
  const next = { ...selectedBuild, [tree]: selectedBuild[tree] + delta };
  const used = Object.values(next).reduce((sum, points) => sum + points, 0);
  if (next[tree] < 0 || next[tree] > BUILD_MAX || used > BUILD_POINTS) return;
  selectedBuild = next;
  remember(BUILD_KEY, JSON.stringify(selectedBuild));
  drawBuild();
}

// 시작 화면의 맵 고르기. 바닥 타일만 달라서 순위는 함께 매긴다.
let selectedMap = 'room';

function drawMapPicker() {
  document.querySelector('.map-picker').innerHTML = Object.entries(MAPS).map(([id, map]) => `
    <button class="map-choice${id === selectedMap ? ' is-active' : ''}" type="button" data-map="${id}" aria-pressed="${id === selectedMap}">
      <span class="map-swatch" style="--a: ${map.swatch[0]}; --b: ${map.swatch[1]}"></span>
      <b>${escapeHtml(map.label)}</b><small>${escapeHtml(map.description)}</small>
    </button>`).join('');
}

let rankingSeason = SEASON;

async function openRanking(season = SEASON) {
  show('ranking');
  rankingSeason = season;
  const list = document.querySelector('.ranking-list');
  document.querySelector('.season-tabs').innerHTML = SEASONS.map((value) => `
    <button class="season-tab${value === season ? ' is-active' : ''}" type="button" data-season="${value}">
      시즌 ${value}${value === SEASON ? '<small>진행 중</small>' : ''}
    </button>`).join('');
  // 조합표 화면에도 .ranking-note가 있어서 순위 화면 것을 콕 집는다.
  document.querySelector('.screen-ranking .ranking-note').textContent = !isShared
    ? '공유 순위가 연결되지 않아 이 브라우저의 기록만 보여요.'
    : season === SEASON ? '크루마다 이번 시즌에 가장 오래 버틴 기록만 보여요.'
      : '지난 시즌 기록이에요. 이미 끝나서 더 이상 바뀌지 않아요.';
  list.innerHTML = '<li class="ranking-empty">불러오는 중</li>';
  try {
    const ranking = await fetchRanking(season);
    if (season !== rankingSeason) return; // 탭을 빨리 바꾸면 늦게 온 응답은 버린다.
    list.innerHTML = ranking.length === 0
      ? `<li class="ranking-empty">${season === SEASON ? '새 시즌이 막 시작했어요. 첫 기록을 남겨 보세요.' : '기록이 없어요.'}</li>`
      : ranking.map((entry, index) => `
          <li class="${entry.crewName === crewName ? 'is-me' : ''}">
            <span class="rank${index < 3 ? ' is-top' : ''}">${['🥇', '🥈', '🥉'][index] ?? index + 1}</span>
            <span class="crew">${escapeHtml(entry.crewName)}<small>${entry.kills.toLocaleString('ko-KR')}마리</small></span>
            <span class="points">${formatTime(entry.survivedMs / 1000)}</span>
          </li>`).join('');
  } catch (error) {
    list.innerHTML = `<li class="ranking-empty">${escapeHtml(error.message)}</li>`;
  }
}

// 화면 아무 곳이나 누른 자리가 조이스틱 중심이 된다.
gameScreen.addEventListener('pointerdown', (event) => {
  if (!game || paused || game.choices || event.target.closest('button')) return;
  const box = gameScreen.getBoundingClientRect();
  touch = { id: event.pointerId, x: event.clientX, y: event.clientY };
  joystick.hidden = false;
  joystick.style.left = `${event.clientX - box.left}px`;
  joystick.style.top = `${event.clientY - box.top}px`;
  knob.style.transform = 'translate(0, 0)';
  input.x = 0;
  input.y = 0;
  gameScreen.setPointerCapture?.(event.pointerId);
});

gameScreen.addEventListener('pointermove', (event) => {
  if (!touch || event.pointerId !== touch.id) return;
  const dx = event.clientX - touch.x;
  const dy = event.clientY - touch.y;
  const length = Math.hypot(dx, dy);
  const clamped = Math.min(JOYSTICK_RADIUS, length);
  const nx = length > 0 ? dx / length : 0;
  const ny = length > 0 ? dy / length : 0;
  input.x = nx * (clamped / JOYSTICK_RADIUS);
  input.y = ny * (clamped / JOYSTICK_RADIUS);
  knob.style.transform = `translate(${nx * clamped}px, ${ny * clamped}px)`;
});

function releaseTouch(event) {
  if (!touch || event.pointerId !== touch.id) return;
  touch = null;
  input.x = 0;
  input.y = 0;
  joystick.hidden = true;
}
gameScreen.addEventListener('pointerup', releaseTouch);
gameScreen.addEventListener('pointercancel', releaseTouch);

window.addEventListener('keydown', (event) => {
  const playing = game && !game.over && gameScreen.classList.contains('is-active');
  const move = MOVE_KEYS[event.code];
  if (move && playing) {
    keys.add(move);
    event.preventDefault();
  }
  if (event.code === 'Escape' && playing) setPaused(!paused);
  if (event.code === 'KeyR' && game?.choices) rerollChoices();
  const pick = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 }[event.code];
  if (game?.choices && pick !== undefined && pick < game.choices.length) {
    selectItem(pick);
  }
});
window.addEventListener('keyup', (event) => {
  keys.delete(MOVE_KEYS[event.code]);
});
// 창을 벗어나면 keyup을 못 받아 계속 걷게 되므로 눌린 키를 비운다.
window.addEventListener('blur', () => keys.clear());
window.addEventListener('resize', () => {
  if (game) resize();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game && !game.over && !game.choices) setPaused(true);
  syncSound();
});
window.addEventListener('pagehide', () => { music.setMuted(true); music.setPlaying(false); });
window.addEventListener('pageshow', syncSound);

window.__drawLoadout = () => drawLoadout();

function selectItem(index) {
  if (paused) return;
  const choice = choose(game, index);
  if (!choice) return;
  music.playEffect(['fusion', 'evolve'].includes(choice.kind) ? 'evolve' : 'select');
  drawLoadout();
  drawChoices();
}

document.querySelector('.choices').addEventListener('click', (event) => {
  const button = event.target.closest('[data-choice]');
  if (!button || !game?.choices) return;
  selectItem(Number(button.dataset.choice));
});

document.querySelector('.start-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = nameInput.value.trim().replace(/\s+/g, ' ');
  const error = document.querySelector('.field-error');
  if (!name) {
    error.textContent = '크루 이름을 입력해 주세요.';
    nameInput.focus();
    return;
  }
  error.textContent = '';
  crewName = name;
  remember(NAME_KEY, name);
  nameInput.blur();
  start();
});

app.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'sound') {
    musicMuted = !musicMuted;
    if (!musicMuted) music.unlock();
    remember(SOUND_KEY, musicMuted ? 'off' : 'on');
    drawSoundButtons();
    syncSound();
  }
  if (action === 'effects') {
    effectsMuted = !effectsMuted;
    if (!effectsMuted) music.unlock();
    remember(EFFECTS_KEY, effectsMuted ? 'off' : 'on');
    drawSoundButtons();
    syncSound();
  }
  if (action === 'ranking') openRanking();
  const season = event.target.closest('[data-season]')?.dataset.season;
  if (season) openRanking(Number(season));
  if (action === 'recipes') openRecipes();
  const buildButton = event.target.closest('[data-build]');
  if (buildButton) changeBuild(buildButton.dataset.build, Number(buildButton.dataset.delta));
  if (action === 'build-reset') {
    selectedBuild = normalizeBuild({});
    remember(BUILD_KEY, JSON.stringify(selectedBuild));
    drawBuild();
  }
  const map = event.target.closest('[data-map]')?.dataset.map;
  if (map && MAPS[map]) {
    selectedMap = map;
    remember(MAP_KEY, map);
    drawMapPicker();
  }
  const codex = event.target.closest('[data-codex]')?.dataset.codex;
  if (codex) openRecipes(codex);
  if (action === 'home') show('start');
  if (action === 'retry') start();
  if (action === 'pause') setPaused(true);
  if (action === 'reroll') rerollChoices();
  if (action === 'decline-choice' && game && declineChoice(game)) drawChoices();
  if (action === 'stats') document.querySelector('.stats').classList.toggle('is-open');
  if (action === 'resume') setPaused(false);
  if (action === 'giveup') {
    paused = false;
    pausedOverlay.hidden = true;
    game.over = true;
  }
});

document.querySelector('.kills-icon').src = iconUrl('roachA');
crewName = recall(NAME_KEY);
selectedMap = MAPS[recall(MAP_KEY)] ? recall(MAP_KEY) : 'room';
drawMapPicker();
selectedBuild = normalizeBuildSafe();
drawBuild();
nameInput.value = crewName;



drawSoundButtons();
syncSound();
