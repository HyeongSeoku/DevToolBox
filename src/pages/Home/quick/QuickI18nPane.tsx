import { useEffect, useMemo, useState } from "react";

import { type I18nKeyStatus } from "@/pages/I18nInspector/types";
import {
  flattenJson,
  compareLocales,
  detectLanguage,
} from "@/pages/I18nInspector/utils";

import styles from "./QuickI18nPane.module.scss";

const localeOptions = [
  { code: "en", label: "영어(EN)" },
  { code: "ko", label: "한국어(KR)" },
  { code: "ja", label: "일본어(JP)" },
];

const normalizeQuotes = (text: string) =>
  text.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

const statusOrder: Record<I18nKeyStatus["status"], number> = {
  MISSING: 0,
  UNTRANSLATED: 1,
  PLACEHOLDER_MISMATCH: 2,
  LANG_MISMATCH: 3,
  EXTRA: 4,
  OK: 5,
};

export function QuickI18nPane() {
  const [baseLocale, setBaseLocale] = useState("en");
  const [targetLocale, setTargetLocale] = useState("ko");
  const [baseText, setBaseText] = useState('{"hello":"Hello"}');
  const [targetText, setTargetText] = useState('{"hello":"안녕"}');
  const [error, setError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<I18nKeyStatus[]>([]);

  const autoDetect = (text: string, role: "base" | "target") => {
    try {
      const parsed = JSON.parse(normalizeQuotes(text));
      const flat = flattenJson(parsed);
      const values = Object.values(flat).filter((v) => v.trim().length > 2);
      const sample = values[0] ?? "";
      const detected = detectLanguage(sample);
      if (detected && ["en", "ko", "ja"].includes(detected)) {
        if (role === "base" && detected !== baseLocale) setBaseLocale(detected);
        if (role === "target" && detected !== targetLocale)
          setTargetLocale(detected);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    try {
      const entries = [] as {
        locale: string;
        namespace: string;
        key: string;
        value: string;
        path: string;
      }[];

      const baseObj = JSON.parse(normalizeQuotes(baseText));
      const targetObj = JSON.parse(normalizeQuotes(targetText));
      const baseFlat = flattenJson(baseObj);
      const targetFlat = flattenJson(targetObj);

      Object.entries(baseFlat).forEach(([key, value]) => {
        entries.push({
          locale: baseLocale,
          namespace: "default",
          key,
          value,
          path: "text:base",
        });
      });
      Object.entries(targetFlat).forEach(([key, value]) => {
        entries.push({
          locale: targetLocale,
          namespace: "default",
          key,
          value,
          path: "text:target",
        });
      });

      const compared = compareLocales(baseLocale, [targetLocale], entries).sort(
        (a, b) => {
          const sa = statusOrder[a.status];
          const sb = statusOrder[b.status];
          if (sa !== sb) return sa - sb;
          return `${a.namespace}.${a.key}`.localeCompare(
            `${b.namespace}.${b.key}`,
            undefined,
            {
              sensitivity: "base",
            },
          );
        },
      );
      setStatuses(compared);
      setError(null);
      autoDetect(baseText, "base");
      autoDetect(targetText, "target");
    } catch (err) {
      setError(String(err));
      setStatuses([]);
    }
  }, [baseText, targetText, baseLocale, targetLocale]);

  const summary = useMemo(() => {
    const map: Record<I18nKeyStatus["status"], number> = {
      OK: 0,
      MISSING: 0,
      EXTRA: 0,
      UNTRANSLATED: 0,
      PLACEHOLDER_MISMATCH: 0,
      LANG_MISMATCH: 0,
    };
    statuses.forEach((s) => {
      map[s.status] = (map[s.status] ?? 0) + 1;
    });
    return map;
  }, [statuses]);

  const filtered = useMemo(
    () =>
      statuses
        .filter((s) => s.status === "MISSING" || s.status === "UNTRANSLATED")
        .slice(0, 8),
    [statuses],
  );

  return (
    <div className={styles.pane}>
      <div className={styles.paneHeader}>
        <p className={styles.title}>i18n Inspector</p>
        <p className="subtle">작은 JSON을 바로 비교</p>
      </div>

      <div className={styles.split}>
        <div className={styles.paneHeader}>
          <label className="micro">Base</label>
          <select
            className={styles.input}
            value={baseLocale}
            onChange={(e) => setBaseLocale(e.target.value)}
          >
            {localeOptions.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
          <textarea
            className={styles.textarea}
            value={baseText}
            onChange={(e) => setBaseText(e.target.value)}
            placeholder='{"greet":"Hello"}'
          />
        </div>
        <div className={styles.paneHeader}>
          <label className="micro">Target</label>
          <select
            className={styles.input}
            value={targetLocale}
            onChange={(e) => setTargetLocale(e.target.value)}
          >
            {localeOptions.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
          <textarea
            className={styles.textarea}
            value={targetText}
            onChange={(e) => setTargetText(e.target.value)}
            placeholder='{"greet":"안녕"}'
          />
        </div>
      </div>

      <div className={styles.paneActions}>
        <div className={styles.summaryRow}>
          <span className={`${styles.badge} ${styles.okCount}`}>
            OK {summary.OK}
          </span>
          <span className={`${styles.badge} ${styles.missingCount}`}>
            MISSING {summary.MISSING}
          </span>
          <span className={`${styles.badge} ${styles.warnCount}`}>
            UNTRANSLATED {summary.UNTRANSLATED}
          </span>
        </div>
      </div>

      {error && <p className="micro warning">{error}</p>}

      <div className={styles.historyList}>
        {filtered.map((s) => (
          <div key={`${s.key}-${s.status}`} className={styles.historyItem}>
            <div className={styles.paneActions}>
              <span className={styles.title}>{s.key}</span>
              <span
                className={`${styles.badge} ${s.status === "MISSING" ? styles.missingCount : styles.warnCount}`}
              >
                {s.status}
              </span>
            </div>
            <p className="micro subtle">base: {s.baseValue ?? "-"}</p>
            <p className="micro subtle">target: {s.targetValue ?? "-"}</p>
          </div>
        ))}
        {!filtered.length && !error && (
          <p className="micro subtle">MISSING/UNTRANSLATED 항목이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
