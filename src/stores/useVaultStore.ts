import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";

export type VaultSettings = {
  vaultPath: string;
  recentFiles: string[];
  lastOpenPath?: string | null;
};

type VaultState = {
  settings: VaultSettings | null;
  loading: boolean;
  error?: string;
  initVault: (path?: string | null) => Promise<void>;
  reload: () => Promise<void>;
  saveSettings: (partial?: Partial<VaultSettings>) => Promise<void>;
  setVaultPath: (path: string) => Promise<void>;
  readFile: (relativePath: string) => Promise<string>;
  writeFile: (relativePath: string, contents: string) => Promise<string>;
  deleteEntry: (relativePath: string) => Promise<void>;
  moveEntry: (from: string, to: string) => Promise<string>;
};

const isTauriAvailable = () =>
  typeof window !== "undefined" &&
  Boolean(
    (window as any).__TAURI__ ||
      (window as any).__TAURI_IPC__ ||
      (window as any).__TAURI_INTERNALS__,
  );

const requireVaultPath = (state: VaultState) => {
  const path = state.settings?.vaultPath;
  if (!path) throw new Error("Vault가 아직 초기화되지 않았습니다.");
  return path;
};

export const useVaultStore = create<VaultState>((set, get) => ({
  settings: null,
  loading: false,
  error: undefined,

  initVault: async (path) => {
    if (!isTauriAvailable()) {
      const msg = "Vault 기능은 Tauri 환경에서만 동작합니다.";
      set({ error: msg, loading: false });
      return;
    }
    set({ loading: true, error: undefined });
    try {
      const settings = await invoke<VaultSettings>("init_vault", {
        path: path ?? null,
      });
      set({ settings, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  reload: async () => {
    if (!isTauriAvailable()) {
      set({ loading: false });
      return;
    }
    set({ loading: true, error: undefined });
    try {
      const settings = await invoke<VaultSettings>("read_settings_json", {
        path: get().settings?.vaultPath ?? null,
      });
      set({ settings, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  saveSettings: async (partial) => {
    if (!isTauriAvailable()) return;
    const current = get().settings;
    if (!current) {
      await get().initVault(partial?.vaultPath ?? null);
      return;
    }
    const next = { ...current, ...partial };
    set({ loading: true, error: undefined });
    try {
      const saved = await invoke<VaultSettings>("write_settings_json", {
        settings: next,
      });
      set({ settings: saved, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  setVaultPath: async (path) => get().initVault(path),

  readFile: async (relativePath) => {
    const vaultPath = requireVaultPath(get());
    return invoke<string>("read_vault_file", { vaultPath, relativePath });
  },

  writeFile: async (relativePath, contents) => {
    const vaultPath = requireVaultPath(get());
    return invoke<string>("write_vault_file", {
      vaultPath,
      relativePath,
      contents,
    });
  },

  deleteEntry: async (relativePath) => {
    const vaultPath = requireVaultPath(get());
    await invoke<void>("delete_vault_entry", { vaultPath, relativePath });
  },

  moveEntry: async (from, to) => {
    const vaultPath = requireVaultPath(get());
    return invoke<string>("move_vault_entry", { vaultPath, from, to });
  },
}));
