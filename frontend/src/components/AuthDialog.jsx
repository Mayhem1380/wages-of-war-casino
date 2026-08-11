import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { AUTHD } from "@/constants/testIds";
import { GoogleLogo, Fingerprint } from "@phosphor-icons/react";
import { toast } from "sonner";

export function AuthDialog() {
  const { authOpen, setAuthOpen, authMode, setAuthMode, login, register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isRegister = authMode === "register";

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = isRegister
      ? await register(name, email, password)
      : await login(email, password);
    setBusy(false);
    if (res.ok) {
      setAuthOpen(false);
      setPassword("");
      toast.success(isRegister ? "Enlisted. Welcome, operative." : "Access granted.");
    } else {
      setError(res.error);
    }
  };

  const google = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/lobby";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <Dialog open={authOpen} onOpenChange={setAuthOpen}>
      <DialogContent data-testid={AUTHD.dialog} className="hud hud-gold border-gold/40 bg-[#0a0d0a] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl tracking-wide gold-gradient">
            {isRegister ? "ENLIST FOR DUTY" : "OPERATIVE ACCESS"}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-nvg/70 tracking-widest">
            {isRegister ? "// NEW RECRUIT REGISTRATION" : "// SECURE LOGIN CHANNEL"}
          </DialogDescription>
        </DialogHeader>

        <Button
          data-testid={AUTHD.google}
          onClick={google}
          variant="outline"
          className="w-full border-nvg/30 bg-black/40 hover:bg-nvg/10 hover:border-nvg/60 text-foreground gap-2"
        >
          <GoogleLogo size={18} weight="bold" /> Continue with Google
        </Button>

        <div className="flex items-center gap-3 my-1">
          <div className="h-px flex-1 bg-border" />
          <span className="font-mono text-[10px] text-muted-foreground tracking-widest">OR CREDENTIALS</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {isRegister && (
            <Input
              data-testid={AUTHD.name}
              placeholder="Codename"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-black/40 border-border font-mono"
            />
          )}
          <Input
            data-testid={AUTHD.email}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-black/40 border-border font-mono"
          />
          <Input
            data-testid={AUTHD.password}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-black/40 border-border font-mono"
          />
          {error && (
            <p data-testid={AUTHD.error} className="text-alert text-sm font-mono">{error}</p>
          )}
          <Button
            data-testid={AUTHD.submit}
            type="submit"
            disabled={busy}
            className="w-full bg-gold hover:bg-gold/90 text-black font-display text-lg tracking-widest gap-2 glow-gold"
          >
            <Fingerprint size={18} weight="bold" />
            {busy ? "PROCESSING..." : isRegister ? "DEPLOY" : "AUTHENTICATE"}
          </Button>
        </form>

        <button
          data-testid={AUTHD.toggle}
          onClick={() => { setError(""); setAuthMode(isRegister ? "login" : "register"); }}
          className="text-center w-full text-sm text-nvg/70 hover:text-nvg font-mono transition-colors"
        >
          {isRegister ? "Already enlisted? Sign in" : "New recruit? Enlist now →"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
