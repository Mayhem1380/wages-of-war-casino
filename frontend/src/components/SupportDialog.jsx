import React, { useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Headset, PaperPlaneRight } from "@phosphor-icons/react";

export function SupportDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    subject: "",
    message: "",
  });

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please fill in your name, email and message.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/support/ticket", {
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
      });
      toast.success("Message sent to management — we'll be in touch.");
      setForm((f) => ({ ...f, subject: "", message: "" }));
      setOpen(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not send. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          data-testid="footer-contact-management"
          className="group flex items-center gap-3 border border-nvg/40 bg-nvg/5 hover:bg-nvg/10 hover:border-nvg/70 transition-colors px-4 py-3 text-left w-full"
        >
          <Headset size={26} weight="fill" className="text-nvg shrink-0" />
          <div className="leading-tight">
            <div className="font-stencil tracking-widest uppercase text-sm text-foreground">
              Contact Management
            </div>
            <div className="font-mono text-[11px] text-muted-foreground">
              If the auto-reply can&apos;t sort your issue, speak to us live.
            </div>
          </div>
        </button>
      </DialogTrigger>
      <DialogContent
        data-testid="support-dialog"
        className="bg-[#0a0d0a] border-nvg/40"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide nvg-text flex items-center gap-2">
            <Headset size={24} weight="fill" /> CONTACT MANAGEMENT
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          Couldn&apos;t get your problem solved? Send it straight to HQ and a
          human will get back to you.
        </p>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="font-mono text-xs">Name</Label>
              <Input
                data-testid="support-name"
                value={form.name}
                onChange={upd("name")}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1">
              <Label className="font-mono text-xs">Email</Label>
              <Input
                data-testid="support-email"
                value={form.email}
                onChange={upd("email")}
                placeholder="you@email.com"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="font-mono text-xs">Subject</Label>
            <Input
              data-testid="support-subject"
              value={form.subject}
              onChange={upd("subject")}
              placeholder="What's it about?"
            />
          </div>
          <div className="space-y-1">
            <Label className="font-mono text-xs">Message</Label>
            <Textarea
              data-testid="support-message"
              value={form.message}
              onChange={upd("message")}
              placeholder="Describe your issue…"
              rows={4}
            />
          </div>
          <Button
            data-testid="support-submit"
            onClick={submit}
            disabled={busy}
            className="w-full bg-nvg hover:bg-nvg/90 text-black font-display text-lg tracking-widest gap-2"
          >
            <PaperPlaneRight size={18} weight="fill" />
            {busy ? "SENDING…" : "SEND TO HQ"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SupportDialog;
