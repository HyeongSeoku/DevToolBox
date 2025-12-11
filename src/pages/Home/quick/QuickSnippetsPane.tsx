import { useMemo, useState } from "react";

import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { beSeedCore } from "@/modules/snippets/seeds/be";
import { feSeedCore } from "@/modules/snippets/seeds/fe";
import { gitSeedCore } from "@/modules/snippets/seeds/git";
import { linuxSeedCore } from "@/modules/snippets/seeds/linux";
import { type Snippet } from "@/modules/snippets/types";
import { copyWithToast } from "@/utils/clipboard";

import styles from "./QuickSnippetsPane.module.scss";

export function QuickSnippetsPane() {
  const [tab, setTab] = useState<"git" | "linux" | "fe" | "be">("git");
  const [page, setPage] = useState(0);
  const toast = useToast();
  const perPage = 6;

  const seedsAll: Snippet[] = useMemo(() => {
    switch (tab) {
      case "git":
        return gitSeedCore;
      case "linux":
        return linuxSeedCore;
      case "fe":
        return feSeedCore;
      case "be":
        return beSeedCore;
      default:
        return [];
    }
  }, [tab]);

  const paged = useMemo(() => {
    const start = page * perPage;
    return seedsAll.slice(start, start + perPage);
  }, [seedsAll, page]);

  return (
    <div className={styles.pane}>
      <div className={styles.paneHeader}>
        <p className={styles.title}>Snippets</p>
        <p className="subtle">기본 스니펫 빠른 복사</p>
      </div>
      <div className={styles.tabRow}>
        {(["git", "linux", "fe", "be"] as const).map((kind) => (
          <Button
            key={kind}
            className={`${styles.tabButton} ${tab === kind ? styles.active : ""}`}
            onClick={() => {
              setTab(kind);
              setPage(0);
            }}
          >
            {kind.toUpperCase()}
          </Button>
        ))}
      </div>
      <div className={styles.historyList}>
        {paged.map((s) => (
          <Button
            key={s.id}
            className={styles.snippet}
            onClick={() => copyWithToast(s.content || "", toast)}
          >
            <p className={styles.title}>{s.title}</p>
            <p className="subtle">{s.content?.slice(0, 80) ?? ""}</p>
          </Button>
        ))}
        {paged.length === 0 && (
          <p className="subtle">표시할 스니펫이 없습니다.</p>
        )}
      </div>
      {seedsAll.length > perPage && (
        <Pagination
          page={page}
          pageSize={perPage}
          total={seedsAll.length}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
