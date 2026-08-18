// Web Audio tactical SFX engine — richer layered synthesis, no external assets.
let ctx = null;
let masterGain = null;
let verb = null;
let muted =
  typeof window !== "undefined" && localStorage.getItem("wow_muted") === "1";

function makeReverb(c) {
  const conv = c.createConvolver();
  const len = Math.floor(c.sampleRate * 1.6);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  conv.buffer = buf;
  return conv;
}

function ensure() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(ctx.destination);
    verb = ctx.createGain();
    verb.gain.value = 0.28;
    const conv = makeReverb(ctx);
    verb.connect(conv);
    conv.connect(masterGain);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export const soundManager = {
  isMuted: () => muted,
  setMuted: (v) => {
    muted = v;
    try {
      localStorage.setItem("wow_muted", v ? "1" : "0");
    } catch (e) {
      console.warn("sound pref persist failed", e);
    }
    if (masterGain) masterGain.gain.value = v ? 0 : 0.5;
  },
  toggle: () => {
    soundManager.setMuted(!muted);
    return muted;
  },
  prime: () => ensure(),
};

function tone({
  freq = 440,
  dur = 0.15,
  type = "sine",
  gain = 0.3,
  start = 0,
  glideTo = null,
  attack = 0.005,
  release = 0.06,
  send = 0,
}) {
  const c = ensure();
  if (!c || muted) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo)
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
  osc.connect(g);
  g.connect(masterGain);
  if (send > 0 && verb) {
    const s = c.createGain();
    s.gain.value = send;
    g.connect(s);
    s.connect(verb);
  }
  osc.start(t0);
  osc.stop(t0 + dur + release + 0.02);
}

function noiseBurst({ dur = 0.2, gain = 0.2, start = 0, hp = 800, lp = null }) {
  const c = ensure();
  if (!c || muted) return;
  const t0 = c.currentTime + start;
  const buffer = c.createBuffer(
    1,
    Math.floor(c.sampleRate * dur),
    c.sampleRate,
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++)
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = hp;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  if (lp) {
    const l = c.createBiquadFilter();
    l.type = "lowpass";
    l.frequency.value = lp;
    filter.connect(l);
    l.connect(g);
  } else filter.connect(g);
  g.connect(masterGain);
  src.start(t0);
}

function coinVoice(start = 0, base = 1180, gain = 0.26) {
  tone({ freq: base, dur: 0.13, type: "triangle", gain, start, send: 0.4 });
  tone({
    freq: base * 1.5,
    dur: 0.1,
    type: "sine",
    gain: gain * 0.7,
    start: start + 0.015,
    send: 0.4,
  });
  tone({
    freq: base * 2.02,
    dur: 0.09,
    type: "sine",
    gain: gain * 0.4,
    start: start + 0.03,
    send: 0.5,
  });
}

const CHORD = [523, 659, 784, 1046, 1318, 1568];
function arp(
  notes,
  step = 0.08,
  dur = 0.16,
  gain = 0.28,
  type = "triangle",
  send = 0.35,
  start = 0,
) {
  notes.forEach((f, i) =>
    tone({ freq: f, dur, type, gain, start: start + i * step, send }),
  );
}

