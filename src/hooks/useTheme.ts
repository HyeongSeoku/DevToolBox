import { useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedThemeMode = "light" | "dark";

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
  const [systemTheme, setSystemTheme] = useState<ResolvedThemeMode>(() =>
    getSystemTheme(),
  );

  const resolvedMode = useMemo<ResolvedThemeMode>(
    () => (mode === "system" ? systemTheme : mode),
    [mode, systemTheme],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.dataset.theme = resolvedMode;
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode, resolvedMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      setSystemTheme(getSystemTheme());
    };
    handler();
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  const toggleMode = () => {
    setMode((prev) => {
      const base = prev === "system" ? systemTheme : prev;
      return base === "dark" ? "light" : "dark";
    });
  };

  return { mode, resolvedMode, setMode, toggleMode };
}
