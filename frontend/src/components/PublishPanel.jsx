import React, { useState } from "react";
import { fmt } from "@/data/gameMeta";

export default function PublishPanel({ upgrades = 21, flagships = 10 }) {
  const [publishing, setPublishing] = useState(false);

  const estimateCredits = () => {
    // simple estimation: each upgrade costs 5 credits, each flagship 50 credits
    return upgrades * 5 + flagships * 50 + 200; // + base overhead
  };

  const handlePublish = () => {
    const credits = estimateCredits();
    if (
      !window.confirm(
        `Publish all changes? Estimated credit cost: ${credits} credits.`,
      )
    )
      return;
    setPublishing(true);
    setTimeout(() => {
      setPublishing(false);
      window.alert(
        `Publish complete (demo). ${credits} credits estimated consumed. Please perform real deploy via CI/CD.`,
      );
    }, 1200);
  };

  return (
    <div className="publish-root hud p-4 mt-6">
      <div className="font-mono text-sm">
        Publish all prepared assets and packages
      </div>
      <div className="font-mono text-xs text-muted-foreground">
        Estimated credits: <strong>{fmt(estimateCredits())}</strong>
      </div>
      <div className="mt-3">
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="btn-primary"
        >
          {publishing ? "Publishing…" : "Publish All (demo)"}
        </button>
      </div>
    </div>
  );
}
