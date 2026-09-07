import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { soundManager } from "@/lib/sounds";

const SoundContext = createContext(null);

export function SoundProvider({ children }) {
  const [muted, setMuted] = useState(soundManager.isMuted());

  useEffect(() => {
    setMuted(soundManager.isMuted());
  }, []);

  const toggle = useCallback(() => {
    soundManager.prime();
    const next = soundManager.toggle();
    setMuted(next);
  }, []);

  const value = useMemo(() => ({ muted, toggle }), [muted, toggle]);
  return (
    <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
  );
}

export const useSound = () => useContext(SoundContext);
