import { choose, createGame, formatTime, statsOf, update } from './engine.js';
import { fetchRanking, isShared, submitRecord } from './leaderboard.js';
import { PIXEL, render } from './render.js';
import { iconUrl } from './sprites.js';

const NAME_KEY = 'room-survivors:crew-name';
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

function show(name) {
  screens.forEach((screen) => screen.classList.toggle('is-active', screen.dataset.screen === name));
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
}

function readKeys() {
  const x = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('a') ? 1 : 0);
  const y = (keys.has('ArrowDown') || keys.has('s') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('w') ? 1 : 0);
  return { x, y };
}

function currentInput() {
  if (touch) return input;
  const keyboard = readKeys();
  const length = Math.hypot(keyboard.x, keyboard.y);
  return length > 0 ? { x: keyboard.x / length, y: keyboard.y / length } : { x: 0, y: 0 };
}

function drawHud() {
  const { player } = game;
  document.querySelector('.time-value').textContent = formatTime(game.time);
  document.querySelector('.kills-value').textContent = game.kills.toLocaleString('ko-KR');
  document.querySelector('.level-value').textContent = game.level;
  document.querySelector('.xp-fill').style.transform = `scaleX(${Math.min(1, game.xp / game.nextXp)})`;
  const { maxHp } = statsOf(game);
  document.querySelector('.hp-fill').style.transform = `scaleX(${Math.max(0, player.hp / maxHp)})`;

  const boss = game.enemies.find((enemy) => enemy.boss);
  const bossBar = document.querySelector('.boss-bar');
  bossBar.hidden = !boss;
  if (boss) {
    document.querySelector('.boss-name').textContent = boss.label;
    document.querySelector('.boss-hp-fill').style.transform = `scaleX(${Math.max(0, boss.hp / boss.maxHp)})`;
  }

  const latest = [...game.effects].reverse().find((effect) => effect.type === 'banner');
  if (latest && latest !== shownBannerAge) {
    shownBannerAge = latest;
    banner.textContent = latest.text;
    banner.classList.toggle('is-boss', Boolean(latest.boss));
  }
  banner.classList.toggle('is-visible', Boolean(latest));
}

function drawLoadout() {
  const items = [
    ...Object.entries(game.weapons),
    ...Object.entries(game.passives),
  ];
  document.querySelector('.loadout').innerHTML = items
    .map(([id, level]) => (game.evolved[id]
      ? `<span class="is-evolved"><img class="px" src="${iconUrl(id)}" alt="" />★</span>`
      : `<span><img class="px" src="${iconUrl(id)}" alt="" />${level}</span>`)).join('');
}

function drawChoices() {
  if (game.choices === shownChoices) return;
  shownChoices = game.choices;
  levelupOverlay.hidden = !game.choices;
  if (!game.choices) return;
  touch = null;
  joystick.hidden = true;
  document.querySelector('.choices').innerHTML = game.choices.map((choice, index) => {
    const icon = `<img class="px" src="${iconUrl(choice.kind === 'heal' ? 'heal' : choice.id)}" alt="" />`;
    const tag = choice.kind === 'heal' ? '' : choice.kind === 'evolve' ? '<small class="choice-evolve">완성형</small>' : choice.level === 1
      ? '<small class="choice-new">NEW</small>' : `<small>Lv ${choice.level}</small>`;
    return `
      <button class="choice${choice.kind === 'evolve' ? ' is-evolve' : ''}" type="button" data-choice="${index}">
        <span class="choice-icon">${icon}</span>
        <span class="choice-name">${escapeHtml(choice.label)}${tag}</span>
        <span class="choice-desc">${escapeHtml(choice.description)}</span>
      </button>`;
  }).join('');
}

function frame(now) {
  const elapsed = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  if (!paused) {
    carry += elapsed;
    while (carry >= STEP) {
      update(game, STEP, currentInput());
      carry -= STEP;
      if (game.choices || game.over) {
        carry = 0;
        break;
      }
    }
  }
  render(ctx, game, viewport.width, viewport.height, now / 1000);
  drawHud();
  drawChoices();
  if (game.over) {
    finish();
    return;
  }
  frameId = requestAnimationFrame(frame);
}

function start() {
  cancelAnimationFrame(frameId);
  game = createGame();
  paused = false;
  carry = 0;
  touch = null;
  shownChoices = null;
  shownBannerAge = null;
  pausedOverlay.hidden = true;
  levelupOverlay.hidden = true;
  joystick.hidden = true;
  show('game');
  resize();
  drawLoadout();
  // 주소 끝에 #debug를 붙이면 콘솔에서 게임 상태를 볼 수 있다.
  if (window.location.hash === '#debug') window.__game = game;
  lastFrame = performance.now();
  frameId = requestAnimationFrame(frame);
}

function setPaused(value) {
  if (!game || game.over) return;
  paused = value;
  pausedOverlay.hidden = !value;
  touch = null;
  joystick.hidden = true;
}

async function finish() {
  cancelAnimationFrame(frameId);
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
  show('result');
  try {
    await submitRecord({ crewName, survivedMs, kills: game.kills, level: game.level });
    const ranking = await fetchRanking();
    const index = ranking.findIndex((entry) => entry.crewName === crewName);
    const best = ranking[index];
    rankText.textContent = index < 0 ? '기록을 남겼어요'
      : `현재 ${index + 1}위${best.survivedMs > survivedMs ? ` (최고 ${formatTime(best.survivedMs / 1000)})` : ''}`;
  } catch (error) {
    rankText.textContent = error.message;
  }
}

async function openRanking() {
  show('ranking');
  const list = document.querySelector('.ranking-list');
  document.querySelector('.ranking-note').textContent = isShared
    ? '크루마다 가장 오래 버틴 기록만 보여요.'
    : '공유 순위가 연결되지 않아 이 브라우저의 기록만 보여요.';
  list.innerHTML = '<li class="ranking-empty">불러오는 중</li>';
  try {
    const ranking = await fetchRanking();
    list.innerHTML = ranking.length === 0
      ? '<li class="ranking-empty">아직 기록이 없어요. 첫 기록을 남겨 보세요.</li>'
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
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(key)) {
    keys.add(key);
    if (game && !game.over) event.preventDefault();
  }
  if (key === 'Escape' && game && !game.over && document.querySelector('[data-screen="game"].is-active')) {
    setPaused(!paused);
  }
  if (game?.choices && ['1', '2', '3'].includes(key)) {
    choose(game, Number(key) - 1);
    drawLoadout();
  }
});
window.addEventListener('keyup', (event) => {
  keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
});
window.addEventListener('resize', () => {
  if (game) resize();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game && !game.over && !game.choices) setPaused(true);
});

window.__drawLoadout = () => drawLoadout();

document.querySelector('.choices').addEventListener('click', (event) => {
  const button = event.target.closest('[data-choice]');
  if (!button || !game?.choices) return;
  choose(game, Number(button.dataset.choice));
  drawLoadout();
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
  if (action === 'ranking') openRanking();
  if (action === 'home') show('start');
  if (action === 'retry') start();
  if (action === 'pause') setPaused(true);
  if (action === 'resume') setPaused(false);
  if (action === 'giveup') {
    paused = false;
    pausedOverlay.hidden = true;
    game.over = true;
  }
});

document.querySelector('.kills-icon').src = iconUrl('roachA');
crewName = recall(NAME_KEY);
nameInput.value = crewName;


