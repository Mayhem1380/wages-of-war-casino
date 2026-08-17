import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { fmt } from "@/data/gameMeta";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = anon, object = user
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [rankUp, setRankUp] = useState(null);
  const lastRankRef = useRef(null);

  const applyUser = useCallback((data, { announce = true } = {}) => {
    if (data && data.vip_rank != null) {
      if (
        announce &&
        lastRankRef.current != null &&
        data.vip_rank > lastRankRef.current
      ) {
        setRankUp({
          tier: data.vip_tier,
          rank: data.vip_rank,
          cashback: data.vip_cashback,
        });
      }
      lastRankRef.current = data.vip_rank;
    }
    setUser(data);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      applyUser(data);
      if (data.cashback_just_paid > 0) {
        toast.success(
          `Welcome back, operative — ${data.vip_tier} weekly cashback of +${fmt(data.cashback_just_paid)} credits was auto-deposited.`,
          { duration: 6000 },
        );
      }
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

  const login = useCallback(
    async (email, password) => {
      try {
        const { data } = await api.post("/auth/login", { email, password });
        applyUser(data.user, { announce: false });
        return { ok: true };
      } catch (e) {
        return { ok: false, error: apiError(e.response?.data?.detail) };
      }
    },
    [applyUser],
  );

  const register = useCallback(
    async (name, email, password) => {
      try {
        const { data } = await api.post("/auth/register", {
          name,
          email,
          password,
        });
        applyUser(data.user, { announce: false });
        return { ok: true };
      } catch (e) {
        return { ok: false, error: apiError(e.response?.data?.detail) };
      }
    },
    [applyUser],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      console.warn("logout request failed", e);
    }
    setUser(false);
    lastRankRef.current = null;
  }, []);

  const openAuth = useCallback((mode = "login") => {
    setAuthMode(mode);
    setAuthOpen(true);
  }, []);
  const clearRankUp = useCallback(() => setRankUp(null), []);

  const value = useMemo(
    () => ({
      user,
      setUser: applyUser,
      login,
      register,
      logout,
      refreshUser,
      authOpen,
      setAuthOpen,
      authMode,
      setAuthMode,
      openAuth,
      rankUp,
      clearRankUp,
    }),
    [
      user,
      applyUser,
      login,
      register,
      logout,
      refreshUser,
      authOpen,
      authMode,
      openAuth,
      rankUp,
      clearRankUp,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
