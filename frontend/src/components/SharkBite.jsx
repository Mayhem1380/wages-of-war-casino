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

      <span className="wow-war-flash" />
      <span className="wow-war-pulse" />
      <span className="wow-shark-glow" />
      <span className="wow-shark-silhouette">
        <span className="wow-shark-eye" />
      </span>

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

        .wow-war-flash {
          position: absolute;
          left: 50%;
          top: 58%;
          width: 420px;
          height: 180px;
          transform: translate(-50%, -50%);
          border-radius: 9999px;
          background: radial-gradient(ellipse at center, rgba(255, 76, 54, 0.28), rgba(255, 135, 35, 0.08) 38%, rgba(0,0,0,0) 72%);
          filter: blur(4px);
          animation: wowWarFlash 7.5s ease-in-out infinite;
        }

        .wow-war-pulse {
          position: absolute;
          right: 18%;
          top: 42%;
          width: 260px;
          height: 180px;
          border-radius: 50%;
          background: radial-gradient(circle at center, rgba(109, 233, 255, 0.3), rgba(86, 186, 255, 0.06) 45%, rgba(0,0,0,0) 72%);
          filter: blur(3px);
          animation: wowPulse 6s ease-in-out infinite;
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

        .wow-shark-silhouette {
          position: absolute;
          right: 11%;
          bottom: 5%;
          width: 300px;
          height: 120px;
          border-radius: 56% 44% 52% 48% / 60% 48% 52% 40%;
          background: linear-gradient(180deg, rgba(10,18,25,0.74), rgba(3,6,12,0.9));
          box-shadow: inset 8px 0 22px rgba(120,200,255,0.1), inset -10px 0 18px rgba(0,0,0,0.4), 0 0 18px rgba(90,170,230,0.1);
          transform: skewX(-8deg);
          opacity: 0.84;
          animation: wowSharkFloat 8.5s ease-in-out infinite;
        }
        .wow-shark-silhouette::before {
          content: "";
          position: absolute;
          left: 18%;
          top: 28%;
          width: 56%;
          height: 48%;
          border-radius: 55% 45% 60% 40% / 60% 40% 60% 40%;
          background: linear-gradient(90deg, rgba(154, 211, 255, 0.18), rgba(8, 15, 20, 0.18));
          transform: rotate(-10deg);
        }
        .wow-shark-silhouette::after {
          content: "";
          position: absolute;
          left: 62%;
          top: 10%;
          width: 34%;
          height: 28%;
          border-radius: 50% 40% 60% 40%;
          background: rgba(6, 10, 12, 0.82);
          transform: rotate(-26deg);
          clip-path: polygon(0 100%, 100% 50%, 100% 100%);
        }
        .wow-shark-eye {
          position: absolute;
          left: 54%;
          top: 46%;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255,255,255,0.9);
          box-shadow: 0 0 12px rgba(255,255,255,0.7);
        }

        @keyframes wowSharkLunge {
          0%, 62%   { transform: translate(50%, -50%) scale(1); opacity: 0.14; }
          74%       { transform: translate(20%, -50%) scale(1.25); opacity: 0.42; }
          80%       { transform: translate(14%, -50%) scale(1.3); opacity: 0.48; }
          90%       { transform: translate(40%, -50%) scale(1.08); opacity: 0.22; }
          100%      { transform: translate(50%, -50%) scale(1); opacity: 0.14; }
        }
        @keyframes wowSharkFloat {
          0%, 100% { transform: translateY(0) skewX(-8deg); }
          50% { transform: translateY(-10px) skewX(-8deg); }
        }
        @keyframes wowPulse {
          0%, 100% { transform: scale(0.96); opacity: 0.12; }
          35% { transform: scale(1.18); opacity: 0.38; }
          60% { transform: scale(1.06); opacity: 0.2; }
        }
        @keyframes wowWarFlash {
          0%, 70%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.92); }
          76% { opacity: 0.9; }
          80% { opacity: 0.55; transform: translate(-50%, -50%) scale(1.08); }
          88% { opacity: 0.12; }
        }
      `}</style>
    </div>
  );
}
