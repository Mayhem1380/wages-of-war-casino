import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import api, { apiError } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = anon, object = user
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [rankUp, setRankUp] = useState(null);
  const lastRankRef = useRef(null);

  const applyUser = useCallback((data, { announce = true } = {}) => {
    if (data && data.vip_rank != null) {
      if (announce && lastRankRef.current != null && data.vip_rank > lastRankRef.current) {
        setRankUp({ tier: data.vip_tier, rank: data.vip_rank, cashback: data.vip_cashback });
      }
      lastRankRef.current = data.vip_rank;
    }
    setUser(data);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      applyUser(data);
      return data;
    } catch {
      setUser(false);
      lastRankRef.current = null;
      return false;
    }
  }, [applyUser]);

  useEffect(() => {
    if (window.location.hash?.includes("session_id=")) {
      return; // AuthCallback handles this
    }
    refreshUser();
  }, [refreshUser]);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      applyUser(data.user, { announce: false });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: apiError(e.response?.data?.detail) };
    }
  };

  const register = async (name, email, password) => {
    try {
      const { data } = await api.post("/auth/register", { name, email, password });
      applyUser(data.user, { announce: false });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: apiError(e.response?.data?.detail) };
    }
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    setUser(false);
    lastRankRef.current = null;
  };

  const openAuth = (mode = "login") => { setAuthMode(mode); setAuthOpen(true); };

  return (
    <AuthContext.Provider value={{ user, setUser: applyUser, login, register, logout, refreshUser, authOpen, setAuthOpen, authMode, setAuthMode, openAuth, rankUp, clearRankUp: () => setRankUp(null) }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
