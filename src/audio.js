// 외부 음원 없이 사각파 멜로디, 삼각파 베이스, 노이즈 드럼을 합성한다.
const EIGHTH = 60 / 144 / 2;
const MELODY = [
  [72, 76, 79, 76, 81, 79, 76, 74],
  [72, 0, 76, 79, 76, 74, 72, 0],
  [69, 72, 76, 79, 81, 79, 76, 72],
  [74, 76, 79, 0, 76, 74, 71, 0],
  [72, 76, 79, 84, 83, 79, 76, 74],
  [76, 79, 81, 79, 76, 72, 69, 0],
  [77, 81, 84, 81, 79, 77, 76, 72],
  [74, 79, 83, 79, 76, 74, 72, 0],
  [79, 76, 72, 76, 79, 84, 79, 76],
  [81, 79, 76, 72, 76, 79, 76, 0],
  [77, 81, 79, 77, 76, 72, 74, 76],
  [79, 83, 86, 83, 79, 76, 74, 0],
  [84, 79, 76, 79, 81, 79, 76, 72],
  [81, 76, 72, 76, 79, 76, 72, 69],
  [77, 79, 81, 84, 81, 77, 76, 74],
  [79, 76, 74, 71, 72, 0, 72, 0],
];
const CHORDS = [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]];
const EFFECT_COOLDOWN = { kill: 100, hurt: 160, levelup: 400, boss: 800, gameover: 500, select: 80,
  shoot: 120, slash: 180, impact: 180, zap: 180, pickup: 160, xp: 110, chest: 500, evolve: 500, laserCharge: 200, laserBlast: 350, bounce: 140, roll: 180, pulse: 250 };
const minor = (note) => note - ([4, 9, 11].includes(note % 12) ? 1 : 0);

