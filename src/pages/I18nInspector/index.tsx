import { useEffect, useMemo, useRef, useState } from "react";

import { invoke } from "@tauri-apps/api/core";

import { ScrollArea } from "@/components/ui/ScrollArea";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ToastProvider";
import { copyWithToast } from "@/utils/clipboard";

import styles from "./index.module.scss";
import { type I18nKeyStatus, type ScanResult } from "./types";
import { compareLocales, detectLanguage, flattenJson, groupScanResult } from "./utils";

const normalizeQuotes = (text: string) =>
  text.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

export function I18nInspectorPage() {
  const readTextFile = (path: string) =>
    invoke<string>("read_text_file", { path });
  const toast = useToast();
  const [baseLocale, setBaseLocale] = useState("en");
  const [targetLocale, setTargetLocale] = useState("ko");
  const [, setRoot] = useState("");
  const [baseText, setBaseText] = useState("{}");
  const [targetText, setTargetText] = useState("{}");
  const [baseError, setBaseError] = useState<string | null>(null);
  const [targetError, setTargetError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [statuses, setStatuses] = useState<I18nKeyStatus[]>([]);
  const compareTimer = useRef<number | null>(null);
  const [formattedBase, setFormattedBase] = useState(false);
  const [formattedTarget, setFormattedTarget] = useState(false);

  const isJsonValid = (text: string, role: "base" | "target") => {
    try {
      JSON.parse(normalizeQuotes(text));
      if (role === "base") setBaseError(null);
      else setTargetError(null);
      return true;
    } catch (err) {
      const message = String(err);
      if (role === "base") setBaseError(message);
      else setTargetError(message);
      return false;
    }
  };

  const pickRoot = async () => {
    try {
      const picked = await invoke<string | null>("pick_folder");
      if (picked) setRoot(picked);
    } catch (err) {
      setError(String(err));
    }
  };

  const handleFileLoad = async (role: "base" | "target") => {
    try {
      const picked = await invoke<string[] | string>("pick_files", {
        multiple: false,
        extensions: ["json"],
      });
      const path = Array.isArray(picked) ? picked[0] : picked;
      if (!path) return;
      const content = normalizeQuotes(await readTextFile(path));
      if (role === "base") {
        setBaseText(content);
        setFormattedBase(false);
        setBaseError(null);
      } else {
        setTargetText(content);
        setFormattedTarget(false);
        setTargetError(null);
      }
    } catch (err) {
      setError(String(err));
    }
  };

  const parseTextEntries = () => {
    const flattened: {
      locale: string;
      namespace: string;
      key: string;
      value: string;
      path: string;
    }[] = [];
    const baseErr = (() => {
      try {
        const json = JSON.parse(normalizeQuotes(baseText));
        const flat = flattenJson(json);
        Object.entries(flat).forEach(([key, value]) => {
          flattened.push({
            locale: baseLocale,
            namespace: "default",
            key,
            value,
            path: `text:${baseLocale}`,
          });
        });
        return null;
      } catch (err) {
        return String(err);
      }
    })();
    const targetErr = (() => {
      try {
        const json = JSON.parse(normalizeQuotes(targetText));
        const flat = flattenJson(json);
        Object.entries(flat).forEach(([key, value]) => {
          flattened.push({
            locale: targetLocale,
            namespace: "default",
            key,
            value,
            path: `text:${targetLocale}`,
          });
        });
        return null;
      } catch (err) {
        return String(err);
      }
    })();

    setBaseError(baseErr);
    setTargetError(targetErr);
    if (!baseErr && !targetErr) setError(null);
    if (baseErr || targetErr) {
      throw new Error("JSON 파싱 오류가 있습니다.");
    }
    return flattened;
  };

  const autoDetectLocale = (text: string, role: "base" | "target") => {
    try {
      const parsed = JSON.parse(text);
      const flat = flattenJson(parsed);
      const values = Object.values(flat).filter((v) => v.trim().length > 2);
      const sample = values[0] ?? text;
      const detected = detectLanguage(sample);
      if (detected && ["en", "ko", "ja"].includes(detected)) {
        if (role === "base") setBaseLocale(detected);
        else setTargetLocale(detected);
      }
    } catch {
      // ignore detection errors
    }
  };

  const runCompare = async () => {
    setLoading(true);
    setError(null);
    try {
      const flattened: {
        locale: string;
        namespace: string;
        key: string;
        value: string;
        path: string;
      }[] = [];

      flattened.push(...parseTextEntries());

      if (!flattened.length) {
        setError("비교할 데이터가 없습니다.");
        return;
      }

      const sorted = [...flattened].sort((a, b) => {
        const ka = `${a.namespace}.${a.key}`;
        const kb = `${b.namespace}.${b.key}`;
        return ka.localeCompare(kb, undefined, { sensitivity: "base" });
      });

      const grouped = groupScanResult(sorted);
      setResult(grouped);
      const order = {
        MISSING: 0,
        UNTRANSLATED: 1,
        PLACEHOLDER_MISMATCH: 2,
        LANG_MISMATCH: 3,
        EXTRA: 4,
        OK: 5,
      } as const;
      const statuses = compareLocales(baseLocale, [targetLocale], sorted).sort(
        (a, b) => {
          const sa = order[a.status] ?? 99;
          const sb = order[b.status] ?? 99;
          if (sa !== sb) return sa - sb;
          const na = `${a.namespace}.${a.key}`;
          const nb = `${b.namespace}.${b.key}`;
          return na.localeCompare(nb, undefined, { sensitivity: "base" });
        },
      );
      setStatuses(statuses);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const byLocale = useMemo(() => {
    const map: Record<string, I18nKeyStatus[]> = {};
    statuses.forEach((s) => {
      const key = `${s.targetLocale}`;
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [statuses]);

  const localeOptions = [
    { code: "en", label: "영어(EN)" },
    { code: "ko", label: "한국어(KR)" },
    { code: "ja", label: "일본어(JP)" },
  ];

  useEffect(() => {
    const baseVal = baseText.trim();
    const targetVal = targetText.trim();
    if (!baseVal || !targetVal) return;

    // JSON 유효성 체크 (텍스트 모드 고정)
    const okBase = isJsonValid(baseVal, "base");
    const okTarget = isJsonValid(targetVal, "target");
    if (!okBase || !okTarget) return;
    setError(null);

    if (compareTimer.current) window.clearTimeout(compareTimer.current);
    compareTimer.current = window.setTimeout(() => {
      void runCompare();
    }, 400);

    return () => {
      if (compareTimer.current) window.clearTimeout(compareTimer.current);
    };
  }, [baseLocale, targetLocale, baseText, targetText]);

  const sortObject = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(sortObject);
    if (obj && typeof obj === "object") {
      return Object.keys(obj)
        .sort()
        .reduce(
          (acc, key) => {
            acc[key] = sortObject(obj[key]);
            return acc;
          },
          {} as Record<string, any>,
        );
    }
    return obj;
  };

  const beautifyLocale = (role: "base" | "target") => {
    const raw = normalizeQuotes(role === "base" ? baseText : targetText);
    try {
      const parsed = JSON.parse(raw);
      const sorted = sortObject(parsed);
      const pretty = JSON.stringify(sorted, null, 2);
      if (role === "base") {
        setBaseText(pretty);
        setFormattedBase(true);
        setBaseError(null);
      } else {
        setTargetText(pretty);
        setFormattedTarget(true);
        setTargetError(null);
      }
    } catch (err) {
      if (role === "base") setBaseError(String(err));
      else setTargetError(String(err));
    }
  };

  const copyLocale = async (role: "base" | "target") => {
    const text = role === "base" ? baseText : targetText;
    await copyWithToast(text, toast);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className="eyebrow">i18n Inspector</p>
          <h1>텍스트 비교 뷰</h1>
        </div>
        <div className={styles.row}>
          <Button variant="ghost" onClick={pickRoot} disabled={loading}>
            폴더 선택
          </Button>
        </div>
      </header>

      <div className={styles.card}>
        <p className="micro subtle">
          텍스트를 직접 입력하거나 각 패널의 파일 버튼으로 JSON을 불러와 바로
          비교합니다. 폴더 선택은 필요 시 네임스페이스 구조를 읽어올 때만
          사용하세요 (예: locales/en/common.json).
        </p>
        <div className={styles.errorSlot}>
          {error && <span className="micro warning">{error}</span>}
        </div>
      </div>

      <div className={styles.editorGrid}>
        {[
          { label: "base", locale: baseLocale, text: baseText },
          { label: "target", locale: targetLocale, text: targetText },
        ].map(({ label, locale, text }, idx) => (
          <div
            key={label}
            className={`${styles.card} ${
              (idx === 0 && formattedBase) || (idx === 1 && formattedTarget)
                ? styles.formattedPanel
                : ""
            }`}
          >
            <div className={styles.cardHeader}>
              <p className={styles.label}>{label}</p>
              <div className={styles.row}>
                <select
                  className={styles.select}
                  value={locale}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (idx === 0) setBaseLocale(val);
                    else setTargetLocale(val);
                  }}
                >
                  {localeOptions.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  className={styles.noWrap}
                  onClick={() => handleFileLoad(idx === 0 ? "base" : "target")}
                >
                  파일
                </Button>
              </div>
            </div>
            <ScrollArea maxHeight={700}>
              <textarea
                className={styles.textarea}
                rows={Math.max(12, text.split(/\n/).length + 2)}
                value={text}
                onChange={(e) => {
                  const nextVal = e.target.value;
                  if (idx === 0) {
                    setBaseText(nextVal);
                    setFormattedBase(false);
                    setBaseError(null);
                    setError(null);
                    autoDetectLocale(normalizeQuotes(nextVal), "base");
                  } else {
                    setTargetText(nextVal);
                    setFormattedTarget(false);
                    setTargetError(null);
                    setError(null);
                    autoDetectLocale(normalizeQuotes(nextVal), "target");
                  }
                }}
                placeholder='{"common":{"hello":"Hello"}}'
              />
            </ScrollArea>
            <div className={styles.paneActions}>
              <Button
                variant="ghost"
                onClick={() => beautifyLocale(idx === 0 ? "base" : "target")}
              >
                Beautify (정렬)
              </Button>
              <Button
                variant="ghost"
                onClick={() => copyLocale(idx === 0 ? "base" : "target")}
              >
                복사
              </Button>
              {(idx === 0 ? formattedBase : formattedTarget) && (
                <span className={`${styles.badge} ${styles.badgeAccent}`}>
                  정렬됨
                </span>
              )}
              <div className={styles.errorSlot}>
                {(idx === 0 ? baseError : targetError) && (
                  <span className="micro warning">
                    {idx === 0 ? baseError : targetError}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {result && (
        <div className={styles.card}>
          <p className="micro">
            로케일 {result.locales.join(", ")} · 네임스페이스{" "}
            {result.namespaces.join(", ")}
          </p>
          <ScrollArea maxHeight={420}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Status</th>
                  <th>Base</th>
                  <th>Target</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {byLocale[targetLocale]?.map((item) => (
                  <tr key={`${item.key}-${item.targetLocale}`}>
                    <td>
                      <div>{item.key}</div>
                      <p className={styles.muted}>{item.namespace}</p>
                    </td>
                    <td>
                      <span
                        className={`${styles.status} ${styles[`status${item.status}`] || ""}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>{item.baseValue ?? "-"}</td>
                    <td>{item.targetValue ?? "-"}</td>
                    <td>
                      {item.notes?.map((n, idx) => (
                        <p key={idx} className={styles.notes}>
                          {n}
                        </p>
                      ))}
                      {item.detectedLang && (
                        <span className={styles.badge}>
                          감지: {item.detectedLang} / 기대:{" "}
                          {item.expectedLang ?? "-"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
