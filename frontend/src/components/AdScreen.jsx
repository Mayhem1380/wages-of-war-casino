import React from "react";

export default function AdScreen() {
  return (
    <div className="ad-screen-root">
      <div className="ad-main">
        <div className="ad-video-placeholder">HOLOGRAPHIC MAP</div>
      </div>
      <div className="ad-side">
        <div className="ad-brand">Nexus Studio Master</div>
        <div className="ad-copy">
          Global Fleet Gaming Sales — Custom packages available.
        </div>
        <div className="ad-pricing">
          <div className="price">Starter • $499/mo</div>
          <div className="price">Pro • $1,299/mo</div>
          <div className="price">Enterprise • Contact for pricing</div>
        </div>
        <div className="ad-cta">
          <button className="btn-primary">View Packages</button>
          <button className="btn-ghost">Contact Sales</button>
        </div>
        <div className="ad-note">
          Advertising slot: second screen (compact) — plays promos and pricing.
        </div>
      </div>
    </div>
  );
}
