import React from "react";
import { SYMBOL_META } from "@/data/gameMeta";

export function SymbolTile({
  id,
  size = 44,
  highlighted = false,
  className = "",
}) {
  const meta = SYMBOL_META[id] || { text: "?", color: "#888" };
  const Icon = meta.Icon || (() => null);

  // Painted AAA artwork symbols — render the image as-is.
  if (meta.img) {
    return (
      <div
        className={`relative flex items-center justify-center transition-transform duration-200 ${highlighted ? "scale-105" : ""} ${className}`}
      >
        <img
          src={meta.img}
          alt={id}
          draggable={false}
          style={{
            width: size * 1.15,
            height: size * 1.15,
            objectFit: "contain",
            filter: highlighted
              ? `drop-shadow(0 0 14px ${meta.color})`
              : "drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
          }}
        />
      </div>
    );
  }

  // Icon / card-rank symbols get a premium metallic medallion so the reels
  // read as high-definition AAA gems rather than flat vector icons.
  const plate = Math.round(size * 1.46);
  return (
    <div
      className={`relative flex items-center justify-center transition-transform duration-200 ${highlighted ? "scale-110" : ""} ${className}`}
    >
      <div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: plate,
          height: plate,
          background: `radial-gradient(circle at 34% 26%, ${meta.color}40 0%, rgba(24,24,27,0.94) 48%, rgba(6,6,9,0.98) 100%)`,
          border: `1.5px solid ${meta.color}`,
          boxShadow: highlighted
            ? `0 0 20px ${meta.color}, 0 0 6px ${meta.color}, inset 0 1px 3px rgba(255,255,255,0.4), inset 0 -7px 14px rgba(0,0,0,0.75)`
            : `0 2px 7px rgba(0,0,0,0.65), inset 0 1px 3px rgba(255,255,255,0.28), inset 0 -7px 14px rgba(0,0,0,0.65)`,
        }}
      >
        {/* glossy top highlight for a beveled, enamelled finish */}
        <span
          aria-hidden="true"
          className="absolute rounded-full pointer-events-none"
          style={{
            left: "12%",
            right: "12%",
            top: "8%",
            height: "34%",
            background:
              "linear-gradient(rgba(255,255,255,0.32), rgba(255,255,255,0))",
          }}
        />
        {meta.text ? (
          <span
            className="font-display leading-none relative"
            style={{
              fontSize: size * 0.86,
              color: meta.color,
              textShadow: `0 1px 2px #000, 0 0 10px ${meta.color}`,
            }}
          >
            {meta.text}
          </span>
        ) : (
          <span
            className="relative flex items-center justify-center"
            style={{
              filter: highlighted
                ? `drop-shadow(0 1px 2px rgba(0,0,0,0.9)) drop-shadow(0 0 11px ${meta.color})`
                : `drop-shadow(0 1px 2px rgba(0,0,0,0.9)) drop-shadow(0 0 5px ${meta.color}aa)`,
            }}
          >
            <Icon size={size} weight="fill" color={meta.color} />
          </span>
        )}
      </div>
      {meta.label && (
        <span
          className="absolute -bottom-1 font-mono text-[8px] tracking-widest px-1"
          style={{ color: meta.color }}
        >
          {meta.label}
        </span>
      )}
    </div>
  );
}
