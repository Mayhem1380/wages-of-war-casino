import React, { useMemo } from "react";

/**
 * Deterministic pseudo-random generator (mulberry32) so the mosaic pattern is
 * stable across re-renders instead of reshuffling on every parent update.
 */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Interactive mosaic backdrop: a dense grid of tiles that each sample a
 * different fragment of the war-room map background (via shifted
 * background-position on the same image) so the tile artwork blends
 * seamlessly into the theme instead of looking like a separate layer.
 */
export function KenoMosaicTiles({ count = 480, cols = 40, image = "/slots/keno_bg.jpg" }) {
  const rows = Math.ceil(count / cols);
  const tiles = useMemo(() => {
    const rand = mulberry32(count * 31 + cols);
    return Array.from({ length: count }, (_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const posX = cols > 1 ? (col / (cols - 1)) * 100 : 0;
      const posY = rows > 1 ? (row / (rows - 1)) * 100 : 0;
      const hue = Math.floor(rand() * 30) - 15;
      const brightness = 0.85 + rand() * 0.5;
      const baseOpacity = (0.08 + rand() * 0.16).toFixed(2);
      const delay = (rand() * 6).toFixed(2);
      const duration = (4 + rand() * 3).toFixed(2);
      return { i, posX, posY, hue, brightness, baseOpacity, delay, duration };
    });
  }, [count, cols, rows]);

  return (
    <div
      className="keno-mosaic"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      aria-hidden="true"
      data-testid="keno-mosaic"
    >
      {tiles.map((t) => (
        <span
          key={t.i}
          className="keno-mosaic-tile"
          style={{
            backgroundImage: `url(${image})`,
            backgroundPosition: `${t.posX}% ${t.posY}%`,
            filter: `hue-rotate(${t.hue}deg) brightness(${t.brightness})`,
            "--tile-op": t.baseOpacity,
            animationDelay: `${t.delay}s`,
            animationDuration: `${t.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
