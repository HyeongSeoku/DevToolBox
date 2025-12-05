import { useMemo, useState } from "react";

import styles from "./index.module.scss";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ToastProvider";
import { copyWithToast } from "@/utils/clipboard";
import {
  diffEnvDetailed,
  generateExample,
  maskEnv,
  parseEnv,
  scanSecrets,
  type DiffItem,
} from "@/utils/env";

type MaskMode = "none" | "partial" | "full";
type Tab = "compare" | "example" | "security";

export function EnvManagerPage() {
  const toast = useToast();
  const [baseText, setBaseText] = useState(
    "API_URL=https://api.dev\nDB_HOST=localhost\nDB_USER=user\nDB_PASS=secret",
  );
  const [compareText, setCompareText] = useState(
    "API_URL=https://api.prod\nDB_HOST=prod.db\nDB_USER=user\n",
  );
  const [maskMode, setMaskMode] = useState<MaskMode>("partial");
  const [tab, setTab] = useState<Tab>("compare");

  const baseEnv = useMemo(() => parseEnv(baseText), [baseText]);
  const compareEnv = useMemo(() => parseEnv(compareText), [compareText]);
  const diff = useMemo(
    () => diffEnvDetailed(baseEnv, compareEnv),
    [baseEnv, compareEnv],
  );
  const exampleText = useMemo(
    () => generateExample(baseEnv.entries),
    [baseEnv.entries],
  );
  const secrets = useMemo(
    () => scanSecrets(baseEnv.entries),
    [baseEnv.entries],
  );

  const maskedDiff = useMemo(
    () =>
      diff.map((item) => ({
        ...item,
        base: item.base ? maskEnv([item.base], maskMode)[0] : undefined,
        compare: item.compare
          ? maskEnv([item.compare], maskMode)[0]
          : undefined,
      })),
    [diff, maskMode],
  );

  const handleCopy = async (text: string) =>
    copyWithToast(text, toast, { success: "복사 완료", error: "복사 실패" });

  const renderDiffRow = (item: DiffItem & { base?: any; compare?: any }) => {
    const status = item.status;
    const className =
      status === "match"
        ? styles.match
        : status === "missing"
          ? styles.missing
          : status === "extra"
            ? styles.extra
            : styles.diff;
    return (
      <div key={item.key} className={`${styles.diffRow} ${className}`}>
        <div className={styles.keyCol}>{item.key}</div>
        <div className={styles.valueCol}>{item.base?.value ?? "-"}</div>
        <div className={styles.valueCol}>{item.compare?.value ?? "-"}</div>
        <div className={styles.status}>{status}</div>
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className="eyebrow">.env Manager</p>
        <h1>env 비교 · 예제 생성 · 보안 검사</h1>
        <p className="micro">
          두 개의 env 텍스트를 붙여 넣어 차이를 확인하고, 예제/보안 점검을
          수행하세요.
        </p>
      </header>

      <div className={styles.tabs}>
        {(["compare", "example", "security"] as Tab[]).map((t) => (
          <Button
            key={t}
            variant="pill"
            active={tab === t}
            onClick={() => setTab(t)}
          >
            {t === "compare"
              ? "Compare"
              : t === "example"
                ? "Example"
                : "Security"}
          </Button>
        ))}
      </div>

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
      </section>

      {tab === "compare" && (
        <section className={styles.card}>
          <div className={styles.diffHeader}>
            <span className={styles.keyCol}>Key</span>
            <span className={styles.valueCol}>Base</span>
            <span className={styles.valueCol}>Compare</span>
            <span className={styles.status}>Status</span>
          </div>
          <div className={styles.diffList}>{maskedDiff.map(renderDiffRow)}</div>
        </section>
      )}

      {tab === "example" && (
        <section className={styles.card}>
          <div className={styles.row}>
            <p className={styles.label}>.env.example 생성</p>
            <Button variant="primary" onClick={() => handleCopy(exampleText)}>
              Copy
            </Button>
          </div>
          <pre className={styles.code}>{exampleText}</pre>
        </section>
      )}

      {tab === "security" && (
        <section className={styles.card}>
          <p className={styles.label}>보안 스캔</p>
          {secrets.length === 0 ? (
            <p className="subtle">의심 키가 없습니다.</p>
          ) : (
            <ul className={styles.secretList}>
              {secrets.map((s) => (
                <li key={s} className={styles.secretItem}>
                  {s}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
