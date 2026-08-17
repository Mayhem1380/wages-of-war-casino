import React, { useEffect, useRef } from "react";

export default function SharkBite() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let t = 0;
    const interval = setInterval(
      () => {
        // trigger bite animation by toggling class
        el.classList.remove("shark-bite");
        // force reflow
        // eslint-disable-next-line no-unused-expressions
        el.offsetWidth;
        el.classList.add("shark-bite");
        t += 1;
      },
      4600 + Math.floor(Math.random() * 3000),
    );
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      aria-hidden
      className="absolute left-6 bottom-4 pointer-events-none z-[2] w-64 h-40 overflow-visible"
      ref={ref}
    >
      <svg viewBox="0 0 320 200" className="w-full h-full shark-svg">
        <defs>
          <linearGradient id="sgrad" x1="0" x2="1">
            <stop offset="0%" stopColor="#0b2a2a" stopOpacity="1" />
            <stop offset="100%" stopColor="#07201d" stopOpacity="1" />
          </linearGradient>
        </defs>
        <g className="shark-group" transform="translate(0,30)">
          <path
            className="shark-body"
            d="M10 120 C60 30, 260 30, 310 110 C260 130, 120 150, 10 120 Z"
            fill="url(#sgrad)"
          />
          <g className="shark-mouth" transform="translate(240,86)">
            <ellipse cx="0" cy="0" rx="28" ry="18" fill="#031" />
            <path
              d="M-22 -6 L0 12 L22 -6 L0 2 Z"
              fill="#fff"
              className="shark-teeth"
            />
          </g>
        </g>
      </svg>

      {/* bubbles container */}
      <div className="absolute left-[68%] bottom-[38%] w-0 h-0 bubbles">
        <span className="bubble" />
        <span className="bubble delay" />
        <span className="bubble delay2" />
      </div>

      <style>{`
        .shark-svg { overflow: visible; }
        .shark-group { transform-origin: 20% 60%; transition: transform 0.6s ease-in-out; }
        .shark-body { filter: drop-shadow(0 8px 12px rgba(0,0,0,0.6)); }
        .shark-mouth { transform-origin: center; transition: transform 0.25s ease-in-out; }
        .shark-teeth { transform-origin: center; transition: transform 0.25s ease-in-out; }

        /* bite animation */
        .shark-bite .shark-group { transform: translateY(-28px) rotate(-6deg); }
        .shark-bite .shark-mouth { transform: translateY(-10px) scaleY(1.3); }
        .shark-bite .shark-teeth { transform: translateY(-6px) scaleY(1.25); }

        /* bubbles */
        .bubbles { pointer-events: none; }
        .bubble { display: block; width: 10px; height: 10px; border-radius: 999px; background: rgba(180,230,255,0.7); box-shadow: 0 0 8px rgba(120,200,255,0.25); position: absolute; left: 0; bottom: 0; animation: rise 3.6s linear infinite; }
        .bubble.delay { left: -8px; width: 8px; height: 8px; animation-delay: 0.6s; }
        .bubble.delay2 { left: 6px; width: 12px; height: 12px; animation-delay: 1.2s; }

        @keyframes rise {
          0% { transform: translateY(0) scale(0.6); opacity: 0.0; }
          12% { opacity: 0.8; }
          100% { transform: translateY(-120px) scale(1.1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
