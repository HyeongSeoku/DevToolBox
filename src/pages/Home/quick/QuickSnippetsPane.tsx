import { useMemo } from "react";

import { beSeedCore } from "@/modules/snippets/seeds/be";
import { feSeedCore } from "@/modules/snippets/seeds/fe";
import { gitSeedCore } from "@/modules/snippets/seeds/git";
import { linuxSeedCore } from "@/modules/snippets/seeds/linux";
import { type Snippet } from "@/modules/snippets/types";
import { useToast } from "@/components/ToastProvider";
import { copyWithToast } from "@/utils/clipboard";

import styles from "./QuickSnippetsPane.module.scss";

export function QuickSnippetsPane() {
  const toast = useToast();
  const seeds: Snippet[] = useMemo(
    () => [
      ...gitSeedCore.slice(0, 2),
      ...linuxSeedCore.slice(0, 1),
      ...feSeedCore.slice(0, 1),
      ...beSeedCore.slice(0, 1),
    ],
    [],
  );

  return (
    <div className={styles.pane}>
      <div className={styles.paneHeader}>
        <p className={styles.title}>Snippets</p>
        <p className="subtle">기본 스니펫 빠른 복사</p>
      </div>
      <div className={styles.historyList}>
        {seeds.map((s) => (
          <button
            key={s.id}
            className={styles.snippet}
            onClick={() => copyWithToast(s.content || "", toast)}
          >
            <p className={styles.title}>{s.title}</p>
            <p className="subtle">{s.content?.slice(0, 80) ?? ""}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
