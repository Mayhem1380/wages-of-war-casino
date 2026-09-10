import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { CheckCircle, Clock, Warning, ShieldCheck } from "@phosphor-icons/react";

function StatusRow({ label, value, ok }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-2 last:border-b-0">
      <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className={`flex items-center gap-1 text-xs ${ok ? "text-nvg" : "text-gold"}`}>
        {ok ? <CheckCircle size={14} weight="fill" /> : <Warning size={14} weight="fill" />}
        {value}
      </span>
    </div>
  );
}

export default function QualityControlPanel() {
  const [slots, setSlots] = useState([]);
  const [media, setMedia] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/games/slots").then(({ data }) => setSlots(data)),
      api.get("/admin/media/george").then(({ data }) => setMedia(data)),
      api.get("/admin/operations/jobs?limit=20").then(({ data }) => setJobs(data)),
    ])
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const jobSummary = useMemo(
    () =>
      jobs.reduce(
        (summary, job) => ({
          ...summary,
          [job.status]: (summary[job.status] || 0) + 1,
        }),
        {},
      ),
    [jobs],
  );
  const activeGeorge = media?.active;
  const hasFailedJobs = (jobSummary.failed || 0) > 0;

  return (
    <section className="hud hud-gold mt-6 p-5" aria-labelledby="quality-control-title">
      <div className="flex items-center gap-3">
        <ShieldCheck size={25} weight="fill" className="text-gold" />
        <div>
          <p className="font-mono text-[10px] tracking-[0.35em] text-nvg">
            // GEORGE · QUALITY CONTROL
          </p>
          <h2 id="quality-control-title" className="font-display text-2xl tracking-wide text-foreground">
            RELEASE HEALTH
          </h2>
        </div>
      </div>
      {!loaded ? (
        <p className="mt-4 flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <Clock size={14} className="animate-spin" /> CHECKING CONTROL PLANE…
        </p>
      ) : (
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <div>
            <StatusRow label="SERVER-AUTHORITATIVE CATALOG" value={`${slots.length} machines`} ok={slots.length >= 176} />
            <StatusRow label="GEORGE MEDIA RELEASE" value={activeGeorge ? `ACTIVE ${activeGeorge.version}` : "NO ACTIVE RELEASE"} ok={Boolean(activeGeorge)} />
            <StatusRow label="OPERATIONS QUEUE" value={hasFailedJobs ? `${jobSummary.failed} FAILED` : `${jobs.length} RECENT JOBS`} ok={!hasFailedJobs} />
          </div>
          <div className="border border-border/60 bg-black/30 p-3">
            <p className="font-mono text-[10px] tracking-widest text-gold">CONTROL NOTES</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              This panel reports verified application state only. It does not
              auto-publish advertising, social media, payment providers, or
              production deployments without an approved operator workflow.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
