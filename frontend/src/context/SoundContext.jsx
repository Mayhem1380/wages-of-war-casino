import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { soundManager } from "@/lib/sounds";

const SoundContext = createContext(null);

export function SoundProvider({ children }) {
  const [muted, setMuted] = useState(soundManager.isMuted());
  const toggle = useCallback(() => {
    soundManager.prime();
    const now = soundManager.toggle();
    setMuted(now);
  }, []);
  const value = useMemo(() => ({ muted, toggle }), [muted, toggle]);
  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export const useSound = () => useContext(SoundContext);
