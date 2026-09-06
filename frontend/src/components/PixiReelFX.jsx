import React, { useEffect, useRef } from "react";
import { Application, Container, Graphics } from "pixi.js";

const PARTICLE_COUNT = 34;

export const PixiReelFX = React.memo(function PixiReelFX({ accent = "#F6C64A", spinning = false, winCount = 0 }) {
  const hostRef = useRef(null);
  const spinningRef = useRef(spinning);
  const winCountRef = useRef(winCount);

  useEffect(() => {
    spinningRef.current = spinning;
    winCountRef.current = winCount;
  }, [spinning, winCount]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let disposed = false;
    let app;
    let resizeObserver;

    const boot = async () => {
      app = new Application();
      await app.init({
        antialias: true,
        backgroundAlpha: 0,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      });
      if (disposed) {
        app.destroy(true, { children: true, texture: true, textureSource: true });
        return;
      }

      host.appendChild(app.canvas);
      app.canvas.setAttribute("aria-hidden", "true");
      app.canvas.style.width = "100%";
      app.canvas.style.height = "100%";
      app.canvas.style.pointerEvents = "none";

      const scene = new Container();
      const particles = [];
      const beams = new Graphics();
      scene.addChild(beams);

      for (let index = 0; index < PARTICLE_COUNT; index += 1) {
        const particle = new Graphics()
          .circle(0, 0, index % 5 === 0 ? 2 : 1)
          .fill(accent);
        particle.alpha = 0.12 + Math.random() * 0.45;
        particle.x = Math.random();
        particle.y = Math.random();
        particle.vx = (Math.random() - 0.5) * 0.0012;
        particle.vy = -0.0005 - Math.random() * 0.0015;
        particle.phase = Math.random() * Math.PI * 2;
        scene.addChild(particle);
        particles.push(particle);
      }

      app.stage.addChild(scene);

      const resize = () => {
        const width = Math.max(host.clientWidth, 1);
        const height = Math.max(host.clientHeight, 1);
        app.renderer.resize(width, height);
        beams.clear();
        beams.rect(0, 0, width, 2).fill({ color: accent, alpha: 0.22 });
        beams.rect(0, height - 2, width, 2).fill({ color: accent, alpha: 0.16 });
        for (let reel = 1; reel < 5; reel += 1) {
          const x = (width * reel) / 5;
          beams.rect(x, 0, 1, height).fill({ color: accent, alpha: 0.08 });
        }
      };

      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
      resize();

      app.ticker.add(() => {
        const width = Math.max(host.clientWidth, 1);
        const height = Math.max(host.clientHeight, 1);
        const time = performance.now() / 1000;
        particles.forEach((particle) => {
          particle.x = ((particle.x + particle.vx * (spinningRef.current ? 2.5 : 1)) % 1 + 1) % 1;
          particle.y = ((particle.y + particle.vy * (spinningRef.current ? 2.5 : 1)) % 1 + 1) % 1;
          particle.position.set(particle.x * width, particle.y * height);
          particle.alpha = (0.16 + Math.sin(time * 2 + particle.phase) * 0.12) * (spinningRef.current ? 1.5 : 1);
          particle.scale.set(winCountRef.current ? 1.6 : 1);
        });
        beams.alpha = spinningRef.current ? 1 : 0.72 + Math.sin(time * 1.4) * 0.12;
      });
    };

    boot();
    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      app?.destroy(true, { children: true, texture: true, textureSource: true });
    };
  }, [accent]);

  return <div ref={hostRef} data-testid="pixi-reel-fx" className="pointer-events-none absolute inset-0 z-10 overflow-hidden" />;
});
