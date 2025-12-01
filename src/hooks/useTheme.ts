import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "theme-mode";

const getSystemTheme = () => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    const saved = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    return saved ?? "system";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const system = getSystemTheme();
    const applied = mode === "system" ? system : mode;
    document.documentElement.dataset.theme = applied;
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (mode === "system") {
        const system = getSystemTheme();
        document.documentElement.dataset.theme = system;
      }
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [mode]);

  const cycleMode = () => {
    setMode((prev) => {
      if (prev === "system") return "light";
      if (prev === "light") return "dark";
      return "system";
    });
  };

  return { mode, setMode, cycleMode };
}
