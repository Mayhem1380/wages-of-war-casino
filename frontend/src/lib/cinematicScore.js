import { useEffect, useRef, useState } from "react";

// Original royalty-free war-drama score, synthesised live via Web Audio API —
// a slow minor-key string-pad swell in the Adagio-for-Strings mould (the
// "Platoon" sound). No files, no copyright, no voice-over.
export function useCinematicScore() {
  const ref = useRef(null);
  const [on, setOn] = useState(false);

  const stop = () => {
    const a = ref.current;
    if (!a) return;
    try {
      a.master.gain.cancelScheduledValues(a.ctx.currentTime);
      a.master.gain.linearRampToValueAtTime(0.0001, a.ctx.currentTime + 0.8);
      clearInterval(a.chordTimer);
      setTimeout(() => {
        a.oscs.forEach((o) => o.stop());
        a.ctx.close();
      }, 1000);
    } catch (e) {}
    ref.current = null;
    setOn(false);
  };

  const start = () => {
    if (ref.current) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 0.0001;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 850;
    filter.Q.value = 0.6;
    master.connect(filter);
    filter.connect(ctx.destination);

    // Am → F → C → G-ish solemn cycle (Hz)
    const chords = [
      [110.0, 130.81, 164.81, 220.0], // A minor
      [87.31, 130.81, 174.61, 220.0], // F major
      [130.81, 164.81, 196.0, 261.63], // C major
      [98.0, 123.47, 146.83, 196.0], // G major
    ];
    const oscs = chords[0].map((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? "triangle" : "sine";
      o.frequency.value = f;
      o.detune.value = (i - 1.5) * 4;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.5 : 0.32;
      o.connect(g);
      g.connect(master);
      o.start();
      return o;
    });

    // slow breathing swell
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.035;
    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);
    lfo.start();

    master.gain.linearRampToValueAtTime(0.075, ctx.currentTime + 3);

    let ci = 0;
    const chordTimer = setInterval(() => {
      ci = (ci + 1) % chords.length;
      const t = ctx.currentTime;
      oscs.forEach((o, i) =>
        o.frequency.exponentialRampToValueAtTime(chords[ci][i], t + 3.5),
      );
    }, 7000);

    ref.current = { ctx, master, oscs, chordTimer };
    setOn(true);
  };

  useEffect(() => () => stop(), []);
  return { on, toggle: () => (ref.current ? stop() : start()) };
}
