import { createMusic } from './audio.js';
import { practiceDps, practicePick, practiceRemove, startPractice, inFusion, applyCharacter, applyBuild, maxRelicsOf, relicCount, relicSlotsUsed, maxWeaponsOf, armyCap, armyUsed, openSoulShop, choose, createGame, declineChoice, formatTime, passiveLines, reroll, startWithRelic, statSheet, statsOf, update } from './engine.js';
import { fetchRanking, isShared, SEASON, SEASONS, submitRecord } from './leaderboard.js';
import { PIXEL, RENDER_SCALE, render } from './render.js';
import {
  ARMY, COMMANDS, NECRO_RELICS, UNDEAD_EVOLUTIONS, STRUCTURES, STRUCTURE_LIFE, STRUCTURE_EVOLUTIONS, STRUCTURE_FUSIONS, DIY_RELICS, RECRUITS, RITUALS, UNDEAD, BOSS_EVERY_SEC, BOSSES, CHARACTERS, BUILD, BUILD_MAX, BUILD_POINTS, BUILD_STEPS, buildEfficiency, DROP_LIMIT, DROPS, normalizeBuild, ELITE, eliteFrom, ENEMIES, EVOLUTIONS, FUSIONS, MAPS, MAX_FUSIONS, MAX_RELICS, MAX_WEAPONS, PASSIVES, PLAYER, RELICS, RELIC_RARITIES, WEAPONS, weaponTypeOf, weaponCategoriesOf, weaponElementsOf, WEAPON_CATEGORIES, ELEMENTS, ELEMENT_EFFECTS,
} from './rules.js';
import { duckIconUrl, iconSheetUrl, iconUrl } from './sprites.js';

const EFFECTS_KEY = 'room-survivors:effects';
const SOUND_KEY = 'room-survivors:sound';
const music = createMusic();
const NAME_KEY = 'room-survivors:crew-name';
const MAP_KEY = 'room-survivors:map';
const BUILD_KEY = 'room-survivors:build';
const CHARACTER_KEY = 'room-survivors:character';
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
const practiceHud = document.querySelector('.practice-hud');
const practicePicker = document.querySelector('.practice-picker');
let pickerOpen = false;
let practiceTab = 'weapon';
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
  music.setActive(Boolean(game && !game.over && !paused && !document.hidden && gameScreen.classList.contains('is-active')));
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
    if (!shot.silent) music.playEffect(shot.sound ?? 'shoot');
  }
}

function show(name) {
  screens.forEach((screen) => screen.classList.toggle('is-active', screen.dataset.screen === name));
  if (name === 'start') runTitleDemo();
  syncSound();
}

// 메인 화면 뒤에서 실제 엔진으로 전투 장면을 돌린다. 오리는 죽지 않고 원을 그리며 걷는다.
const startScreen = document.querySelector('.screen-start');
const titleCanvas = document.querySelector('.title-bg');
const titleCtx = titleCanvas.getContext('2d');
let titleDemo = null;
let titleFrameId = 0;
let titleLast = 0;
const TITLE_WEAPONS = [['dryer', 'zapper', 'coil', 'detergent'], ['spray', 'slipper', 'laser', 'towel'], ['sockpuppet', 'toydrone', 'toyknight', 'microwave']];
function makeTitleDemo() {
  const demo = createGame();
  const roles = Object.keys(CHARACTERS);
  applyCharacter(demo, roles[Math.floor(Math.random() * roles.length)]);
  demo.map = Object.keys(MAPS)[Math.floor(Math.random() * Object.keys(MAPS).length)];
  demo.nextBossAt = Infinity;
  demo.nextXp = Infinity;
  if (CHARACTERS[demo.character].souls) {
    demo.weapons = {};
    demo.undead = { bone: 3, wraith: 3, scythe: 3 };
    const types = [...Array(16).fill('soldier'), ...Array(6).fill('archer'), 'giant2'];
    types.forEach((type, index) => demo.army.push({ id: demo.nextId++, type, x: demo.player.x + Math.cos(index) * 40, y: demo.player.y + Math.sin(index) * 40,
      hp: ARMY[type].hp * 5, maxHp: ARMY[type].hp * 5, attackIn: index * 0.05, facing: 1, swingAt: -1, slot: index * 2.399 }));
  } else {
    const set = TITLE_WEAPONS[Math.floor(Math.random() * TITLE_WEAPONS.length)];
    demo.weapons = Object.fromEntries(set.map(id => [id, 5]));
    demo.evolved = Object.fromEntries(set.slice(0, 2).map(id => [id, true]));
  }
  demo.time = 120;
  return demo;
}
function titleLoop(now) {
  if (!startScreen.classList.contains('is-active')) { titleFrameId = 0; return; }
  titleFrameId = requestAnimationFrame(titleLoop);
  if (document.hidden) return;
  const box = startScreen.getBoundingClientRect();
  const width = Math.ceil(box.width / PIXEL), height = Math.ceil(box.height / PIXEL);
  if (titleCanvas.width !== width || titleCanvas.height !== height) { titleCanvas.width = width; titleCanvas.height = height; }
  if (!titleDemo || titleDemo.over || titleDemo.time > 210) titleDemo = makeTitleDemo();
  const dt = Math.min(0.05, (now - (titleLast || now)) / 1000);
  titleLast = now;
  const t = now / 1000;
  titleDemo.player.hp = 1e6;
  update(titleDemo, dt, { x: Math.cos(t * 0.35) * 0.55, y: Math.sin(t * 0.5) * 0.55 });
  titleDemo.choices = null;
  titleCtx.imageSmoothingEnabled = false;
  render(titleCtx, titleDemo, width, height, t);
}
function runTitleDemo() {
  titleLast = 0;
  if (!titleFrameId) titleFrameId = requestAnimationFrame(titleLoop);
}
function setSetup(open) {
  startScreen.classList.toggle('is-setup', open);
  startScreen.scrollTop = 0;
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
  // 시야는 유지하고 기존 버퍼 크기로 원래 도트와 이펙트를 그린다.
  viewport = { width: Math.ceil(box.width / PIXEL), height: Math.ceil(box.height / PIXEL) };
  canvas.width = viewport.width * RENDER_SCALE;
  canvas.height = viewport.height * RENDER_SCALE;
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
  const iconId = evolved ? EVOLUTIONS[id]?.icon ?? id : RELICS[id]?.icon ?? id;
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
  const necromancer = Boolean(CHARACTERS[game.character]?.souls);
  const souls = document.querySelector('.souls');
  if (souls.hidden === necromancer) souls.hidden = !necromancer;
  if (necromancer) {
    setHud('.souls-value', 'text', String(game.souls));
    setHud('.army-value', 'text', `${armyUsed(game)}/${armyCap(game)}`);
  }
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
  const owned = Object.keys(game.relics).map((id) => `<span class="is-relic">${itemIcon(id)}${relicCount(game, id) > 1 ? `×${relicCount(game, id)}` : ''}</span>`).join('');
  const fused = Object.keys(game.fusions).map((id) => `<span class="is-fusion">${itemIcon(id)}합체</span>`).join('');
  // 강령술사: 괴담 보물, 강령술, 지휘 능력도 보라색으로 함께 보여 준다.
  const necro = [
    ...Object.keys(game.necroRelics ?? {}).map((id) => `<span class="is-relic is-necro">${itemIcon(NECRO_RELICS[id].icon ?? id)}</span>`),
    ...Object.entries(game.undead ?? {}).map(([id, level]) => `<span class="is-necro${game.undeadEvolved?.[id] ? ' is-evolved' : ''}">${itemIcon(id)}${game.undeadEvolved?.[id] ? '★' : level}</span>`),
    ...Object.entries(game.commands ?? {}).map(([id, level]) => `<span class="is-necro">${itemIcon(COMMANDS[id].icon)}${level}</span>`),
    ...Object.keys(game.diyRelics ?? {}).map((id) => `<span class="is-relic is-build">${itemIcon(id)}</span>`),
    ...Object.keys(game.buildFusions ?? {}).map((id) => `<span class="is-fusion">${itemIcon(id)}합체</span>`),
    ...Object.entries(game.builds ?? {}).map(([id, level]) => `<span class="is-build${game.buildEvolved?.[id] ? ' is-evolved' : ''}">${itemIcon(id)}${game.buildEvolved?.[id] ? '★' : level}</span>`),
  ].join('');
  document.querySelector('.loadout').innerHTML = owned + necro + fused + items
    .map(([id, level]) => (game.evolved[id]
      ? `<span class="is-evolved">${itemIcon(id, true)}★</span>`
      : `<span>${itemIcon(id)}${level}</span>`)).join('');
}

