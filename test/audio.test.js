import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMusic } from '../src/audio.js';

const settle = () => new Promise((resolve) => setImmediate(resolve));

function audioEnvironment(t, { unsupported = false, rejectResume = false } = {}) {
  const instances = [];
  const timers = new Map();
  const param = () => ({
    value: 0,
    setValueAtTime() {}, linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {},
  });
  class Context {
    constructor() {
      this.currentTime = 0;
      this.sampleRate = 8000;
      this.state = 'suspended';
      this.destination = {};
      this.sources = [];
      instances.push(this);
    }
    createGain() { return { gain: param(), connect() {}, disconnect() {} }; }
    createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; }
    createOscillator() { return this.source(); }
    createBufferSource() { return this.source(); }
    source() {
      const source = { frequency: param(), starts: [], stops: [], connect() {}, disconnect() {} };
      source.start = (time) => source.starts.push(time);
      source.stop = (time) => source.stops.push(time);
      this.sources.push(source);
      return source;
    }
    resume() {
      if (rejectResume) return Promise.reject(new Error('Audio unavailable'));
      this.state = 'running';
      return Promise.resolve();
    }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
  }
  for (const [name, value] of [['AudioContext', unsupported ? undefined : Context], ['webkitAudioContext', undefined]]) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, name, previous);
      else delete globalThis[name];
    });
  }
  t.mock.method(globalThis, 'setInterval', (callback) => {
    const id = Symbol('audio timer');
    timers.set(id, callback);
    return id;
  });
  t.mock.method(globalThis, 'clearInterval', (id) => timers.delete(id));
  return { instances, timers };
}

test('사용자 입력으로 오디오를 해제하기 전에는 배경음악을 재생하지 않는다', async (t) => {
  const { instances, timers } = audioEnvironment(t);
  const music = createMusic();
  t.after(() => music.destroy());
  music.setPlaying(true);
  music.playEffect('select');
  assert.equal(instances.length, 0);
  assert.equal(timers.size, 0);

  assert.equal(await music.unlock(), true);
  await settle();
  assert.equal(timers.size, 1);
  assert.ok(instances[0].sources.some((source) => source.starts.length > 0));
});

test('반복 시작과 음소거 전환에도 음악 타이머를 중복 생성하지 않는다', async (t) => {
  const { instances, timers } = audioEnvironment(t);
  const music = createMusic();
  t.after(() => music.destroy());
  music.setPlaying(true);
  await music.unlock();
  await settle();
  const firstSource = instances[0].sources[0];
  const scheduledStops = firstSource.stops.length;
  music.setPlaying(true);
  music.setPlaying(true);
  await settle();
  assert.equal(timers.size, 1);

  music.setMuted(true);
  assert.equal(timers.size, 0);
  assert.ok(firstSource.stops.length > scheduledStops);
  music.setMuted(false);
  await settle();
  assert.equal(timers.size, 1);
  music.setPlaying(false);
  assert.equal(timers.size, 0);
});

test('음악을 멈춘 레벨업 화면에서도 효과음을 내고 음소거하면 효과음도 끈다', async (t) => {
  const { instances, timers } = audioEnvironment(t);
  const music = createMusic();
  t.after(() => music.destroy());
  await music.unlock();
  music.setPlaying(false);
  music.playEffect('levelup');
  await settle();
  const context = instances[0];
  assert.ok(context.sources.length > 0);
  assert.equal(timers.size, 0);
  const scheduledStops = context.sources[0].stops.length;
  music.setMuted(true);
  assert.ok(context.sources[0].stops.length > scheduledStops);
  const sourceCount = context.sources.length;
  music.playEffect('boss');
  await settle();
  assert.equal(context.sources.length, sourceCount);
});

test('한꺼번에 여러 적을 잡아도 처치 효과음이 겹쳐 쌓이지 않는다', async (t) => {
  t.mock.method(Date, 'now', () => 1000);
  const { instances } = audioEnvironment(t);
  const music = createMusic();
  t.after(() => music.destroy());
  await music.unlock();
  music.playEffect('kill');
  await settle();
  const count = instances[0].sources.length;
  music.playEffect('kill');
  music.playEffect('kill');
  await settle();
  assert.equal(instances[0].sources.length, count);
});

