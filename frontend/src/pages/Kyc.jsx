import React, { useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function KycPage() {
  const [front, setFront] = useState(null);
  const [back, setBack] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!front) return toast.error("Attach ID front");
    setBusy(true);
    const fd = new FormData();
    fd.append("front", front);
    if (back) fd.append("back", back);
    try {
      const res = await fetch("/api/kyc/submit", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const d = await res.json();
      if (d.ok) {
        toast.success("KYC submitted — pending review");
      } else toast.error("Submission failed");
    } catch (e) {
      toast.error("Submission failed");
    }
    setBusy(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-8 py-12">
      <p className="font-mono text-xs tracking-[0.4em] text-nvg/70">
        // ID VERIFICATION
      </p>
      <h1 className="font-display text-4xl mt-2">Verification</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Upload a government ID to verify your account for withdrawals.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="font-mono text-xs">ID Front</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFront(e.target.files[0])}
            className="mt-2"
          />
        </div>
        <div>
          <label className="font-mono text-xs">ID Back (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setBack(e.target.files[0])}
            className="mt-2"
          />
        </div>
        <div>
          <Button
            onClick={submit}
            disabled={busy}
            className="bg-gold text-black"
          >
            {busy ? "Submitting..." : "Submit Verification"}
          </Button>
        </div>
      </div>
    </div>
  );
}