const SOUL_KINDS = ['soul', 'ritual', 'shop-leave', 'relic-necro', 'undead', 'command', 'undead-evolve'];

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
  const owned = relicSlotsUsed(game);
  levelupOverlay.classList.toggle('is-relic', treasure);
  levelupOverlay.classList.toggle('is-weapon-swap', weaponSwapping);
  const shop = Boolean(game.shop);
  levelupOverlay.classList.toggle('is-shop', shop);
  document.querySelector('.levelup .panel-title').textContent = shop ? '영혼 쓰기' : weaponSwapping ? '무기 교체' : swapping ? '보물 교체'
    : treasure ? (game.time === 0 ? '시작 보물' : '보물 상자!') : '레벨 업!';
  document.querySelector('.levelup .panel-sub').textContent = shop ? `영혼 ${game.souls}개, 병력 ${armyUsed(game)}/${armyCap(game)} (R 또는 Q로 닫기)` : weaponSwapping
    ? `무기 칸이 가득 찼어요 (${maxWeaponsOf(game)}/${maxWeaponsOf(game)}). ${WEAPONS[game.weaponSwap.id].label} 대신 내려놓을 무기를 골라 주세요`
    : swapping ? `${RELICS[game.swapIn].label} 대신 내려놓을 보물을 골라 주세요`
    : treasure && owned >= maxRelicsOf(game) ? `보물이 가득 찼어요 (${owned}/${maxRelicsOf(game)}). 바꾸거나 그대로 두세요`
      : treasure ? `보물을 하나 골라 주세요 (${owned + 1}/${maxRelicsOf(game)})` : '하나를 골라 주세요';
  document.querySelector('.choices').innerHTML = game.choices.map((choice, index) => {
    const icon = itemIcon(choice.icon ?? (choice.kind === 'heal' ? 'heal' : choice.id));
    const type = ['weapon', 'evolve', 'fusion', 'weapon-swap'].includes(choice.kind) ? weaponBadge(choice.id) : '';
    const rarity = ['relic', 'relic-swap'].includes(choice.kind) ? RELICS[choice.id]?.rarity : null;
    const typeTag = type ? `<small class="choice-type">${type}</small>` : '';
    const tag = choice.kind === 'build-evolve' ? '<small class="choice-evolve">설치 완성형</small>'
      : choice.kind === 'build-fusion' ? '<small class="choice-fusion">설치 합체</small>'
      : choice.kind === 'relic-diy' ? '<small class="choice-build">공구 보물</small>'
      : choice.kind === 'structure' ? `<small class="choice-build">${choice.level === 1 ? 'NEW 설치' : `설치 Lv ${choice.level}`}</small>`
      : choice.kind === 'undead-evolve' ? '<small class="choice-evolve">괴담 완성형</small>'
      : choice.kind === 'undead' ? `<small class="choice-undead">${choice.level === 1 ? 'NEW 괴담' : `Lv ${choice.level}`}</small>`
      : choice.kind === 'command' ? `<small class="choice-undead">지휘 Lv ${choice.level}</small>`
      : choice.kind === 'ritual' ? `<small class="choice-fusion">의식 영혼 ${choice.price}</small>`
      : choice.kind === 'relic-necro' ? '<small class="choice-relic">괴담 보물</small>'
      : choice.kind === 'soul' ? `<small class="choice-undead">영혼 ${choice.price}</small>`
      : choice.kind === 'shop-leave' ? '' : choice.kind === 'heal' || choice.kind === 'relic-keep' || choice.kind === 'weapon-cancel' ? '' : choice.kind.endsWith('-swap') ? '<small class="choice-swap">내려놓기</small>'
      : choice.kind === 'relic' ? `<small class="choice-relic" data-rarity="${rarity}">${RELIC_RARITIES[rarity].label}</small>` : choice.kind === 'fusion' ? `<small class="choice-fusion">합체 ${Object.keys(game.fusions).length + 1}/${MAX_FUSIONS}</small>`
      : choice.kind === 'evolve' ? '<small class="choice-evolve">완성형</small>' : choice.level === 1
      ? `<small class="choice-new">NEW${choice.kind !== 'weapon' ? '' : Object.keys(game.weapons).length >= maxWeaponsOf(game) ? ' · 교체' : ` 무기 ${Object.keys(game.weapons).length + 1}/${maxWeaponsOf(game)}`}</small>` : `<small>Lv ${choice.level}</small>`;
    return `
      <button class="choice${choice.kind === 'evolve' || choice.kind === 'undead-evolve' || choice.kind === 'build-evolve' ? ' is-evolve' : ''}${choice.kind === 'fusion' || choice.kind === 'build-fusion' ? ' is-evolve is-fusion' : ''}${choice.kind === 'relic-diy' ? ' is-evolve is-relic' : ''}${SOUL_KINDS.includes(choice.kind) ? ' is-soul' : ''}${choice.kind === 'ritual' ? ' is-ritual' : ''}${choice.kind === 'relic' ? ' is-evolve is-relic' : ''}${choice.kind.endsWith('-swap') ? ' is-swap' : ''}" type="button" data-choice="${index}"${rarity ? ` data-rarity="${rarity}"` : ''}>
        ${index < 4 ? `<span class="choice-key" aria-hidden="true">${index + 1}</span>` : ''}
        <span class="choice-icon">${icon}</span>
        <span class="choice-name">${escapeHtml(choice.label)}${tag}${typeTag}</span>
        <span class="choice-desc">${escapeHtml(choice.description)}</span>
        <span class="choice-stats">${[...(choice.details ?? []), ...(type ? elementLines(choice.id) : [])].map((line) => `<span>${escapeHtml(line)}</span>`).join('')}</span>
      </button>`;
  }).join('');
  const button = document.querySelector('.reroll');
  button.disabled = game.rerollLeft <= 0 || swapping || shop;
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
  if (!paused && !pickerOpen) {
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
  if (game.practice) drawPractice(now);
  if (game.over) {
    finish();
    return;
  }
  frameId = requestAnimationFrame(frame);
}

