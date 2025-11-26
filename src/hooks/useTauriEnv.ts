import { useEffect, useState } from "react";

const detectTauri = () => {
  if (typeof window === "undefined") return false;
  const w = window as any;
  return Boolean(w.__TAURI_INTERNALS__ || w.__TAURI_IPC__ || w.__TAURI__);
};

export function useTauriEnv() {
  const [isTauriEnv, setIsTauriEnv] = useState<boolean>(() => detectTauri());

  useEffect(() => {
    setIsTauriEnv(detectTauri());
  }, []);

  return isTauriEnv;
}
