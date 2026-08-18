import React from "react";

/**
 * Gentle motion layered ON TOP of the static underwater footer photo
 * (image itself is never replaced):
 *  - live bubble stream rising from the diver's regulator (left side)
 *  - a subtle predatory "lunge" glow over the great white (right side)
 *    that periodically surges toward the centre emblem, then recedes.
 */
export default function SharkBite() {
  const diverBubbles = Array.from({ length: 9 });

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-[2] pointer-events-none overflow-hidden"
    >
      {/* Diver regulator bubble stream (left) */}
      {diverBubbles.map((_, i) => (
        <span
          key={i}
          className="wow-diver-bubble"
          style={{
            left: `${11 + (i % 3) * 1.1}%`,
            bottom: `52%`,
            width: `${5 + (i % 4) * 3}px`,
            height: `${5 + (i % 4) * 3}px`,
            animationDelay: `${i * 0.55}s`,
            animationDuration: `${4.5 + (i % 4) * 0.9}s`,
          }}
        />
      ))}

      {/* Shark lunge glow (right, surging toward centre emblem) */}
      <span className="wow-shark-glow" />

      <style>{`
        .wow-diver-bubble {
          position: absolute;
          border-radius: 9999px;
          background: radial-gradient(circle at 35% 30%, rgba(220,245,255,0.9), rgba(120,200,255,0.35));
          box-shadow: 0 0 8px rgba(120,200,255,0.55);
          opacity: 0;
          animation-name: wowDiverRise;
          animation-timing-function: ease-in;
          animation-iteration-count: infinite;
          will-change: transform, opacity;
        }
        @keyframes wowDiverRise {
          0%   { transform: translate(0, 0) scale(0.6); opacity: 0; }
          10%  { opacity: 0.75; }
          40%  { transform: translate(10px, -90px) scale(0.9); }
          70%  { transform: translate(-6px, -180px) scale(1.05); opacity: 0.6; }
          100% { transform: translate(8px, -300px) scale(1.2); opacity: 0; }
        }

        .wow-shark-glow {
          position: absolute;
          right: 16%;
          top: 40%;
          width: 260px;
          height: 200px;
          transform: translate(50%, -50%) scale(1);
          border-radius: 9999px;
          background: radial-gradient(ellipse at center, rgba(120,205,255,0.28), rgba(90,170,230,0.10) 45%, rgba(0,0,0,0) 70%);
          filter: blur(2px);
          opacity: 0.18;
          animation: wowSharkLunge 7.5s ease-in-out infinite;
          will-change: transform, opacity;
        }
        @keyframes wowSharkLunge {
          0%, 62%   { transform: translate(50%, -50%) scale(1); opacity: 0.14; }
          74%       { transform: translate(20%, -50%) scale(1.25); opacity: 0.4; }
          80%       { transform: translate(14%, -50%) scale(1.3); opacity: 0.46; }
          90%       { transform: translate(40%, -50%) scale(1.08); opacity: 0.22; }
          100%      { transform: translate(50%, -50%) scale(1); opacity: 0.14; }
        }
      `}</style>
    </div>
  );
}