function start(practice = false) {
  music.reset();
  heardObjects = new WeakSet();
  music.unlock();
  cancelAnimationFrame(frameId);
  game = createGame();
  game.map = selectedMap;
  applyCharacter(game, selectedCharacter);
  const { undeadStarter, structureStarter } = CHARACTERS[selectedCharacter];
  game.weapons = undeadStarter || structureStarter ? {} : { [CHARACTERS[selectedCharacter].starter ?? 'spray']: 1 };
  if (undeadStarter) game.undead = { [undeadStarter]: 1 };
  if (structureStarter) game.builds = { [structureStarter]: 1 };
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
  practiceHud.hidden = !practice;
  closePicker();
  if (practice) startPractice(game);
  else startWithRelic(game);
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
    ['보물', Object.keys(game.relics).map((id) => ({ id, name: RELICS[id].label, badge: RELIC_RARITIES[RELICS[id].rarity].label, kind: 'relic' }))],
  ];
  const character = CHARACTERS[game.character] ?? CHARACTERS.normal;
  document.querySelector('.result-items').innerHTML = `<div class="result-character"><img src="${duckIconUrl(game.character)}" alt=""><span><b>${escapeHtml(character.label)}</b><small>${character.stats.map(escapeHtml).join(' · ')}</small></span></div>` + groups.filter(([, items]) => items.length).map(([title, items]) => `
    <section class="result-item-group"><h3>${title}<small>${items.length}</small></h3><ul>
    ${items.map((item) => `<li class="result-item is-${item.kind}">${itemIcon(item.icon ?? item.id)}<span>${escapeHtml(item.name)}<small>${item.badge}</small></span></li>`).join('')}
    </ul></section>`).join('');
}

function openPicker() {
  pickerOpen = true;
  practicePicker.hidden = false;
  drawPicker();
}

function closePicker() {
  pickerOpen = false;
  practicePicker.hidden = true;
  lastFrame = performance.now();
}

