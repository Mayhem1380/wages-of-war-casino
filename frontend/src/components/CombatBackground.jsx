import React, { useRef, useEffect } from "react";

export default function CombatBackground() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w = 0;
    let h = 0;
    const DPR = Math.max(1, window.devicePixelRatio || 1);

    function resize() {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    const bullets = [];
    let raf = null;

    function spawnBullet() {
      const y = 80 + Math.random() * (h - 160);
      bullets.push({ x: w + 20, y, vx: -600 - Math.random() * 600, life: 0 });
    }

    function step(ms) {
      ctx.clearRect(0, 0, w, h);

      // subtle ambient vignette
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "rgba(0,0,0,0.2)");
      g.addColorStop(1, "rgba(0,0,0,0.6)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // flashing distant tracer bursts
      if (Math.random() < 0.02) {
        const rx = Math.random() * w;
        const ry = Math.random() * (h * 0.6);
        const rg = ctx.createRadialGradient(rx, ry, 2, rx, ry, 120);
        rg.addColorStop(0, "rgba(255,200,120,0.18)");
        rg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = rg;
        ctx.fillRect(rx - 120, ry - 120, 240, 240);
      }

      // update and draw bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        const dt = 1 / 60;
        b.x += b.vx * dt;
        b.life += dt;
        const alpha = Math.max(0, 1 - b.life * 1.6);

        if (b.x < -40 || alpha <= 0) bullets.splice(i, 1);
        else {
          // streak
          ctx.strokeStyle = `rgba(255,210,120,${alpha})`;
          ctx.lineWidth = 2;
          ctx.shadowColor = `rgba(255,160,60,${alpha * 0.8})`;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(b.x + -b.vx * 0.016, b.y);
          ctx.stroke();
          // core
          ctx.fillStyle = `rgba(255,255,200,${alpha})`;
          ctx.beginPath();
          ctx.arc(b.x, b.y, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // occasional spawn
      if (Math.random() < 0.45) spawnBullet();

      raf = requestAnimationFrame(step);
    }

    function start() {
      resize();
      window.addEventListener("resize", resize);
      raf = requestAnimationFrame(step);
    }

    start();

    return () => {
      window.removeEventListener("resize", resize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <canvas ref={ref} className="w-full h-full block" />

      {/* Top soldier silhouettes */}
      <div className="absolute left-1/2 transform -translate-x-1/2 top-6 flex gap-4 items-end opacity-90">
        <svg
          width="140"
          height="60"
          viewBox="0 0 140 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_6px_16px_rgba(0,0,0,0.7)]"
        >
          <g fill="#0b0f0c">
            <path d="M10 50 L30 50 L36 30 L28 26 L22 34 L14 34 Z" />
            <path d="M48 50 L68 50 L74 28 L66 24 L60 34 L52 34 Z" />
            <path d="M86 50 L106 50 L112 30 L104 26 L98 34 L90 34 Z" />
          </g>
        </svg>
      </div>

      {/* subtle red/green tactical lights */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none mix-blend-screen">
        <div className="absolute -left-40 top-24 w-80 h-80 rounded-full bg-red-500/6 animate-pulse-slow" />
        <div className="absolute right-6 bottom-16 w-48 h-48 rounded-full bg-green-400/6 animate-pulse-slower" />
      </div>
      <style>{`
        @keyframes pulse-slow { 0%{opacity:0.06}50%{opacity:0.18}100%{opacity:0.06} }
        @keyframes pulse-slower { 0%{opacity:0.04}50%{opacity:0.12}100%{opacity:0.04} }
        .animate-pulse-slow { animation: pulse-slow 3.6s ease-in-out infinite; }
        .animate-pulse-slower { animation: pulse-slower 6.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
