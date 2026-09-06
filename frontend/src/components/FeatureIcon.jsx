import React, { useState } from "react";

// Renders a real image when `img` is provided and loads; falls back to the
// vector `icon` (phosphor component) if no image is set or it fails to load.
export function FeatureIcon({ img, icon: Icon, alt = "", size = 32, className = "", imgClassName = "" }) {
  const [failed, setFailed] = useState(false);

  if (img && !failed) {
    return (
      <img
        src={img}
        alt={alt}
        onError={() => setFailed(true)}
        className={imgClassName || className}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    );
  }
  return Icon ? <Icon size={size} weight="fill" className={className} /> : null;
}