test('음소거 직전에 대기하던 효과음은 다시 소리를 켜도 뒤늦게 재생하지 않는다', async (t) => {
  const { instances } = audioEnvironment(t);
  const music = createMusic();
  t.after(() => music.destroy());
  await music.unlock();
  music.playEffect('select');
  music.setMuted(true);
  music.setMuted(false);
  await settle();
  assert.equal(instances[0].sources.length, 0);
});

test('오디오가 없거나 재생 승인이 거절되어도 게임 코드를 중단하지 않는다', async (t) => {
  audioEnvironment(t, { unsupported: true });
  const music = createMusic();
  music.setPlaying(true);
  assert.equal(await music.unlock(), false);
  assert.doesNotThrow(() => music.playEffect('kill'));
  assert.doesNotThrow(() => music.setMuted(true));
  music.destroy();
});

test('재생이 거절되면 타이머를 시작하지 않고 종료 후 재시작하지 않는다', async (t) => {
  const { instances, timers } = audioEnvironment(t, { rejectResume: true });
  const music = createMusic();
  music.setPlaying(true);
  assert.equal(await music.unlock(), false);
  await settle();
  assert.equal(timers.size, 0);
  music.destroy();
  assert.equal(instances[0].state, 'closed');
  music.setPlaying(true);
  music.playEffect('gameover');
  assert.equal(await music.unlock(), false);
  await settle();
  assert.equal(timers.size, 0);
});

test('전투와 획득 효과음은 배경음악 없이도 각자 재생된다', async (t) => {
  const { instances } = audioEnvironment(t);
  for (const name of ['shoot', 'slash', 'impact', 'zap', 'xp', 'pickup', 'chest', 'evolve', 'kill', 'hurt', 'levelup', 'boss', 'gameover', 'select', 'laserCharge', 'laserBlast']) {
    const music = createMusic();
    await music.unlock();
    await settle();
    music.playEffect(name);
    await settle();
    assert.ok(instances.at(-1).sources.some((source) => source.starts.length), name);
    music.destroy();
  }
});

test('배경음악을 꺼도 재생 중인 효과음과 새 효과음은 유지된다', async (t) => {
  const { instances, timers } = audioEnvironment(t);
  const music = createMusic();
  t.after(() => music.destroy());
  await music.unlock();
  music.setPlaying(true);
  await settle();
  const context = instances[0];
  const before = context.sources.length;
  music.playEffect('hurt');
  await settle();
  const effect = context.sources[before];
  const stopCount = effect.stops.length;
  music.setPlaying(false);
  assert.equal(timers.size, 0);
  assert.equal(effect.stops.length, stopCount);
  const count = context.sources.length;
  music.playEffect('pickup');
  await settle();
  assert.ok(context.sources.length > count);
});

test('효과음을 꺼도 배경음악은 계속 재생하고 대기 효과음은 취소한다', async (t) => {
  const { instances, timers } = audioEnvironment(t);
  const music = createMusic();
  t.after(() => music.destroy());
  music.setPlaying(true);
  await music.unlock();
  await settle();
  const context = instances[0];
  const track = context.sources[0];
  const stops = track.stops.length;
  const count = context.sources.length;
  music.playEffect('select');
  music.setEffectsMuted(true);
  music.setEffectsMuted(false);
  await settle();
  assert.equal(context.sources.length, count);
  music.setEffectsMuted(true);
  music.playEffect('hurt');
  await settle();
  assert.equal(context.sources.length, count);
  assert.equal(track.stops.length, stops);
  assert.equal(timers.size, 1);
  music.setPlaying(false);
  music.setEffectsMuted(false);
  music.playEffect('pickup');
  await settle();
  assert.ok(context.sources.length > count);
  assert.equal(timers.size, 0);
});
