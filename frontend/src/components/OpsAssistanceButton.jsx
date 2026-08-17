import React from "react";

export default function OpsAssistanceButton({ onClick = () => {} }) {
  return (
    <div className="ops-assist-root">
      <button
        className="ops-btn"
        onClick={onClick}
        aria-label="Operations Assistance"
      >
        <svg
          viewBox="0 0 64 64"
          className="ops-icon"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-hidden
        >
          <rect
            x="6"
            y="18"
            width="52"
            height="36"
            rx="4"
            fill="#0b6"
            opacity="0.08"
          />
          <rect
            x="10"
            y="14"
            width="44"
            height="28"
            rx="3"
            fill="#0ff"
            opacity="0.06"
          />
          <path d="M22 30h20v8H22z" fill="#0b6" opacity="0.12" />
          <g transform="translate(16,6)">
            <rect
              x="8"
              y="8"
              width="32"
              height="24"
              rx="3"
              fill="#0b6"
              opacity="0.02"
            />
            <path
              d="M20 6c-2.2 0-4 1.8-4 4v4h-4c-2.2 0-4 1.8-4 4v6c0 2.2 1.8 4 4 4h16c2.2 0 4-1.8 4-4v-6c0-2.2-1.8-4-4-4h-4v-4c0-2.2-1.8-4-4-4z"
              fill="#081"
            />
          </g>
          <g
            className="holo-grid"
            fill="none"
            stroke="#6ff"
            strokeWidth="0.6"
            opacity="0.9"
          >
            <path d="M8 46 L56 46" />
            <path d="M8 40 L56 40" />
            <path d="M8 34 L56 34" />
            <path d="M16 18 L16 54" />
            <path d="M24 18 L24 54" />
            <path d="M32 18 L32 54" />
            <path d="M40 18 L40 54" />
          </g>
        </svg>
        <div className="ops-label">OPS ASSIST</div>
        <div className="holo-overlay" aria-hidden>
          <div className="holo-world" />
        </div>
      </button>
    </div>
  );
}