// 연습장 아이템 목록. 탭마다 전부 보여 주고, 가진 것은 단계와 빼기 버튼을 단다.
function drawPicker() {
  if (!game?.practice) return;
  practicePicker.querySelectorAll('[data-practice-tab]').forEach((button) => button.classList.toggle('is-active', button.dataset.practiceTab === practiceTab));
  practicePicker.querySelector('.practice-note').textContent = '누르면 한 단계 올리고, −는 한 단계 내려요';
  const rows = {
    weapon: () => Object.keys(WEAPONS).map((id) => ({ id, label: WEAPONS[id].label, icon: itemIcon(id, game.evolved[id]),
      owned: Boolean(game.weapons[id]), level: game.evolved[id] ? '완성형' : game.weapons[id] ? `Lv ${game.weapons[id]}` : weaponBadge(id),
      max: game.evolved[id] || (game.weapons[id] >= 5 && !EVOLUTIONS[id]) })),
    evolve: () => Object.keys(EVOLUTIONS).map((id) => ({ id, label: EVOLUTIONS[id].label, icon: itemIcon(id, true),
      owned: Boolean(game.evolved[id]), level: WEAPONS[id].label, max: Boolean(game.evolved[id]) })),
    fusion: () => Object.keys(FUSIONS).map((id) => ({ id, label: FUSIONS[id].label, icon: itemIcon(id),
      owned: Boolean(game.fusions[id]), level: FUSIONS[id].from.map((weapon) => WEAPONS[weapon].label).join(' + '), max: Boolean(game.fusions[id]) })),
    relic: () => [
      ...Object.keys(RELICS).map((id) => ({ id, label: RELICS[id].label, icon: itemIcon(id),
        owned: Boolean(game.relics[id]), level: RELICS[id].stackable && game.relics[id] ? `x${relicCount(game, id)}` : RELICS[id].stackable ? '중첩' : '',
        max: Boolean(game.relics[id]) && !RELICS[id].stackable })),
      { id: 'idol', kind: 'idol', label: PASSIVES.idol.label, icon: itemIcon('idol'), owned: Boolean(game.passives.idol), level: '보물 20점', max: Boolean(game.passives.idol) },
    ],
  }[practiceTab]();
  practicePicker.querySelector('.practice-items').innerHTML = rows.map((row) => {
    const kind = row.kind ?? practiceTab;
    return `<div class="practice-item${row.owned ? ' is-owned' : ''}${row.max ? ' is-max' : ''}" role="button" tabindex="0" data-practice-pick="${kind}:${row.id}">
      ${row.icon}<span>${escapeHtml(row.label)}</span><em>${escapeHtml(row.level)}</em>
      ${row.owned ? `<button class="practice-remove" type="button" aria-label="${escapeHtml(row.label)} 한 단계 내리기" data-practice-remove="${kind}:${row.id}">−</button>` : ''}
    </div>`;
  }).join('');
}

let practiceShownAt = 0;
function drawPractice(now) {
  if (now - practiceShownAt < 250) return;
  practiceShownAt = now;
  practiceHud.querySelector('.practice-dps').textContent = Math.round(practiceDps(game)).toLocaleString('ko-KR');
}

