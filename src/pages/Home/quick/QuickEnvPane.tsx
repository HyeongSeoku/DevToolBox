import { useMemo, useState } from "react";

import { maskEnv, parseEnv } from "@/utils/env";

import styles from "./QuickEnvPane.module.scss";

export function QuickEnvPane() {
  const [raw, setRaw] = useState("");
  const entries = useMemo(() => {
    const parsed = parseEnv(raw);
    return maskEnv(parsed.entries, "partial");
  }, [raw]);

  return (
    <div className={styles.pane}>
      <div className={styles.paneHeader}>
        <p className={styles.title}>.env 빠른 뷰어</p>
        <p className="subtle">키/값을 붙여넣으면 값이 마스킹됩니다.</p>
      </div>
      <textarea
        className={styles.textarea}
        placeholder="API_KEY=abcd1234"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
      />
      <div className={styles.historyList}>
        {entries.map((e) => (
          <div key={e.key} className={styles.historyItem}>
            <p className={styles.title}>{e.key}</p>
            <p className="subtle">****{e.value.slice(-2)}</p>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="subtle">입력된 키가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
