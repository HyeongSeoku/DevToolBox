import { useEffect, useMemo, useRef, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { join } from "@tauri-apps/api/path";
import { readDir, readTextFile } from "@tauri-apps/plugin-fs";

import { ScrollArea } from "@/components/ui/ScrollArea";

import styles from "./index.module.scss";
import {
  type I18nKeyStatus,
  type LocalePattern,
  type ScanResult,
} from "./types";
import {
  compareLocales,
  detectLanguage,
  extractLocaleInfo,
  flattenJson,
  groupScanResult,
} from "./utils";

type TranslateMode = "file" | "text" | "mixed";

const normalizeQuotes = (text: string) =>
  text.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

export function I18nInspectorPage() {
  const [pattern, setPattern] = useState<LocalePattern>("flat");
  const [mode, setMode] = useState<TranslateMode>("text");
  const [baseLocale, setBaseLocale] = useState("en");
  const [targetLocale, setTargetLocale] = useState("ko");
  const [root, setRoot] = useState("");
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

  const walk = async (dir: string): Promise<string[]> => {
    const stack = [dir];
    const files: string[] = [];
    while (stack.length) {
      const current = stack.pop() as string;
      const entries = await readDir(current);
      for (const entry of entries) {
        const full = await join(current, entry.name);
        if (entry.isDirectory) stack.push(full);
        else if (entry.isFile) files.push(full);
      }
    }
    return files;
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

      if (mode !== "text") {
        if (!root.trim()) {
          setError("폴더를 선택하세요.");
          setLoading(false);
          return;
        }
        const files = await walk(root.trim());
        for (const file of files) {
          const info = extractLocaleInfo(file, pattern);
          if (!info) continue;
          try {
            const text = await readTextFile(file);
            const json = JSON.parse(text);
            const flat = flattenJson(json);
            Object.entries(flat).forEach(([key, value]) => {
              flattened.push({
                locale: info.locale,
                namespace: info.namespace,
                key,
                value,
                path: file,
              });
            });
          } catch (err) {
            setError(`JSON 파싱 실패 (${file}): ${err}`);
          }
        }
      }

      if (mode !== "file") {
        flattened.push(...parseTextEntries());
      }

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

  const modeOptions: Array<{ key: TranslateMode; label: string; desc: string }> = [
    { key: "text", label: "텍스트 입력", desc: "붙여넣기/직접 입력" },
    { key: "file", label: "폴더 스캔", desc: "로케일 폴더에서 읽기" },
    { key: "mixed", label: "혼합 비교", desc: "파일 + 텍스트" },
  ];

  const patternOptions: Array<{ key: LocalePattern; label: string; desc: string }> = [
    { key: "flat", label: "단일 파일", desc: "root/<locale>.json" },
    { key: "namespace", label: "네임스페이스", desc: "root/<locale>/<ns>.json" },
  ];

  useEffect(() => {
    const baseVal = baseText.trim();
    const targetVal = targetText.trim();
    const hasRoot = root.trim().length > 0;

    const needsText = mode !== "file";
    const needsRoot = mode !== "text";

    if (needsRoot && !hasRoot) return;
    if (needsText && (!baseVal || !targetVal)) return;

    // JSON 유효성 체크 (텍스트가 필요한 모드에만)
    if (needsText) {
      const okBase = isJsonValid(baseVal, "base");
      const okTarget = isJsonValid(targetVal, "target");
      if (!okBase || !okTarget) return;
    } else {
      setBaseError(null);
      setTargetError(null);
    }
    setError(null);

    if (compareTimer.current) window.clearTimeout(compareTimer.current);
    compareTimer.current = window.setTimeout(() => {
      void runCompare();
    }, 400);

    return () => {
      if (compareTimer.current) window.clearTimeout(compareTimer.current);
    };
  }, [mode, pattern, root, baseLocale, targetLocale, baseText, targetText]);

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
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore clipboard errors silently
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className="eyebrow">i18n Inspector</p>
          <h1>텍스트 비교 뷰</h1>
        </div>
        <div className={styles.row}>
          <button className="ghost" onClick={pickRoot} disabled={loading}>
            폴더 선택
          </button>
        </div>
      </header>

      <div className={styles.card}>
        <div className={styles.row}>
          <div className={styles.pillRow}>
            {modeOptions.map((opt) => (
              <button
                key={opt.key}
                className={`${styles.pill} ${mode === opt.key ? styles.pillActive : ""}`}
                onClick={() => setMode(opt.key)}
              >
                <span className={styles.pillTitle}>{opt.label}</span>
                <span className={styles.pillDesc}>{opt.desc}</span>
              </button>
            ))}
          </div>
          <div className={styles.pillRow}>
            {patternOptions.map((opt) => (
              <button
                key={opt.key}
                className={`${styles.pill} ${pattern === opt.key ? styles.pillActive : ""}`}
                onClick={() => setPattern(opt.key)}
              >
                <span className={styles.pillTitle}>{opt.label}</span>
                <span className={styles.pillDesc}>{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <p className="micro subtle">
          {mode === "text" && "텍스트만 붙여넣어 비교합니다."}
          {mode === "file" && "선택한 폴더에서 로케일 JSON을 읽어 비교합니다."}
          {mode === "mixed" && "폴더에서 읽은 값과 텍스트 입력을 함께 비교합니다."} · 구조:{" "}
          {pattern === "flat"
            ? "단일 파일 (locale.json)"
            : "네임스페이스 (locale/namespace.json)"}
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
                <button
                  className={`ghost ${styles.noWrap}`}
                  onClick={() => handleFileLoad(idx === 0 ? "base" : "target")}
                >
                  파일
                </button>
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
              <button
                className="ghost"
                onClick={() => beautifyLocale(idx === 0 ? "base" : "target")}
              >
                Beautify (정렬)
              </button>
              <button
                className="ghost"
                onClick={() => copyLocale(idx === 0 ? "base" : "target")}
              >
                복사
              </button>
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