async function finish() {
  if (game.practice) {
    cancelAnimationFrame(frameId);
    music.setPlaying(false);
    practiceHud.hidden = true;
    closePicker();
    show('start');
    return;
  }
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
const weaponBadge = id => [...new Set([
  ...weaponCategoriesOf(id).map(category => WEAPON_CATEGORIES[category]),
  ...weaponElementsOf(id).map(element => ELEMENTS[element]), weaponTypeOf(id),
].filter(Boolean))].join(' · ');
const elementLines = id => weaponElementsOf(id).map(element => `${ELEMENT_EFFECTS[element].label}: ${ELEMENT_EFFECTS[element].text}`);
let weaponCategoryFilter = 'all';
const categoryMatches = id => weaponCategoryFilter === 'all' || weaponCategoriesOf(id).includes(weaponCategoryFilter);
const categoryFilters = () => `<div class="weapon-filters" aria-label="무기 계열">${Object.entries({all:'전체', ...WEAPON_CATEGORIES}).map(([id,label]) => `<button type="button" class="season-tab${id === weaponCategoryFilter ? ' is-active' : ''}" data-weapon-category="${id}" aria-pressed="${id === weaponCategoryFilter}">${label}</button>`).join('')}</div>`;
const relicRarityOrder = Object.keys(RELIC_RARITIES).reverse();
let relicRarityFilter = 'all';

function relicCodexCard([id, relic]) {
  return `<li class="relic-codex-card">
    <div class="relic-codex-title">${itemIcon(id)}<h4>${escapeHtml(relic.label)}</h4></div>
    <p>${escapeHtml(relic.description)}</p>
    <ul class="relic-codex-stats">${relic.stats.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
  </li>`;
}

function relicCodex() {
  const groups = relicRarityOrder.map(rarity => {
    const entries = Object.entries(RELICS).filter(([, relic]) => relic.rarity === rarity);
    return { rarity, label: RELIC_RARITIES[rarity].label, entries };
  });
  const grid = entries => `<ul class="relic-codex-grid">${entries.map(relicCodexCard).join('')}</ul>`;
  const filters = [{ rarity: 'all', label: '전체', entries: Object.entries(RELICS) }, ...groups];
  return `<p class="ranking-note">시작 보물과 보스 상자에서 하나를 골라요. 전설은 현재 직업의 보물만 보스 상자에서 등장해요.</p>
    <div class="relic-codex-filters" role="group" aria-label="보물 등급">
      ${filters.map(({ rarity, label, entries }) => `<button type="button" class="season-tab${rarity === relicRarityFilter ? ' is-active' : ''}" data-relic-filter="${rarity}" aria-pressed="${rarity === relicRarityFilter}">${label} <span>${entries.length}</span></button>`).join('')}
    </div>
    ${groups.map(({ rarity, label, entries }) => `
      <section class="relic-codex-group" data-rarity="${rarity}"${relicRarityFilter === 'all' || relicRarityFilter === rarity ? '' : ' hidden'}>
        <h3>${label} 보물 <span>${entries.length}개</span></h3>
        ${rarity === 'legendary'
          ? Object.entries(CHARACTERS).map(([character, def]) => `<h4 class="relic-codex-class">${escapeHtml(def.label)}</h4>${grid(entries.filter(([, relic]) => relic.character === character))}`).join('')
          : grid(entries)}
      </section>`).join('')}
    <details class="relic-codex-rules">
      <summary>보물 슬롯과 피해 계산</summary>
      <p>기본 ${MAX_RELICS}칸, 보물 파트 20점이면 ${MAX_RELICS + BUILD.treasure.perks[20].maxRelics}칸이에요. 트레저헌터는 한 칸을 더 써요. 슬롯이 가득 차면 보물을 교체하거나 레벨업 두 번을 받을 수 있어요.</p>
      <p>보물 피해는 공격력에 비례하고 레벨마다 4%씩 세져요. 무기 범위와 쿨타임, 보물 파트와 광택제 효과도 적용돼요.</p>
    </details>`;
}

function filterRelicCodex(rarity) {
  relicRarityFilter = rarity;
  for (const button of document.querySelectorAll('[data-relic-filter]')) {
    const selected = button.dataset.relicFilter === rarity;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
  for (const group of document.querySelectorAll('.relic-codex-group')) {
    group.hidden = rarity !== 'all' && rarity !== group.dataset.rarity;
  }
}

const CODEX_TABS = [
  ['fusion', '합체', () => {
    const part = (id) => `<span class="recipe-part">${itemIcon(id)}<span>${escapeHtml(WEAPONS[id].label)}</span><small>${escapeHtml(EVOLUTIONS[id].label)}</small></span>`;
    return `<p class="ranking-note">두 무기를 모두 5레벨까지 올려 <b>완성형</b>으로 만들면, 레벨업 선택지 맨 앞에 <b>합체</b>가 나와요. 합체하면 재료 두 무기의 개별 공격은 사라지고, 더 강한 합체 공격만 나가요. 같은 재료를 다른 합체에 다시 쓸 수 없어요. 한 판에 <b>최대 ${MAX_FUSIONS}개</b>까지 만들 수 있어요.</p>
      ${categoryFilters()}<ol class="recipe-list">${Object.entries(FUSIONS).filter(([id]) => categoryMatches(id)).map(([id, fusion]) => `
        <li class="recipe">
          <div class="recipe-formula">${part(fusion.from[0])}<span class="recipe-op">+</span>${part(fusion.from[1])}<span class="recipe-op">→</span>
            <span class="recipe-part is-result">${itemIcon(id)}<span>${escapeHtml(fusion.label)}</span><small>${weaponBadge(id)}</small></span></div>
          <p class="recipe-desc">${escapeHtml(fusion.description)}</p>
        </li>`).join('')}</ol>`;
  }],
  ['relic', '보물', relicCodex],
  ['weapon', '무기', () => `<p class="ranking-note">무기는 한 판에 <b>최대 ${MAX_WEAPONS}개</b>(보물 파트 20점이면 ${BUILD.treasure.perks[20].maxWeapons}개)까지 가질 수 있어요. 다 채운 뒤 새 무기를 고르면 가진 무기 하나와 <b>바꿀 수 있어요</b>(합체에 쓰인 무기는 빼고). 탱탱볼·도탄 톱날·로봇·팽이의 이동 속도도 공격 속도에 비례해요. ${Object.values(WEAPONS).filter(weapon => weapon.summon).map(weapon => weapon.label).join('·')}은 소환 능력치를 받아요. 행운 동전·손종·나침반·보물 도장·모래시계는 보물 피해 증가도 적용돼요. 보물 20점 빌드도 시작 무기와 무기 강화·교체를 사용할 수 있어요. 무기는 5레벨까지 올리고, 5레벨이 되면 <b>완성형</b>이 선택지에 나와요. 수치는 1레벨 → 5레벨이에요.</p>
    ${categoryFilters()}<ul class="evolve-list">${Object.entries(WEAPONS).filter(([id]) => categoryMatches(id)).map(([id, weapon]) => {
      const lines = [
        weapon.damage && `피해 ${statLine(id, 'damage')}`,
        weapon.finisher && `완성형부터 처치 시 ${weapon.finisher.label}: 피해 ${weapon.finisher.damage}배 · 개체당 ${weapon.finisher.cooldown}초 쿨타임`,
        weapon.dps && `초당 피해 ${statLine(id, 'dps')}`,
        weapon.cooldown && `쿨타임 ${statLine(id, 'cooldown', '초')}`,
        Array.isArray(weapon.count) && (weapon.summon === 'dragon'
          ? `몸통 마디 ${weapon.segments} → ${weapon.segments + (weapon.count.at(-1) - 1) * weapon.segmentsPerCount} · 소환 수 +1마다 ${weapon.segmentsPerCount}마디 추가`
          : `개수 ${statLine(id, 'count')}`),
        ...elementLines(id),
      ].filter(Boolean);
      return `<li>${itemIcon(id)}<span><b>${escapeHtml(weapon.label)} <small class="weapon-category">${weaponBadge(id)}</small></b><em>${escapeHtml(weapon.description)}</em>${lines.map((line) => `<i>${line}</i>`).join('')}
        <i class="is-evolve">★ ${escapeHtml(EVOLUTIONS[id].label)}: ${escapeHtml(EVOLUTIONS[id].description)}</i></span></li>`;
    }).join('')}</ul>`],
  ['passive', '패시브', () => `<p class="ranking-note">무기와 함께 레벨업 선택지에 나와요. 치명타 피해(핫소스)는 네잎클로버를 가진 뒤에만 나오고, 보물 패시브(광택제, 태엽 열쇠)는 보물 파트 20점, 고정 피해 패시브(정밀 스프링, 경량 기어, 균형추)는 공속 파트 20점이어야 나와요. 소환 휘장·증원 호루라기는 소환 파트 20점부터 나와요. 붉은 조준경·급소 잉크·파쇄 렌즈는 치명 20점, 반응 촉매·분광 시약·부식 용액은 지속·속성 20점부터 나와요. 보물 20점에는 진열 받침대·감정 수첩·수집 도감도 열려요.</p>
    <ul class="evolve-list">${Object.entries(PASSIVES).filter(([,passive])=>!passive.hidden).map(([id, passive]) => {
      const max = Object.values(passive).find(Array.isArray).length;
      return `<li>${itemIcon(id)}<span><b>${escapeHtml(passive.label)} <small>최대 ${max}레벨${passive.treasureOnly ? ' · 보물 20점' : passive.hasteOnly ? ' · 공속 20점' : passive.summonOnly ? ' · 소환 20점' : passive.critOnly ? ' · 치명 20점' : passive.dot20Only ? ' · 지속·속성 20점' : ''}</small></b><em>${escapeHtml(passive.description)}</em>
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
  ['character', '캐릭터', () => `<p class="ranking-note">캐릭터 보너스는 능력치 30점과 별도로 적용돼요. 시작 전에 하나를 고르고, 다음 판에도 같은 캐릭터로 시작해요.</p>
    <ul class="evolve-list">${Object.entries(CHARACTERS).map(([id, character]) => `
      <li><img class="px codex-sprite" src="${duckIconUrl(id)}" alt=""><span><b>${escapeHtml(character.label)}</b><em>${escapeHtml(character.description)}</em>${character.stats.map(line => `<i>${escapeHtml(line)}</i>`).join('')}</span></li>`).join('')}</ul>`],
  ['build', '능력치', () => `<p class="ranking-note">시작할 때 모두 같은 <b>${BUILD_POINTS}점</b>을 다섯 파트에 나눠요(파트당 최대 ${BUILD_MAX}). 포인트마다 기본 수치가 조금 오르고, <b>5·10·20점</b>에 그 파트만의 능력이 열려요.</p>
    <ul class="evolve-list">${Object.entries(BUILD).map(([tree, def]) => `
      <li>${itemIcon(def.icon)}<span><b>${def.label}</b><em>1점당: ${escapeHtml(buildEffect(tree, 1))}</em>
        ${Object.entries(def.perks).map(([at, perk]) => `<i class="${Number(at) === BUILD_MAX ? 'is-evolve' : ''}">${at}점 ${escapeHtml(perk.name)}: ${escapeHtml(perk.text)}</i>`).join('')}</span></li>`).join('')}</ul>`],
  ['map', '맵', () => `<p class="ranking-note">바닥 타일만 다르고 규칙은 같아서 순위는 함께 매겨요.</p>
    <ul class="evolve-list">${Object.entries(MAPS).map(([, map]) => `
      <li><span class="map-swatch" style="--a: ${map.swatch[0]}; --b: ${map.swatch[1]}"></span><span><b>${escapeHtml(map.label)}</b><em>${escapeHtml(map.description)}</em></span></li>`).join('')}</ul>`],
  ['diy', '설치물', () => {
    const row = (id, item) => {
      const effect = item.haste ? `지원 반경 ${item.radius.join('/')}, 공격 속도 +${item.haste.map(value => Math.round(value * 100)).join('/')}%` : `피해 ${item.damage.join('/')}`;
      return `<li>${itemIcon(id)}<span><b>${escapeHtml(item.label)}</b><em>${escapeHtml(item.description)}. 동시에 ${item.count.join('/')}개, ${escapeHtml(effect)}</em></span></li>`;
    };
    return `<p class="ranking-note">집돌이 오리만 써요. 레벨업에서 무기 대신 설치물을 고르고, 설치물은 오리 주변에 저절로 깔려요. 설치물은 소환으로 쳐서 소환 능력치와 소환 패시브를 받아요. ${STRUCTURE_LIFE}초가 지나거나 오리가 멀리 떠나면 해체되고, 다시 깔려요.</p>
      <ul class="evolve-list">${Object.entries(STRUCTURES).map(([id, item]) => row(id, item)).join('')}</ul>
      <h3 class="recipe-heading">완성형 (Lv 5)</h3><ul class="evolve-list">${Object.entries(STRUCTURE_EVOLUTIONS).map(([id, item]) => `<li>${itemIcon(id)}<span><b>${escapeHtml(item.label)} ★</b><em>${escapeHtml(STRUCTURES[id].label)} Lv 5. ${escapeHtml(item.stats.join(', '))}</em></span></li>`).join('')}</ul>
      <h3 class="recipe-heading">합체</h3><ul class="evolve-list">${Object.entries(STRUCTURE_FUSIONS).map(([id, item]) => `<li>${itemIcon(id)}<span><b>${escapeHtml(item.label)}</b><em>${escapeHtml(item.parts.map(part => STRUCTURE_EVOLUTIONS[part].label).join(' + '))}. ${escapeHtml(item.stats.join(', '))}</em></span></li>`).join('')}</ul>
      <h3 class="recipe-heading">공구 보물</h3><ul class="evolve-list">${Object.entries(DIY_RELICS).map(([id, item]) => `<li>${itemIcon(id)}<span><b>${escapeHtml(item.label)}</b><em>${escapeHtml(item.stats.join(', '))}</em></span></li>`).join('')}</ul>`;
  }],
  ['necro', '괴담', () => {
    const row = (icon, label, text, extra = '') => `<li>${itemIcon(icon)}<span><b>${escapeHtml(label)}${extra}</b><em>${escapeHtml(text)}</em></span></li>`;
    return `<p class="ranking-note">괴담 오리만 써요. 적을 처치하면 영혼이 모이고, <b>R</b>을 눌러 영혼 창에서 해골을 모집하거나 병사를 바쳐 건물주까지 키워요. 해골과 좀비는 체력이 다하면 사라져요. <b>단단한 뼈</b>로 최대 체력을 늘릴 수 있어요. 능력치의 <b>괴담</b> 파트가 해골 군단을 강하게 만들어요.</p>
      <h3 class="recipe-heading">군단</h3><ul class="evolve-list">${Object.entries(ARMY).map(([id, unit]) => row(id, unit.label,
        `체력 ${unit.hp}, 피해 ${unit.damage}, 병력 ${unit.cap}칸${unit.taunt ? ', 주변 적을 끌어당겨 내리친다' : ''}`)).join('')}</ul>
      <h3 class="recipe-heading">모집과 의식</h3><ul class="evolve-list">${Object.entries(RECRUITS).map(([id, recruit]) => row(recruit.unit, recruit.label, `영혼 ${recruit.price}개로 ${recruit.amount}명`)).join('')}
        ${Object.entries(RITUALS).map(([id, ritual]) => row(id, ritual.label, `${Object.entries(ritual.cost).map(([type, count]) => `${ARMY[type].label} ${count}`).join(' + ')}, 영혼 ${ritual.souls}개 → ${ARMY[id].label}`)).join('')}</ul>
      <h3 class="recipe-heading">괴담과 지휘</h3><ul class="evolve-list">${Object.entries(UNDEAD).map(([id, spell]) => row(id, spell.label, spell.description)).join('')}
        ${Object.entries(COMMANDS).map(([id, command]) => row(command.icon, command.label, command.description)).join('')}</ul>
      <h3 class="recipe-heading">괴담 완성형</h3><ul class="evolve-list">${Object.entries(UNDEAD_EVOLUTIONS).map(([id, evolution]) => row(id, evolution.label, `${UNDEAD[id].label} Lv 5 + ${COMMANDS[evolution.needs].label}. ${evolution.stats.join(', ')}`, ' ★')).join('')}</ul>
      <h3 class="recipe-heading">괴담 보물</h3><ul class="evolve-list">${Object.entries(NECRO_RELICS).map(([id, relic]) => row(relic.icon ?? id, relic.label, relic.stats.join(', '))).join('')}</ul>`;
  }],
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

// 시작 화면의 능력치 투자. 모두 같은 30점을 다섯 파트에 나누고, 나눈 대로 다음 판에도 기억한다.
let selectedBuild = normalizeBuildSafe();

function normalizeBuildSafe(raw) {
  try {
    return normalizeBuild(raw ?? JSON.parse(recall(BUILD_KEY) || '{}'));
  } catch {
    return normalizeBuild({});
  }
}

const BUILD_TEXT = {
  dotPower: ['지속 피해', value => `+${Math.round(value * 1000) / 10}%`],
  elementalPower: ['속성 피해', value => `+${Math.round(value * 100)}%`],
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
  armyPower: ['해골 피해', (value) => `+${Math.round(value * 100)}%`],
};

// 그 파트에 points점을 넣었을 때의 효과 글
function buildEffect(tree, points) {
  const efficiency = buildEfficiency(points);
  return Object.entries(BUILD[tree].per).map(([key, per]) => `${BUILD_TEXT[key][0]} ${BUILD_TEXT[key][1](per * points * efficiency)}`).join(', ');
}

const recommendedBuild = role => normalizeBuild(({ normal:{crit:20,haste:10},summoner:{summon:20,haste:10},hunter:{treasure:20,crit:10},gunner:{haste:20,crit:10},alchemist:{dot:20,haste:10},necromancer:{necro:20,haste:10},diy:{summon:20,haste:10} })[role] ?? {});
const balancedBuild = () => normalizeBuild({crit:6,haste:6,summon:6,treasure:6,dot:6});
const sameBuild = (a,b) => Object.keys(BUILD).every(key=>a[key]===b[key]);
function drawStartSummary() {
  const used=Object.values(selectedBuild).reduce((sum,value)=>sum+value,0);
  document.querySelector('.start-summary').textContent=`${CHARACTERS[selectedCharacter].label} · ${MAPS[selectedMap].label} · ${used}/30점`;
}

function drawBuild() {
  const used = Object.values(selectedBuild).reduce((sum, points) => sum + points, 0);
  document.querySelector('.build-left').textContent = `${BUILD_POINTS - used}`;
  document.querySelector('.build-summary').textContent=Object.entries(selectedBuild).filter(([,points])=>points>0).map(([key,points])=>`${BUILD[key].label} ${points}`).join(' · ') || '포인트를 배분해 주세요';
  document.querySelectorAll('[data-build-preset]').forEach(button=>button.classList.toggle('is-active',sameBuild(selectedBuild,button.dataset.buildPreset==='recommended'?recommendedBuild(selectedCharacter):balancedBuild())));
  drawStartSummary();
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

let selectedCharacter = 'normal';
function drawCharacterPicker() {
  document.querySelector('.character-picker').innerHTML = Object.entries(CHARACTERS).map(([id, character]) => `
    <button class="character-choice${id === selectedCharacter ? ' is-active' : ''}" type="button" data-character="${id}" aria-pressed="${id === selectedCharacter}">
      <img src="${duckIconUrl(id)}" alt=""><b>${escapeHtml(character.label)}</b>
      <small>${character.stats.map(line => `<span>${escapeHtml(line)}</span>`).join('')}</small>
    </button>`).join('');
  document.querySelector('.character-description').textContent=CHARACTERS[selectedCharacter].description;
  document.querySelector('.start-character-preview').innerHTML=`<img src="${duckIconUrl(selectedCharacter)}" alt=""><div><b>${CHARACTERS[selectedCharacter].label}</b><p>${CHARACTERS[selectedCharacter].description}</p></div>`;
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
    // 1~3위는 시상대로, 나머지는 목록으로 보여 준다.
    const podium = ranking.slice(0, 3).map((entry, index) => ({ entry, index })).sort((a, b) => [1, 0, 2].indexOf(a.index) - [1, 0, 2].indexOf(b.index));
    list.innerHTML = ranking.length === 0
      ? `<li class="ranking-empty">${season === SEASON ? '새 시즌이 막 시작했어요. 첫 기록을 남겨 보세요.' : '기록이 없어요.'}</li>`
      : `<li class="podium">${podium.map(({ entry, index }) => `
          <div class="podium-spot is-${index + 1}${entry.crewName === crewName ? ' is-me' : ''}">
            <span class="podium-medal">${index + 1}</span>
            <b class="podium-crew">${escapeHtml(entry.crewName)}</b>
            <span class="podium-time">${formatTime(entry.survivedMs / 1000)}</span>
            <small>${entry.kills.toLocaleString('ko-KR')}마리</small>
            <i class="podium-base" aria-hidden="true"></i>
          </div>`).join('')}</li>`
        + ranking.slice(3).map((entry, index) => `
          <li class="${entry.crewName === crewName ? 'is-me' : ''}">
            <span class="rank">${index + 4}</span>
            <span class="crew">${escapeHtml(entry.crewName)}<small>${entry.kills.toLocaleString('ko-KR')}마리</small></span>
            <span class="points">${formatTime(entry.survivedMs / 1000)}</span>
          </li>`).join('');
  } catch (error) {
    list.innerHTML = `<li class="ranking-empty">${escapeHtml(error.message)}</li>`;
  }
}

// 화면 아무 곳이나 누른 자리가 조이스틱 중심이 된다.
gameScreen.addEventListener('pointerdown', (event) => {
  if (!game || paused || pickerOpen || game.choices || event.target.closest('button')) return;
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
  if (event.code === 'Escape' && pickerOpen) { closePicker(); return; }
  const onTitle = startScreen.classList.contains('is-active');
  const typing = document.activeElement?.matches('input, textarea');
  if (onTitle && !startScreen.classList.contains('is-setup') && event.code === 'Enter' && !typing) { setSetup(true); event.preventDefault(); return; }
  if (onTitle && startScreen.classList.contains('is-setup') && event.code === 'Escape') { setSetup(false); return; }
  if (event.code === 'Escape' && playing) setPaused(!paused);
  if (game?.choices && event.repeat) return;
  // 강령술사: R로 영혼 창을 열고 닫는다. 다른 선택 창에서는 원래대로 다시 뽑기다.
  if (event.code === 'KeyR' && game?.shop) { declineChoice(game); drawChoices(); return; }
  if (event.code === 'KeyR' && playing && !paused && !game.choices && openSoulShop(game)) { drawChoices(); return; }
  if (event.code === 'KeyR' && game?.choices) rerollChoices();
  if (playing && game.practice && !game.choices && !paused && event.code === 'KeyB') { if (pickerOpen) closePicker(); else openPicker(); }
  if (event.code === 'KeyQ' && game?.choices && declineChoice(game)) drawChoices();
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
// 같은 게임을 여러 탭에서 열어도 끄기 설정을 다른 탭에 즉시 반영한다.
window.addEventListener('storage', (event) => {
  if (event.key !== SOUND_KEY && event.key !== EFFECTS_KEY) return;
  musicMuted = recall(SOUND_KEY) === 'off';
  effectsMuted = recall(EFFECTS_KEY) === 'off';
  drawSoundButtons();
  syncSound();
});

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
  const preset=event.target.closest('[data-build-preset]')?.dataset.buildPreset;
  if(preset){selectedBuild=preset==='recommended'?recommendedBuild(selectedCharacter):balancedBuild();remember(BUILD_KEY,JSON.stringify(selectedBuild));drawBuild();}
  if (action === 'build-reset') {
    selectedBuild = normalizeBuild({});
    remember(BUILD_KEY, JSON.stringify(selectedBuild));
    drawBuild();
  }
  const character = event.target.closest('[data-character]')?.dataset.character;
  if (character && Object.hasOwn(CHARACTERS, character)) {
    const wasRecommended=sameBuild(selectedBuild,recommendedBuild(selectedCharacter));
    selectedCharacter = character;
    remember(CHARACTER_KEY, character);
    if(wasRecommended){selectedBuild=recommendedBuild(character);remember(BUILD_KEY,JSON.stringify(selectedBuild));}
    drawCharacterPicker();drawBuild();
    document.querySelector(`[data-character="${character}"]`).focus({preventScroll:true});
  }
  const map = event.target.closest('[data-map]')?.dataset.map;
  if (map && MAPS[map]) {
    selectedMap = map;
    remember(MAP_KEY, map);
    drawMapPicker();drawStartSummary();
  }
  const codex = event.target.closest('[data-codex]')?.dataset.codex;
  if (codex) openRecipes(codex);
  const rarity = event.target.closest('[data-relic-filter]')?.dataset.relicFilter;
  if (rarity === 'all' || Object.hasOwn(RELIC_RARITIES, rarity)) filterRelicCodex(rarity);
  const category = event.target.closest('[data-weapon-category]')?.dataset.weaponCategory;
  if (category && (category === 'all' || Object.hasOwn(WEAPON_CATEGORIES, category))) { weaponCategoryFilter = category; openRecipes(codexTab); }
  if (action === 'home') { setSetup(false); show('start'); }
  if (action === 'setup') setSetup(true);
  if (action === 'title') setSetup(false);
  if (action === 'retry') start(Boolean(game?.practice));
  if (action === 'practice') start(true);
  if (action === 'practice-open' && game?.practice && !game.choices) openPicker();
  if (action === 'practice-close') closePicker();
  const tab = event.target.closest('[data-practice-tab]')?.dataset.practiceTab;
  if (tab) { practiceTab = tab; drawPicker(); }
  const removeButton = event.target.closest('[data-practice-remove]');
  const pickButton = event.target.closest('[data-practice-pick]');
  if (removeButton && game?.practice) {
    const [kind, id] = removeButton.dataset.practiceRemove.split(':');
    if (practiceRemove(game, kind, id)) { music.playEffect('select'); drawLoadout(); drawPicker(); }
  } else if (pickButton && game?.practice) {
    const [kind, id] = pickButton.dataset.practicePick.split(':');
    if (practicePick(game, kind, id)) {
      music.playEffect('select');
      drawLoadout();
      // 칸이 가득 차 교체 창이 뜨면 고르기 창을 닫고 교체 창을 보여 준다.
      if (game.choices) closePicker(); else drawPicker();
    } else practicePicker.querySelector('.practice-note').textContent = '더 받을 수 없어요. 칸이 가득 찼거나 이미 최고 단계예요';
  }
  if (action === 'pause') setPaused(true);
  if (action === 'souls' && game && !paused) {
    if (game.shop) declineChoice(game);
    else openSoulShop(game);
    drawChoices();
  }
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
selectedCharacter = Object.hasOwn(CHARACTERS, recall(CHARACTER_KEY)) ? recall(CHARACTER_KEY) : 'normal';
drawCharacterPicker();
selectedBuild = recall(BUILD_KEY) ? normalizeBuildSafe() : recommendedBuild(selectedCharacter);
drawBuild();
document.querySelector('.start-season').textContent=`SEASON ${SEASON}`;
nameInput.value = crewName;



drawSoundButtons();
syncSound();
runTitleDemo();
