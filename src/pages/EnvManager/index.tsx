import { useMemo, useState } from "react";

import styles from "./index.module.scss";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ToastProvider";
import { useVaultStore } from "@/stores/useVaultStore";
import { diffEnv, maskEnv, parseEnv, type EnvEntry } from "@/utils/env";

const HISTORY_PATH = "history/env";

type MaskMode = "none" | "partial" | "full";
type SortMode = "alpha" | "group" | "example";

export function EnvManagerPage() {
  const toast = useToast();
  const vault = useVaultStore();
  const [baseText, setBaseText] = useState(
    "API_URL=https://api.dev\nDB_HOST=localhost\nDB_USER=user\nDB_PASS=secret",
  );
  const [compareText, setCompareText] = useState(
    "API_URL=https://api.prod\nDB_HOST=prod.db\nDB_USER=user\n",
  );
  const [maskMode, setMaskMode] = useState<MaskMode>("partial");
  const [sortMode, setSortMode] = useState<SortMode>("alpha");
  const [showMissingOnly, setShowMissingOnly] = useState(true);

  const baseEnv = useMemo(() => parseEnv(baseText), [baseText]);
  const compareEnv = useMemo(() => parseEnv(compareText), [compareText]);
  const diff = useMemo(
    () => diffEnv(baseEnv, compareEnv),
    [baseEnv, compareEnv],
  );

  const maskedMissing = useMemo(
    () => maskEnv(diff.missing, maskMode),
    [diff.missing, maskMode],
  );
  const maskedExtras = useMemo(
    () => maskEnv(diff.extras, maskMode),
    [diff.extras, maskMode],
  );
  const maskedCommon = useMemo(
    () => maskEnv(diff.common, maskMode),
    [diff.common, maskMode],
  );

  const sortedCommon = useMemo(
    () => sortEntries(maskedCommon, sortMode, baseEnv),
    [maskedCommon, sortMode, baseEnv],
  );

  const saveHistory = async () => {
    try {
      const filename = `${HISTORY_PATH}/${Date.now()}.json`;
      await vault.writeFile(
        filename,
        JSON.stringify(
          {
            base: baseText,
            compare: compareText,
            mask: maskMode,
            sort: sortMode,
          },
          null,
          2,
        ),
      );
      toast.show("Vault에 저장했습니다.", { type: "success" });
    } catch {
      toast.show("Vault 저장 실패: 설정을 확인하세요.", { type: "error" });
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className="eyebrow">.env Manager</p>
        <h1>멀티 env 비교 · 마스킹 · 정렬</h1>
        <p className="micro">
          base/.env와 대상 환경을 비교하고 누락/차이를 한눈에 확인하세요.
        </p>
      </header>

      <section className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.row}>
            <p className={styles.label}>Base (.env)</p>
            <Button variant="ghost" onClick={() => setBaseText("")}>
              지우기
            </Button>
          </div>
          <textarea
            className={styles.textarea}
            value={baseText}
            onChange={(e) => setBaseText(e.target.value)}
          />
        </div>

        <div className={styles.card}>
          <div className={styles.row}>
            <p className={styles.label}>비교 대상 (.env.example 등)</p>
            <Button variant="ghost" onClick={() => setCompareText("")}>
              지우기
            </Button>
          </div>
          <textarea
            className={styles.textarea}
            value={compareText}
            onChange={(e) => setCompareText(e.target.value)}
          />
        </div>
      </section>

      <section className={styles.toolbar}>
        <div className={styles.inline}>
          <label className={styles.label}>마스킹</label>
          <select
            value={maskMode}
            onChange={(e) => setMaskMode(e.target.value as MaskMode)}
          >
            <option value="partial">부분 마스킹</option>
            <option value="full">전체 마스킹</option>
            <option value="none">마스킹 없음</option>
          </select>
        </div>
        <div className={styles.inline}>
          <label className={styles.label}>정렬</label>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
          >
            <option value="alpha">알파벳</option>
            <option value="group">그룹(DB_/API_/SERVICE_)</option>
            <option value="example">example 우선</option>
          </select>
        </div>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={showMissingOnly}
            onChange={(e) => setShowMissingOnly(e.target.checked)}
          />
          누락만 표시
        </label>
        <Button variant="ghost" onClick={saveHistory}>
          Vault 저장
        </Button>
      </section>

      <section className={styles.grid}>
        <div className={styles.card}>
          <p className={styles.label}>누락 ({maskedMissing.length})</p>
          {maskedMissing.length === 0 ? (
            <p className="subtle">누락 없음</p>
          ) : (
            <EntryList entries={maskedMissing} tone="warn" />
          )}
        </div>
        <div className={styles.card}>
          <p className={styles.label}>추가 ({maskedExtras.length})</p>
          {maskedExtras.length === 0 ? (
            <p className="subtle">추가 없음</p>
          ) : (
            <EntryList entries={maskedExtras} tone="info" />
          )}
        </div>
      </section>

      {!showMissingOnly && (
        <section className={styles.card}>
          <p className={styles.label}>공통 키 ({sortedCommon.length})</p>
          <EntryList entries={sortedCommon} tone="neutral" />
        </section>
      )}
    </div>
  );
}

type EntryListProps = {
  entries: EnvEntry[];
  tone: "warn" | "info" | "neutral";
};

function EntryList({ entries, tone }: EntryListProps) {
  return (
    <div className={styles.list}>
      {entries.map((e) => (
        <div key={e.key} className={`${styles.item} ${styles[tone]}`}>
          <span className={styles.key}>{e.key}</span>
          <span className={styles.value}>{e.value}</span>
        </div>
      ))}
    </div>
  );
}

function sortEntries(
  entries: EnvEntry[],
  mode: SortMode,
  base: { entries: EnvEntry[] },
) {
  if (mode === "alpha") {
    return [...entries].sort((a, b) => a.key.localeCompare(b.key));
  }
  if (mode === "group") {
    const weight = (key: string) => {
      if (key.startsWith("DB_")) return 0;
      if (key.startsWith("API_")) return 1;
      if (key.startsWith("SERVICE_")) return 2;
      return 3;
    };
    return [...entries].sort(
      (a, b) => weight(a.key) - weight(b.key) || a.key.localeCompare(b.key),
    );
  }
  if (mode === "example") {
    const baseIndex = base.entries.reduce<Record<string, number>>(
      (acc, e, idx) => {
        acc[e.key] = idx;
        return acc;
      },
      {},
    );
    return [...entries].sort(
      (a, b) => (baseIndex[a.key] ?? 9999) - (baseIndex[b.key] ?? 9999),
    );
  }
  return entries;
}
