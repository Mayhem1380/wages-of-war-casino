import React, { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { BrandLogo } from "@/components/BrandLogo";

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const hash = location.hash || window.location.hash;
    const sessionId = new URLSearchParams(hash.replace("#", "")).get("session_id");
    if (!sessionId) { navigate("/"); return; }
    (async () => {
      try {
        const { data } = await api.post("/auth/session", { session_id: sessionId });
        setUser(data.user);
        window.history.replaceState(null, "", window.location.pathname);
        navigate("/lobby", { replace: true });
      } catch {
        navigate("/", { replace: true });
      }
    })();
  }, [location, navigate, setUser]);

  return (
    <div className="tactical-bg scanlines min-h-screen flex flex-col items-center justify-center gap-6">
      <BrandLogo size={64} />
      <p className="font-mono text-nvg/80 tracking-widest animate-flicker">// AUTHENTICATING OPERATIVE...</p>
    </div>
  );
}