export function createMusic() {
  let context = null;
  let master = null;
  let noiseBuffer = null;
  let unlocked = false;
  let playing = false;
  let muted = false;
  let effectsMuted = false;
  let destroyed = false;
  let timer = null;
  let step = 0;
  let boss = false;
  let nextNote = 0;
  let pendingEffects = 0;
  let effectGeneration = 0;
  const voices = new Set();
  const lastEffect = new Map();
  const wantsMusic = () => unlocked && playing && !muted && !destroyed;

  function idle() {
    if (context && !destroyed && !wantsMusic() && voices.size === 0 && pendingEffects === 0) {
      void context.suspend().catch(() => {});
    }
  }

  function addVoice(source, time, duration, volume, group) {
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(gain);
    gain.connect(master);
    const voice = { source, gain, group };
    voices.add(voice);
    source.onended = () => {
      voices.delete(voice);
      source.disconnect();
      gain.disconnect();
      idle();
    };
    source.start(time);
    source.stop(time + duration + 0.01);
  }

  function tone(midi, time, duration, type, volume, group = 'music') {
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(440 * 2 ** ((midi - 69) / 12), time);
    addVoice(oscillator, time, duration, volume, group);
  }

  function noise(time, duration, volume, group = 'music') {
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    addVoice(source, time, duration, volume, group);
  }

  function silence(group) {
    if (!context) return;
    const now = context.currentTime;
    for (const voice of [...voices]) {
      if (group && voice.group !== group) continue;
      // 예약한 음도 취소하고, 이미 나는 소리는 짧게 줄여 끊김을 줄인다.
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setTargetAtTime(0.0001, now, 0.003);
      try { voice.source.stop(now + 0.012); } catch { /* 이미 끝난 음 */ }
    }
  }

  function stopMusic() {
    if (timer !== null) clearInterval(timer);
    timer = null;
    silence('music');
    idle();
  }

  function schedule() {
    if (!wantsMusic() || context.state !== 'running') return;
    if (nextNote < context.currentTime - 0.3) nextNote = context.currentTime + 0.03;
    while (nextNote < context.currentTime + 0.15) {
      const bar = Math.floor(step / 8) % MELODY.length;
      const beat = step % 8;
      const chord = CHORDS[bar % CHORDS.length].map(minor);
      const note = minor(MELODY[bar][beat]);
      const eighth = boss ? EIGHTH * 0.9 : EIGHTH;
      if (note) tone(note, nextNote, eighth * 0.72, 'square', 0.095);
      if (beat % 2 === 0 || boss) tone(chord[beat % 4 === 0 ? 0 : 2] - 12, nextNote, eighth * 0.85, 'triangle', 0.16);
      if (beat % 2 === 1) tone(chord[(beat + bar) % 3] + 12, nextNote, eighth * 0.45, 'square', 0.024);
      noise(nextNote, 0.025, 0.012);
      if (beat === 0 || beat === 4) tone(36, nextNote, 0.095, 'sine', 0.17);
      if (beat === 2 || beat === 6) noise(nextNote, 0.075, 0.045);
      step = (step + 1) % (MELODY.length * 8);
      nextNote += eighth;
    }
  }

  function sync() {
    if (!wantsMusic()) { stopMusic(); return; }
    // resume()는 사용자 입력에서 직접 호출되며, 재시작해도 타이머는 하나만 둔다.
    void context.resume().then(() => {
      if (!wantsMusic() || timer !== null || context.state !== 'running') return;
      nextNote = context.currentTime + 0.035;
      schedule();
      timer = setInterval(schedule, 25);
    }).catch(() => {});
  }

  function unlock() {
    if (destroyed) return Promise.resolve(false);
    if (!context) {
      const AudioContext = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!AudioContext) return Promise.resolve(false);
      try {
        context = new AudioContext();
        master = context.createGain();
        master.gain.value = 0.22;
        master.connect(context.destination);
        noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.2), context.sampleRate);
        const samples = noiseBuffer.getChannelData(0);
        for (let index = 0; index < samples.length; index += 1) samples[index] = Math.random() * 2 - 1;
      } catch {
        void context?.close().catch(() => {});
        context = null;
        return Promise.resolve(false);
      }
    }
    unlocked = true;
    return context.resume().then(() => {
      sync();
      return !destroyed;
    }).catch(() => false);
  }

  function playEffect(name) {
    if (!unlocked || !context || muted || effectsMuted || destroyed || !Object.hasOwn(EFFECT_COOLDOWN, name)) return;
    const now = Date.now();
    if (now - (lastEffect.get(name) ?? -Infinity) < EFFECT_COOLDOWN[name]) return;
    if ([...voices].filter((voice) => voice.group === 'effect').length >= 12) return;
    lastEffect.set(name, now);
    const generation = effectGeneration;
    pendingEffects += 1;
    void context.resume().then(() => {
      if (destroyed || muted || effectsMuted || generation !== effectGeneration || context.state !== 'running') return;
      if ([...voices].filter((voice) => voice.group === 'effect').length >= 12) return;
      const start = context.currentTime + 0.01;
      if (name === 'laserCharge') {
        [60, 72, 84].forEach((note, index) => tone(note, start + index * 0.14, 0.18, 'square', 0.045, 'effect'));
        return;
      }
      if (name === 'laserBlast') {
        noise(start, 0.18, 0.14, 'effect');
        tone(38, start, 0.5, 'sawtooth', 0.12, 'effect');
        tone(50, start, 0.28, 'square', 0.09, 'effect');
        tone(62, start + 0.05, 2.85, 'sawtooth', 0.018, 'effect');
        return;
      }
      const notes = {
        kill: [79, 84], hurt: [48, 42], levelup: [72, 76, 79, 84],
        boss: [48, 43, 36], gameover: [67, 63, 60, 55], select: [76, 83],
        bounce: [60, 72], roll: [48, 43], pulse: [48, 60, 72],
        shoot: [88, 73], slash: [67, 55], impact: [43, 31], zap: [96, 67, 91],
        xp: [88], pickup: [72, 79], chest: [60, 67, 72, 79, 84], evolve: [60, 63, 67, 72, 79, 84],
      }[name];
      const spacing = { kill: 0.035, hurt: 0.055, levelup: 0.075, boss: 0.16, gameover: 0.14, select: 0.045,
        bounce: 0.035, roll: 0.025, pulse: 0.04,
        shoot: 0.018, slash: 0.035, impact: 0.055, zap: 0.02, xp: 0.035, pickup: 0.06, chest: 0.09, evolve: 0.075 }[name];
      const volume = ['kill', 'shoot', 'xp', 'bounce', 'roll'].includes(name) ? 0.035 : 0.085;
      notes.forEach((note, index) => tone(note, start + spacing * index, spacing * 1.25, name === 'boss' ? 'triangle' : 'square', volume, 'effect'));
      if (['hurt', 'slash', 'impact', 'roll'].includes(name)) noise(start, 0.055, 0.035, 'effect');
    }).catch(() => {}).finally(() => { pendingEffects -= 1; idle(); });
  }

  return {
    unlock,
    setBoss(value) { boss = Boolean(value); },
    setPlaying(value) {
      if (playing === Boolean(value)) return;
      playing = Boolean(value);
      sync();
    },
    setMuted(value) {
      if (muted === Boolean(value)) return;
      muted = Boolean(value);
      if (muted) { effectGeneration += 1; silence(); }
      sync();
    },
    setEffectsMuted(value) {
      if (effectsMuted === Boolean(value)) return;
      effectsMuted = Boolean(value);
      if (effectsMuted) {
        effectGeneration += 1;
        silence('effect');
        idle();
      }
    },
    playEffect,
    reset() {
      playing = false;
      step = 0;
      boss = false;
      effectGeneration += 1;
      lastEffect.clear();
      stopMusic();
      silence('effect');
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      effectGeneration += 1;
      stopMusic();
      silence();
      for (const voice of voices) { voice.source.disconnect(); voice.gain.disconnect(); }
      voices.clear();
      master?.disconnect();
      void context?.close().catch(() => {});
    },
  };
}
