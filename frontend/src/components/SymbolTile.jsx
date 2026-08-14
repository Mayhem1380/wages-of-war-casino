import React from "react";
import { SYMBOL_META } from "@/data/gameMeta";

export function SymbolTile({ id, size = 44, highlighted = false, className = "" }) {
  const meta = SYMBOL_META[id] || { text: "?", color: "#888" };
  const Icon = meta.Icon;
  return (
    <div
      className={`relative flex items-center justify-center transition-transform duration-200 ${highlighted ? "scale-105" : ""} ${className}`}
      style={{
        filter: highlighted ? `drop-shadow(0 0 12px ${meta.color})` : "none",
      }}
    >
      {meta.img ? (
        <img
          src={meta.img}
          alt={id}
          draggable={false}
          style={{
            width: size * 1.15,
            height: size * 1.15,
            objectFit: "contain",
            filter: highlighted ? `drop-shadow(0 0 14px ${meta.color})` : "drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
          }}
        />
      ) : meta.text ? (
        <span
          className="font-display leading-none"
          style={{ fontSize: size, color: meta.color, textShadow: highlighted ? `0 0 14px ${meta.color}` : "none" }}
        >
          {meta.text}
        </span>
      ) : (
        <Icon size={size} weight="fill" color={meta.color} />
      )}
      {meta.label && !meta.img && (
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
