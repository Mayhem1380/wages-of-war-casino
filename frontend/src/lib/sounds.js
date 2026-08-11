// Web Audio tactical SFX engine — no external assets, fully synthesised.
let ctx = null;
let masterGain = null;
let muted = typeof window !== "undefined" && localStorage.getItem("wow_muted") === "1";

function ensure() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export const soundManager = {
  isMuted: () => muted,
  setMuted: (v) => {
    muted = v;
    try { localStorage.setItem("wow_muted", v ? "1" : "0"); } catch {}
    if (masterGain) masterGain.gain.value = v ? 0 : 0.5;
  },
  toggle: () => { soundManager.setMuted(!muted); return muted; },
  prime: () => ensure(),
};

function tone({ freq = 440, dur = 0.15, type = "sine", gain = 0.3, start = 0, glideTo = null, attack = 0.005, release = 0.06 }) {
  const c = ensure();
  if (!c || muted) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + dur + release + 0.02);
}

function noiseBurst({ dur = 0.2, gain = 0.2, start = 0, hp = 800 }) {
  const c = ensure();
  if (!c || muted) return;
  const t0 = c.currentTime + start;
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = hp;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter); filter.connect(g); g.connect(masterGain);
  src.start(t0);
}

export const sfx = {
  prime: () => ensure(),
  click: () => tone({ freq: 620, dur: 0.04, type: "square", gain: 0.15 }),
  spin: () => {
    tone({ freq: 180, dur: 0.5, type: "sawtooth", gain: 0.16, glideTo: 520 });
    noiseBurst({ dur: 0.5, gain: 0.05, hp: 1200 });
  },
  reelStop: () => { tone({ freq: 240, dur: 0.05, type: "square", gain: 0.2 }); noiseBurst({ dur: 0.05, gain: 0.12, hp: 1500 }); },
  win: () => {
    [523, 659, 784].forEach((f, i) => tone({ freq: f, dur: 0.14, type: "triangle", gain: 0.28, start: i * 0.09 }));
  },
  bigWin: () => {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone({ freq: f, dur: 0.18, type: "triangle", gain: 0.3, start: i * 0.1 }));
    noiseBurst({ dur: 0.4, gain: 0.06, start: 0.1, hp: 2000 });
  },
  lose: () => tone({ freq: 200, dur: 0.25, type: "sawtooth", gain: 0.18, glideTo: 90 }),
  coin: () => { tone({ freq: 1200, dur: 0.12, type: "sine", gain: 0.28 }); tone({ freq: 1750, dur: 0.1, type: "sine", gain: 0.18, start: 0.02 }); },
  scatter: () => {
    tone({ freq: 300, dur: 0.7, type: "sawtooth", gain: 0.22, glideTo: 1400 });
    noiseBurst({ dur: 0.7, gain: 0.07, hp: 900 });
  },
  freeSpinTick: (level = 0) => tone({ freq: 500 + level * 60, dur: 0.06, type: "square", gain: 0.18 }),
};
