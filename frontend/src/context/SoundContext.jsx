import React, { createContext, useContext, useState, useCallback } from "react";
import { soundManager } from "@/lib/sounds";

const SoundContext = createContext(null);

export function SoundProvider({ children }) {
  const [muted, setMuted] = useState(soundManager.isMuted());
  const toggle = useCallback(() => {
    soundManager.prime();
    const now = soundManager.toggle();
    setMuted(now);
  }, []);
  return <SoundContext.Provider value={{ muted, toggle }}>{children}</SoundContext.Provider>;
}

export const useSound = () => useContext(SoundContext);
