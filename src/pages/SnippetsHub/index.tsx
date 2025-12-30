import { useEffect, useMemo, useState } from "react";

import { useParams, useNavigate } from "react-router-dom";

import Star from "@/assets/icons/star.svg?react";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/Button";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  loadSnippetsByKind,
  filterSnippets,
  useSnippetFavorites,
  type SnippetKind,
} from "@/modules/snippets/core";
import { type Snippet } from "@/modules/snippets/types";
import { useVaultStore } from "@/stores/useVaultStore";
import { copyWithToast } from "@/utils/clipboard";

import styles from "./index.module.scss";

const FAVORITE_KEYS: Record<SnippetKind, string> = {
  git: "snippets-git-favorites",
  linux: "snippets-linux-favorites",
  fe: "snippets-fe-favorites",
  be: "snippets-be-favorites",
};

const titles: Record<SnippetKind, string> = {
  git: "Git",
  linux: "Linux",
  fe: "FE Utils",
  be: "BE Utils",
};

type SnippetTab = SnippetKind | "favorites";
type SnippetWithKind = Snippet & { kind: SnippetKind };

export function SnippetHubPage() {
  const params = useParams();
  const navigate = useNavigate();
  const tab = (params.kind as SnippetTab) || "git";
  const kind: SnippetTab =
    tab === "git" || tab === "linux" || tab === "fe" || tab === "be"
      ? tab
      : tab === "favorites"
        ? tab
        : "git";
  const vault = useVaultStore();
  const toast = useToast();

  const [snippets, setSnippets] = useState<SnippetWithKind[]>([]);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [languageFilter, setLanguageFilter] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [activeSnippet, setActiveSnippet] = useState<SnippetWithKind | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const favoriteStores: Record<
    SnippetKind,
    ReturnType<typeof useSnippetFavorites>
  > = {
    git: useSnippetFavorites(FAVORITE_KEYS.git),
    linux: useSnippetFavorites(FAVORITE_KEYS.linux),
    fe: useSnippetFavorites(FAVORITE_KEYS.fe),
    be: useSnippetFavorites(FAVORITE_KEYS.be),
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (kind === "favorites") {
          const kinds: SnippetKind[] = ["git", "linux", "fe", "be"];
          const all = await Promise.all(
            kinds.map(async (k) => ({
              kind: k,
              snippets: await loadSnippetsByKind(
                k,
                vault.settings?.vaultPath ?? null,
              ),
            })),
          );
          setSnippets(
            all.flatMap((group) =>
              group.snippets.map((s) => ({ ...s, kind: group.kind })),
            ),
          );
        } else {
          const data = await loadSnippetsByKind(
            kind,
            vault.settings?.vaultPath ?? null,
          );
          setSnippets(data.map((s) => ({ ...s, kind })));
        }
      } catch (err) {
        toast.show(`스니펫 불러오기 실패: ${err}`, { type: "error" });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [kind, vault.settings?.vaultPath, toast]);

  const favoritesSet = useMemo(() => {
    return new Set([
      ...favoriteStores.git.favorites,
      ...favoriteStores.linux.favorites,
      ...favoriteStores.fe.favorites,
      ...favoriteStores.be.favorites,
    ]);
  }, [
    favoriteStores.git.favorites,
    favoriteStores.linux.favorites,
    favoriteStores.fe.favorites,
    favoriteStores.be.favorites,
  ]);

  const filtered = useMemo(() => {
    const base = filterSnippets(snippets, {
      search,
      tags: tagFilter,
      language: languageFilter,
      category: categoryFilter,
    });
    if (kind !== "favorites") return base;
    return base.filter((s) => favoritesSet.has(s.id));
  }, [
    snippets,
    search,
    tagFilter,
    languageFilter,
    categoryFilter,
    kind,
    favoritesSet,
  ]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(snippets.map((s) => s.category).filter(Boolean) as string[]),
      ),
    [snippets],
  );

  const tags = useMemo(
    () => Array.from(new Set(snippets.flatMap((s) => s.tags))),
    [snippets],
  );

  const handleCopy = async (content: string) =>
    copyWithToast(content, toast, {
      success: "클립보드에 복사했습니다.",
      error: "복사 실패",
    });

  useEffect(() => {
    if (isModalOpen) return;
    if (!activeSnippet) return;
    const timer = window.setTimeout(() => {
      setActiveSnippet(null);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [isModalOpen, activeSnippet]);

  const tabs: SnippetTab[] = ["git", "linux", "fe", "be", "favorites"];

  return (
    <div className={styles.page}>
      <div className={styles.tabRow}>
        {tabs.map((tab) => (
          <Button
            key={tab}
            className={`${styles.button} ${styles.tab} ${tab === kind ? styles.active : ""} ${tab === "favorites" ? styles.favoriteTab : ""}`}
            onClick={() => navigate(`/snippets/${tab}`)}
          >
            {tab === "favorites" ? (
              <>
                <Star width={14} height={14} />
                <span>Favorites</span>
              </>
            ) : (
              titles[tab]
            )}
          </Button>
        ))}
      </div>

      <section className={styles.filters}>
        <Input
          className={styles.input}
          placeholder="검색 (제목/설명/태그)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.input}
          value={categoryFilter ?? ""}
          onChange={(e) => setCategoryFilter(e.target.value || undefined)}
        >
          <option value="">카테고리 전체</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className={styles.input}
          value={languageFilter ?? ""}
          onChange={(e) => setLanguageFilter(e.target.value || undefined)}
        >
          <option value="">언어 전체</option>
          <option value="bash">bash</option>
          <option value="sh">sh</option>
          <option value="zsh">zsh</option>
          <option value="ts">ts</option>
          <option value="js">js</option>
        </select>
        <select
          className={styles.input}
          value={tagFilter[0] ?? ""}
          onChange={(e) => setTagFilter(e.target.value ? [e.target.value] : [])}
        >
          <option value="">태그 전체</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </section>

      {loading && <p className="micro">로딩 중...</p>}

      <section className={styles.grid}>
        {filtered.map((s) => {
          const isFav = favoritesSet.has(s.id);
          const favoriteStore = favoriteStores[s.kind];
          return (
            <div key={s.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.title}>{s.title}</p>
                  {s.description && <p className="micro">{s.description}</p>}
                </div>
                <Button
                  className={`${styles.button} ${isFav ? styles.active : ""}`}
                  onClick={() => {
                    const next = favoriteStore.toggleFavorite(s.id);
                    toast.show(
                      next.includes(s.id) ? "즐겨찾기에 추가" : "즐겨찾기 해제",
                      { type: "info" },
                    );
                  }}
                  title="즐겨찾기"
                >
                  <Star width={14} height={14} />
                </Button>
              </div>
              <div className={styles.meta}>
                <span className={styles.badge}>{s.category ?? "기타"}</span>
                <span className={styles.badge}>{s.language ?? "bash"}</span>
                <div className={styles.tags}>
                  {s.tags.map((t) => (
                    <span key={t} className={styles.tag}>
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
              <CodeBlock
                className={styles.code}
                language={s.language}
                copyable
                onCopy={handleCopy}
                maxHeight={200}
              >
                {s.content}
              </CodeBlock>
              <div className={styles.actions}>
                <Button
                  className={styles.button}
                  onClick={() => {
                    setActiveSnippet(s);
                    setIsModalOpen(true);
                  }}
                >
                  전체보기
                </Button>
              </div>
            </div>
          );
        })}
        {!filtered.length && !loading && (
          <p className="subtle">조건에 맞는 스니펫이 없습니다.</p>
        )}
      </section>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={activeSnippet?.title}
        description={activeSnippet?.description}
        size="lg"
      >
        {activeSnippet &&
          (() => {
            const isFav = favoritesSet.has(activeSnippet.id);
            const favoriteStore = favoriteStores[activeSnippet.kind];
            return (
              <div className={styles.modalBody}>
                <div className={styles.modalHeader}>
                  <div className={styles.meta}>
                    <span className={styles.badge}>
                      {activeSnippet.category ?? "기타"}
                    </span>
                    <span className={styles.badge}>
                      {activeSnippet.language ?? "bash"}
                    </span>
                    <div className={styles.tags}>
                      {activeSnippet.tags.map((t) => (
                        <span key={t} className={styles.tag}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button
                    className={`${styles.button} ${isFav ? styles.active : ""}`}
                    onClick={() => {
                      const next = favoriteStore.toggleFavorite(
                        activeSnippet.id,
                      );
                      toast.show(
                        next.includes(activeSnippet.id)
                          ? "즐겨찾기에 추가"
                          : "즐겨찾기 해제",
                        { type: "info" },
                      );
                    }}
                    title="즐겨찾기"
                  >
                    <Star width={14} height={14} />
                  </Button>
                </div>
                <CodeBlock
                  className={styles.modalCode}
                  language={activeSnippet.language}
                  copyable
                  onCopy={handleCopy}
                  maxHeight="60vh"
                >
                  {activeSnippet.content}
                </CodeBlock>
              </div>
            );
          })()}
      </Modal>
    </div>
  );
}
