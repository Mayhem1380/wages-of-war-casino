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
  const ambienceRef = React.useRef(null);

  useEffect(() => {
    setMuted(soundManager.isMuted());
    return () => soundManager.combatAmbienceStop(ambienceRef.current);
  }, []);

  const toggle = useCallback(() => {
    soundManager.prime();
    const next = soundManager.toggle();
    if (next) {
      soundManager.combatAmbienceStop(ambienceRef.current);
      ambienceRef.current = null;
    } else {
      ambienceRef.current = soundManager.combatAmbienceStart();
    }
    setMuted(next);
  }, []);

  const value = useMemo(() => ({ muted, toggle }), [muted, toggle]);
  return (
    <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
  );
}

export const useSound = () => useContext(SoundContext);
