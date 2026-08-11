import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { fmt } from "@/data/gameMeta";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Coins, Spinner } from "@phosphor-icons/react";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [state, setState] = useState("checking"); // checking | paid | failed
  const [credits, setCredits] = useState(0);
  const polls = useRef(0);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) { setState("failed"); return; }

    let active = true;
    const poll = async () => {
      if (!active) return;
      polls.current += 1;
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        if (data.payment_status === "paid") {
          setState("paid");
          setCredits(data.credits);
          refreshUser();
          return;
        }
        if (["failed", "expired"].includes(data.payment_status)) { setState("failed"); return; }
      } catch {}
      if (polls.current >= 12) { setState("failed"); return; }
      setTimeout(poll, 2000);
    };
    poll();
    return () => { active = false; };
  }, [refreshUser]);

  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="hud hud-gold p-10">
        {state === "checking" && (
          <>
            <Spinner size={56} className="text-nvg mx-auto animate-spin" />
            <h1 className="font-display text-4xl tracking-wide text-foreground mt-5">CONFIRMING RESUPPLY</h1>
            <p className="font-mono text-sm text-muted-foreground mt-2">// verifying secure transaction...</p>
          </>
        )}
        {state === "paid" && (
          <>
            <CheckCircle size={64} weight="fill" className="text-nvg mx-auto animate-pop" />
            <h1 className="font-display text-5xl tracking-wide gold-gradient mt-5">RESUPPLY COMPLETE</h1>
            <div className="flex items-center justify-center gap-2 mt-3">
              <Coins size={28} weight="fill" className="text-gold" />
              <span className="font-mono text-3xl text-gold">+{fmt(credits)}</span>
            </div>
            <p className="font-mono text-sm text-muted-foreground mt-2">credits deployed to your wallet</p>
            <Button onClick={() => navigate("/lobby")} className="mt-7 bg-gold hover:bg-gold/90 text-black font-display text-lg tracking-widest px-8 glow-gold">
              BACK TO OPS
            </Button>
          </>
        )}
        {state === "failed" && (
          <>
            <XCircle size={64} weight="fill" className="text-alert mx-auto" />
            <h1 className="font-display text-4xl tracking-wide text-foreground mt-5">RESUPPLY UNCONFIRMED</h1>
            <p className="font-mono text-sm text-muted-foreground mt-2">We couldn't confirm the payment. If you were charged, credits will arrive shortly.</p>
            <Button onClick={() => navigate("/wallet")} variant="outline" className="mt-7 border-nvg/40 text-nvg font-display text-lg tracking-widest px-8">
              RETURN TO WALLET
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