export const sfx = {
  prime: () => ensure(),
  click: () => tone({ freq: 620, dur: 0.04, type: "square", gain: 0.15 }),

  spin: () => {
    tone({ freq: 150, dur: 0.55, type: "sawtooth", gain: 0.14, glideTo: 480 });
    tone({ freq: 90, dur: 0.55, type: "square", gain: 0.06, glideTo: 240 });
    noiseBurst({ dur: 0.55, gain: 0.05, hp: 1200, lp: 6000 });
  },
  reelStop: () => {
    tone({ freq: 220, dur: 0.05, type: "square", gain: 0.2 });
    tone({ freq: 110, dur: 0.07, type: "sine", gain: 0.16 });
    noiseBurst({ dur: 0.05, gain: 0.12, hp: 1500 });
  },

  win: () => {
    arp(CHORD.slice(0, 3), 0.07, 0.16, 0.26, "triangle", 0.4);
    tone({
      freq: 1568,
      dur: 0.5,
      type: "sine",
      gain: 0.08,
      start: 0.22,
      send: 0.6,
    });
  },

  bigWin: () => {
    arp(CHORD, 0.09, 0.22, 0.3, "triangle", 0.45);
    tone({
      freq: 130.8,
      dur: 0.9,
      type: "sawtooth",
      gain: 0.12,
      start: 0,
      send: 0.3,
    });
    tone({
      freq: 261.6,
      dur: 0.9,
      type: "sawtooth",
      gain: 0.1,
      start: 0,
      send: 0.3,
    });
    noiseBurst({ dur: 0.5, gain: 0.06, start: 0.15, hp: 2500 });
    for (let i = 0; i < 5; i++) coinVoice(0.4 + i * 0.06, 1200 + i * 60, 0.16);
  },

  jackpot: () => {
    arp(
      [523, 659, 784, 1046, 1318, 1568, 2093],
      0.08,
      0.26,
      0.3,
      "triangle",
      0.5,
    );
    tone({ freq: 65.4, dur: 1.4, type: "sawtooth", gain: 0.14, send: 0.35 });
    tone({ freq: 130.8, dur: 1.4, type: "square", gain: 0.08, send: 0.35 });
    tone({ freq: 196, dur: 1.4, type: "sawtooth", gain: 0.08, send: 0.35 });
    noiseBurst({ dur: 1.0, gain: 0.08, start: 0.2, hp: 3000 });
    for (let i = 0; i < 12; i++)
      coinVoice(0.5 + i * 0.05, 1100 + (i % 5) * 90, 0.14);
  },

  lose: () =>
    tone({ freq: 200, dur: 0.25, type: "sawtooth", gain: 0.18, glideTo: 90 }),

  coin: () => coinVoice(0, 1200, 0.28),

  coinLock: (level = 0) => {
    tone({ freq: 300 + level * 40, dur: 0.08, type: "square", gain: 0.2 });
    coinVoice(0.02, 900 + level * 70, 0.2);
    noiseBurst({ dur: 0.12, gain: 0.06, hp: 1800 });
  },

  scatter: () => {
    tone({
      freq: 300,
      dur: 0.75,
      type: "sawtooth",
      gain: 0.22,
      glideTo: 1500,
      send: 0.4,
    });
    tone({ freq: 150, dur: 0.75, type: "square", gain: 0.1, glideTo: 750 });
    noiseBurst({ dur: 0.75, gain: 0.07, hp: 900 });
    arp(CHORD.slice(2), 0.1, 0.2, 0.2, "triangle", 0.5, 0.5);
  },

  holdStart: () => {
    tone({
      freq: 110,
      dur: 1.0,
      type: "sawtooth",
      gain: 0.14,
      glideTo: 440,
      send: 0.4,
    });
    arp([392, 523, 659, 784], 0.12, 0.24, 0.26, "triangle", 0.5, 0.15);
    noiseBurst({ dur: 0.6, gain: 0.08, start: 0.1, hp: 1500 });
  },

  wheelSpin: () => {
    tone({
      freq: 200,
      dur: 1.6,
      type: "sawtooth",
      gain: 0.12,
      glideTo: 900,
      send: 0.3,
    });
    noiseBurst({ dur: 1.6, gain: 0.04, hp: 1400, lp: 5000 });
  },
  wheelTick: () => tone({ freq: 900, dur: 0.03, type: "square", gain: 0.14 }),
  wheelStop: () => {
    tone({ freq: 520, dur: 0.12, type: "square", gain: 0.24 });
    coinVoice(0.05, 1300, 0.24);
    noiseBurst({ dur: 0.2, gain: 0.08, hp: 2200 });
  },

  freeSpinTick: (level = 0) =>
    tone({ freq: 500 + level * 60, dur: 0.06, type: "square", gain: 0.18 }),

  promote: () => {
    arp(CHORD, 0.11, 0.24, 0.3, "triangle", 0.5);
    tone({
      freq: 1046,
      dur: 0.5,
      type: "sawtooth",
      gain: 0.16,
      start: 0.6,
      send: 0.5,
    });
    noiseBurst({ dur: 0.5, gain: 0.06, start: 0.6, hp: 2500 });
  },

  nearMiss: () => {
    tone({ freq: 380, dur: 0.36, type: "sawtooth", gain: 0.22, glideTo: 880 });
    tone({
      freq: 300,
      dur: 0.36,
      type: "square",
      gain: 0.14,
      glideTo: 760,
      start: 0.02,
    });
    tone({
      freq: 460,
      dur: 0.36,
      type: "sawtooth",
      gain: 0.22,
      glideTo: 1020,
      start: 0.4,
    });
    tone({
      freq: 360,
      dur: 0.36,
      type: "square",
      gain: 0.14,
      glideTo: 900,
      start: 0.42,
    });
  },
  combatAmbienceStart: () => {
    const c = ensure();
    if (!c || muted) return null;
    const t0 = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.value = 50;
    g.gain.value = 0.05;
    osc.connect(g);
    g.connect(masterGain);
    osc.start(t0);
    return { osc, g };
  },
  combatAmbienceStop: (node) => {
    try {
      if (!node) return;
      const c = ensure();
      const t0 = c.currentTime;
      node.g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
      node.osc.stop(t0 + 0.7);
    } catch (e) {
      console.debug("sound stop failed", e);
    }
  },
};
