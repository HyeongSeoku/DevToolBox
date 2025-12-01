import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import styles from "./index.module.scss";
import { useToast } from "@/components/ToastProvider";
import {
  loadSnippetsByKind,
  filterSnippets,
  useSnippetFavorites,
  type SnippetKind,
} from "@/modules/snippets/core";
import { type Snippet } from "@/modules/snippets/types";
import { useVaultStore } from "@/stores/useVaultStore";

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

export function SnippetHubPage() {
  const params = useParams();
  const navigate = useNavigate();
  const kind = (params.kind as SnippetKind) || "git";
  const vault = useVaultStore();
  const toast = useToast();

  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [languageFilter, setLanguageFilter] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const { favorites, toggleFavorite } = useSnippetFavorites(
    FAVORITE_KEYS[kind],
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await loadSnippetsByKind(
          kind,
          vault.settings?.vaultPath ?? null,
        );
        setSnippets(data);
      } catch (err) {
        toast.show(`스니펫 불러오기 실패: ${err}`, { type: "error" });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [kind, vault.settings?.vaultPath, toast]);

  const filtered = useMemo(
    () =>
      filterSnippets(snippets, {
        search,
        tags: tagFilter,
        language: languageFilter,
        category: categoryFilter,
      }),
    [snippets, search, tagFilter, languageFilter, categoryFilter],
  );

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

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.show("클립보드에 복사했습니다.", { type: "success" });
    } catch (error) {
      toast.show(`복사 실패: ${error}`, { type: "error" });
    }
  };

  const tabs: SnippetKind[] = ["git", "linux", "fe", "be"];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className="eyebrow">Snippets · {titles[kind]}</p>
        <h1>{titles[kind]} 스니펫 모음</h1>
        <p className="micro">검색/필터 후 바로 복사하세요.</p>
      </header>

      <div className={styles.tabRow}>
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`${styles.button} ${styles.tab} ${tab === kind ? styles.active : ""}`}
            onClick={() => navigate(`/snippets/${tab}`)}
          >
            {titles[tab]}
          </button>
        ))}
      </div>

      <section className={styles.filters}>
        <input
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
          const isFav = favorites.includes(s.id);
          return (
            <div key={s.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.title}>{s.title}</p>
                  {s.description && <p className="micro">{s.description}</p>}
                </div>
                <button
                  className={`${styles.button} ${isFav ? styles.active : ""}`}
                  onClick={() => {
                    const next = toggleFavorite(s.id);
                    toast.show(
                      next.includes(s.id) ? "즐겨찾기에 추가" : "즐겨찾기 해제",
                      { type: "info" },
                    );
                  }}
                  title="즐겨찾기"
                >
                  ★
                </button>
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
              <pre className={styles.code}>{s.content}</pre>
              <div className={styles.actions}>
                <button
                  className={styles.button}
                  onClick={() => handleCopy(s.content)}
                >
                  Copy
                </button>
              </div>
            </div>
          );
        })}
        {!filtered.length && !loading && (
          <p className="subtle">조건에 맞는 스니펫이 없습니다.</p>
        )}
      </section>
    </div>
  );
}
