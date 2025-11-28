import { gitSeedAdvanced, gitSeedCore } from "./seeds/git";
import { type Snippet, type SnippetFilter } from "./types";
import { useVaultStore } from "@/stores/useVaultStore";

export type SnippetSourceKey = "git-core" | "git-advanced";

export const snippetFiles: Record<SnippetSourceKey, string> = {
  "git-core": "snippets/git/core.json",
  "git-advanced": "snippets/git/advanced.json",
};

export function filterSnippets(list: Snippet[], filter: SnippetFilter) {
  const search = filter.search?.toLowerCase() || "";
  return list.filter((s) => {
    const matchesSearch =
      !search ||
      s.title.toLowerCase().includes(search) ||
      s.description?.toLowerCase().includes(search) ||
      s.tags.some((t) => t.toLowerCase().includes(search));
    const matchesTags =
      !filter.tags?.length ||
      filter.tags.every((tag) =>
        s.tags.map((t) => t.toLowerCase()).includes(tag.toLowerCase()),
      );
    const matchesLang =
      !filter.language ||
      (s.language ?? "").toLowerCase() === filter.language.toLowerCase();
    const matchesCat =
      !filter.category ||
      (s.category ?? "").toLowerCase() === filter.category.toLowerCase();
    return matchesSearch && matchesTags && matchesLang && matchesCat;
  });
}

export function useSnippetFavorites(storageKey: string) {
  const store = useVaultStore();
  const existing = (() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  })();
  const setFavorites = (ids: string[]) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(ids));
    }
  };
  const toggleFavorite = (id: string) => {
    const set = new Set(existing);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    const next = Array.from(set);
    setFavorites(next);
    return next;
  };
  return { favorites: existing, toggleFavorite };
}

export async function loadGitSnippets(
  vaultPath: string | null,
): Promise<Snippet[]> {
  const seeds = [...gitSeedCore, ...gitSeedAdvanced];
  const store = useVaultStore.getState();
  const readFile = store.readFile;

  const fromVault: Snippet[] = [];
  if (vaultPath) {
    for (const key of Object.keys(snippetFiles) as SnippetSourceKey[]) {
      try {
        const text = await readFile(snippetFiles[key]);
        const parsed = JSON.parse(text) as { snippets: Snippet[] };
        fromVault.push(
          ...(parsed.snippets || []).map((s) => ({ ...s, source: "vault" })),
        );
      } catch {
        // ignore missing files
      }
    }
  }
  return [...seeds, ...fromVault];
}
