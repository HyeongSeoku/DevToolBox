import { create } from "zustand";

import { type NavKey } from "@/types/nav";

type QuickLayoutState = {
  panes: NavKey[];
  addPane: (key: NavKey) => void;
  removePane: (key: NavKey) => void;
  reset: () => void;
};

const STORAGE_KEY = "quick-layout-panes";
const allowed: NavKey[] = [
  "convert",
  "typegen",
  "jwt",
  "text",
  "regex",
  "json",
  "env",
  "snippets",
  "jsdoc",
  "history",
  "i18n",
];
const defaultPanes: NavKey[] = ["convert", "typegen", "jsdoc", "snippets"];
const MAX_PANES = 4;

const loadPanes = (): NavKey[] => {
  if (typeof window === "undefined") return defaultPanes;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPanes;
    const parsed = JSON.parse(raw) as string[];
    const filtered = parsed.filter((p): p is NavKey =>
      allowed.includes(p as NavKey),
    );
    return filtered.length ? filtered.slice(0, MAX_PANES) : defaultPanes;
  } catch {
    return defaultPanes;
  }
};

const persist = (panes: NavKey[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(panes.slice(0, MAX_PANES)),
  );
};

export const useQuickLayoutStore = create<QuickLayoutState>((set) => ({
  panes: loadPanes(),
  addPane: (key) => {
    if (!allowed.includes(key)) return;
    set((state) => {
      const exists = state.panes.includes(key);
      if (exists || state.panes.length >= MAX_PANES) {
        return state;
      }
      const next = [...state.panes, key];
      persist(next);
      return { panes: next };
    });
  },
  removePane: (key) => {
    set((state) => {
      const next = state.panes.filter((p) => p !== key);
      persist(next);
      return { panes: next };
    });
  },
  reset: () => {
    persist(defaultPanes);
    set({ panes: defaultPanes });
  },
}));
