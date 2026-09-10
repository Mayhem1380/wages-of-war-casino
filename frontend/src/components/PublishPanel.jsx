import { fmt } from "@/data/gameMeta";

export default function PublishPanel({ upgrades = 21, flagships = 10 }) {
  const estimateCredits = () => {
    return upgrades * 5 + flagships * 50 + 200; // + base overhead
  };

  return (
    <div className="publish-root hud p-4 mt-6 border-gold/30">
      <div className="font-mono text-sm text-gold">RELEASE GATE — CI/CD CONTROLLED</div>
      <div className="font-mono text-xs text-muted-foreground">
        Prepared package estimate: <strong>{fmt(estimateCredits())}</strong>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        George can review readiness here, but this console never claims a
        deployment completed. Publish only through the approved CI/CD workflow
        after asset, legal, payment, and rollback checks pass.
      </p>
    </div>
  );
}
