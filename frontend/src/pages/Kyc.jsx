import React, { useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const initialBanking = {
  account_holder: "",
  bank_name: "",
  bank_country: "AU",
  account_number: "",
  bsb_code: "",
  routing_number: "",
  iban: "",
  swift_code: "",
  address_line1: "",
};

export default function KycPage() {
  const [front, setFront] = useState(null);
  const [back, setBack] = useState(null);
  const [banking, setBanking] = useState(initialBanking);
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
    try {
      await api.post("/kyc/banking", banking);
      toast.success("Banking details saved and matched to KYC profile.");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Banking details validation failed");
    }
    setBusy(false);
  };

  const handleBankingChange = (e) => {
    const { name, value } = e.target;
    setBanking((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-12">
      <p className="font-mono text-xs tracking-[0.4em] text-nvg/70">
        // ID + PAYOUT VERIFICATION
      </p>
      <h1 className="font-display text-4xl mt-2">Verification</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Upload a government ID and add the exact payout details to match your verified identity before withdrawals are approved.
      </p>

      <div className="mt-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="font-mono text-xs">ID Front</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFront(e.target.files[0])}
              className="mt-2 block w-full text-sm"
            />
          </div>
          <div>
            <label className="font-mono text-xs">ID Back (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setBack(e.target.files[0])}
              className="mt-2 block w-full text-sm"
            />
          </div>
        </div>

        <div className="rounded border border-gold/30 bg-gold/5 p-4 space-y-4">
          <p className="font-stencil text-xs tracking-[0.3em] text-gold uppercase">Banking details</p>
          <div className="grid md:grid-cols-2 gap-4">
            <input name="account_holder" value={banking.account_holder} onChange={handleBankingChange} placeholder="Account holder name" className="bg-black/50 border border-border px-3 py-2 text-sm" />
            <input name="bank_name" value={banking.bank_name} onChange={handleBankingChange} placeholder="Bank / institution name" className="bg-black/50 border border-border px-3 py-2 text-sm" />
            <input name="bank_country" value={banking.bank_country} onChange={handleBankingChange} placeholder="Country code (AU/US/GB)" className="bg-black/50 border border-border px-3 py-2 text-sm" />
            <input name="account_number" value={banking.account_number} onChange={handleBankingChange} placeholder="Account number" className="bg-black/50 border border-border px-3 py-2 text-sm" />
            <input name="bsb_code" value={banking.bsb_code} onChange={handleBankingChange} placeholder="BSB code (AU)" className="bg-black/50 border border-border px-3 py-2 text-sm" />
            <input name="routing_number" value={banking.routing_number} onChange={handleBankingChange} placeholder="Routing number (US)" className="bg-black/50 border border-border px-3 py-2 text-sm" />
            <input name="iban" value={banking.iban} onChange={handleBankingChange} placeholder="IBAN" className="bg-black/50 border border-border px-3 py-2 text-sm md:col-span-2" />
            <input name="swift_code" value={banking.swift_code} onChange={handleBankingChange} placeholder="SWIFT / BIC" className="bg-black/50 border border-border px-3 py-2 text-sm" />
            <input name="address_line1" value={banking.address_line1} onChange={handleBankingChange} placeholder="Banking address line 1" className="bg-black/50 border border-border px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <Button
            onClick={submit}
            disabled={busy}
            className="bg-gold text-black"
          >
            {busy ? "Submitting..." : "Submit Verification & Banking Details"}
          </Button>
        </div>
      </div>
    </div>
  );
}
