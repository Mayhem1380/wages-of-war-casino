import React, { useRef, useEffect } from "react";

/**
 * Cinematic live-war-scene backdrop (logged-in only).
 * Canvas: soldier silhouettes at the top firing rifles with big muzzle
 * flashes, recoil, tracer rounds, distant artillery explosions and
 * drifting gun-smoke. Sits behind all content (z-0).
 */
export default function CombatBackground() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w = 0;
    let h = 0;
    const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    function resize() {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();

    // Squad of soldiers along the top ridge, each facing outward.
    let soldiers = [];
    function layoutSquad() {
      const cx = w / 2;
      soldiers = [
        { x: cx - 260, dir: -1 },
        { x: cx - 90, dir: -1 },
        { x: cx + 90, dir: 1 },
        { x: cx + 260, dir: 1 },
      ].map((s) => ({
        ...s,
        y: 132,
        cool: 0.4 + Math.random() * 1.6,
        flash: 0,
        recoil: 0,
      }));
    }
    layoutSquad();

    const tracers = [];
    const smoke = [];
    const explosions = [];
    let raf = null;
    let last = performance.now();

    function fire(s) {
      s.flash = 1;
      s.recoil = 1;
      const bx = s.x + s.dir * 26; // barrel tip
      const by = s.y + 6;
      // tracer round
      tracers.push({
        x: bx,
        y: by,
        vx: s.dir * (900 + Math.random() * 700),
        vy: (Math.random() - 0.5) * 60,
        life: 0,
      });
      // gun smoke puff
      smoke.push({ x: bx, y: by, r: 6, life: 0, vx: s.dir * 20 });
    }

    function drawSoldier(s) {
      const rx = -s.dir * s.recoil * 4; // recoil offset
      ctx.save();
      ctx.translate(s.x + rx, s.y);
      ctx.scale(s.dir, 1);
      ctx.fillStyle = "#05080600";
      ctx.fillStyle = "rgba(6,10,8,0.96)";
      ctx.strokeStyle = "rgba(6,10,8,0.96)";
      // body (kneeling)
      ctx.beginPath();
      ctx.moveTo(-14, 26);
      ctx.lineTo(-4, 2);
      ctx.lineTo(8, 0);
      ctx.lineTo(12, 10);
      ctx.lineTo(6, 26);
      ctx.closePath();
      ctx.fill();
      // helmet
      ctx.beginPath();
      ctx.arc(2, -4, 7, Math.PI, 0);
      ctx.rect(-5, -4, 14, 3);
      ctx.fill();
      // rifle
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(2, 4);
      ctx.lineTo(28, 6);
      ctx.stroke();
      ctx.restore();

      // muzzle flash (drawn in world space, unscaled)
      if (s.flash > 0.02) {
        const bx = s.x + s.dir * 30;
        const by = s.y + 6;
        drawMuzzle(bx, by, s.flash, s.dir);
      }
    }

    function drawMuzzle(x, y, k, dir) {
      const r = 22 + 46 * k;
      const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(0.01, r));
      g.addColorStop(0, `rgba(255,255,235,${0.95 * k})`);
      g.addColorStop(0.35, `rgba(255,198,90,${0.8 * k})`);
      g.addColorStop(1, "rgba(255,110,30,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      // star spikes
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = `rgba(255,244,210,${0.9 * k})`;
      const spikes = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
      spikes.forEach((a, i) => {
        const len = (i === 0 ? r * 1.7 : r * 0.9) * (dir < 0 ? 1 : 1);
        ctx.save();
        ctx.rotate(a + (i === 0 && dir < 0 ? Math.PI : 0));
        ctx.beginPath();
        ctx.moveTo(0, -3);
        ctx.lineTo(len, 0);
        ctx.lineTo(0, 3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
      ctx.restore();
    }

    function step(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);

      // ambient vignette / smoke haze
      const vg = ctx.createLinearGradient(0, 0, 0, h);
      vg.addColorStop(0, "rgba(0,0,0,0.34)");
      vg.addColorStop(0.4, "rgba(0,0,0,0.12)");
      vg.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);

      // distant artillery explosions
      if (Math.random() < 0.016) {
        explosions.push({
          x: Math.random() * w,
          y: 30 + Math.random() * (h * 0.45),
          r: 4,
          life: 0,
          max: 90 + Math.random() * 120,
        });
      }
      for (let i = explosions.length - 1; i >= 0; i--) {
        const e = explosions[i];
        e.life += dt;
        e.r += dt * 260;
        const k = Math.max(0, 1 - e.life * 1.3);
        if (k <= 0 || e.r > e.max) {
          explosions.splice(i, 1);
          continue;
        }
        const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, Math.max(0.01, e.r));
        g.addColorStop(0, `rgba(255,230,170,${0.22 * k})`);
        g.addColorStop(0.4, `rgba(255,140,50,${0.16 * k})`);
        g.addColorStop(1, "rgba(255,80,20,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // soldiers fire
      soldiers.forEach((s) => {
        s.cool -= dt;
        if (s.cool <= 0) {
          fire(s);
          s.cool = 0.5 + Math.random() * 2.4;
        }
        s.flash = Math.max(0, s.flash - dt * 9);
        s.recoil = Math.max(0, s.recoil - dt * 6);
      });

      // tracers
      ctx.lineCap = "round";
      for (let i = tracers.length - 1; i >= 0; i--) {
        const b = tracers[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life += dt;
        const alpha = Math.max(0, 1 - b.life * 1.1);
        if (alpha <= 0 || b.x < -60 || b.x > w + 60) {
          tracers.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = `rgba(255,210,120,${alpha})`;
        ctx.lineWidth = 2.2;
        ctx.shadowColor = `rgba(255,150,50,${alpha})`;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - Math.sign(b.vx) * 34, b.y - b.vy * 0.02);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(255,255,210,${alpha})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // gun smoke
      for (let i = smoke.length - 1; i >= 0; i--) {
        const p = smoke[i];
        p.life += dt;
        p.r += dt * 26;
        p.x += p.vx * dt;
        const a = Math.max(0, 0.16 - p.life * 0.12);
        if (a <= 0) {
          smoke.splice(i, 1);
          continue;
        }
        ctx.fillStyle = `rgba(180,180,170,${a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y - p.life * 12, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      soldiers.forEach(drawSoldier);

      raf = requestAnimationFrame(step);
    }

    function onResize() {
      resize();
      layoutSquad();
    }
    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(step);

    return () => {
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <canvas ref={ref} className="w-full h-full block" />
      {/* tactical mood lights */}
      <div className="absolute inset-0 pointer-events-none mix-blend-screen">
        <div className="absolute -left-40 top-20 w-96 h-96 rounded-full bg-red-500/5 animate-pulse-slow" />
        <div className="absolute right-4 top-40 w-72 h-72 rounded-full bg-amber-400/5 animate-pulse-slower" />
      </div>
      <style>{`
        @keyframes pulse-slow { 0%{opacity:0.05}50%{opacity:0.16}100%{opacity:0.05} }
        @keyframes pulse-slower { 0%{opacity:0.04}50%{opacity:0.12}100%{opacity:0.04} }
        .animate-pulse-slow { animation: pulse-slow 3.6s ease-in-out infinite; }
        .animate-pulse-slower { animation: pulse-slower 6.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
