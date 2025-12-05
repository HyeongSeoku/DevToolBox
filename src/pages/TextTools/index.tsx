import { useEffect, useMemo, useState } from "react";

import styles from "./index.module.scss";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ToastProvider";
import { copyWithToast } from "@/utils/clipboard";
import { useVaultStore } from "@/stores/useVaultStore";
import {
  generateCaseVariants,
  guessDominantCase,
  processLines,
  splitWords,
  type CaseStyle,
} from "@/utils/textTransform";

const defaultSample = `user_id
user_name
created_at
updated_at`;

const delimitersPreset = [" ", "_", "-", ".", "/"];

export function TextToolsPage() {
  const toast = useToast();
  const vault = useVaultStore();
  const [input, setInput] = useState(defaultSample);
  const [targetCase, setTargetCase] = useState<CaseStyle>("camel");
  const [delimiters, setDelimiters] = useState<string[]>(delimitersPreset);
  const [splitNumbers, setSplitNumbers] = useState(false);
  const [trim, setTrim] = useState(true);
  const [skipEmpty, setSkipEmpty] = useState(true);
  const [joinMode, setJoinMode] = useState<"lines" | "one">("lines");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [wrapTemplate, setWrapTemplate] = useState("{{text}}");
  const [useDatePrefix, setUseDatePrefix] = useState(false);
  const [numbering, setNumbering] = useState<
    "numeric" | "padded" | "alpha" | null
  >(null);
  const [numberWidth, setNumberWidth] = useState(3);
  const [dedupe, setDedupe] = useState(false);
  const [uppercaseSplit, setUppercaseSplit] = useState(true);
  const [customDelimiter, setCustomDelimiter] = useState("");

  const lines = useMemo(() => input.split(/\r?\n/), [input]);
  const guessed = useMemo(() => guessDominantCase(lines), [lines]);
  const showGuessStrong =
    guessed.confidence >= 0.7 && guessed.style !== "unknown";

  const splitOptions = useMemo(
    () => ({
      delimiters,
      splitNumbers,
      uppercaseAcronyms: uppercaseSplit,
    }),
    [delimiters, splitNumbers, uppercaseSplit],
  );

  const baseWords = useMemo(() => {
    const firstLine = lines.find((l) => l.trim());
    return firstLine ? splitWords(firstLine, splitOptions) : [];
  }, [lines, splitOptions]);

  const variants = useMemo(() => generateCaseVariants(baseWords), [baseWords]);

  const processed = useMemo(
    () =>
      processLines(input, {
        trim,
        skipEmpty,
        prefix: prefix || undefined,
        suffix: suffix || undefined,
        wrapTemplate: wrapTemplate || undefined,
        datePrefix: useDatePrefix,
        numbering,
        numberWidth,
        joinMode,
        targetCase,
        dedupe,
        splitOptions,
      }),
    [
      dedupe,
      splitOptions,
      input,
      joinMode,
      numbering,
      numberWidth,
      prefix,
      skipEmpty,
      suffix,
      targetCase,
      trim,
      wrapTemplate,
      useDatePrefix,
    ],
  );

  const handleCopy = async () =>
    copyWithToast(processed.combined, toast, { success: "복사 완료" });

  const handleSave = async () => {
    try {
      const filename = `history/text-convert/${new Date()
        .toISOString()
        .slice(0, 10)}-${Date.now()}.txt`;
      await vault.writeFile(filename, processed.combined);
      toast.show("Vault에 저장했습니다.", { type: "success" });
    } catch {
      toast.show("Vault 저장 실패: 설정을 확인하세요.", { type: "error" });
    }
  };

  useEffect(() => {
    if (targetCase === "unknown" && guessed.style !== "unknown") {
      setTargetCase(guessed.style);
    }
  }, [guessed.style, targetCase]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className="eyebrow">텍스트 변환기</p>
        <h1>케이스 변환 · Prefix/Suffix · 라인 처리</h1>
        <p className="micro">
          snake, camel, kebab 등 다양한 케이스로 변환하고 줄 단위 파이프라인을
          적용합니다.
        </p>
      </header>

      <section className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.row}>
            <label className={styles.label}>입력</label>
            <Button
              variant="ghost"
              onClick={() => {
                setInput("");
              }}
            >
              지우기
            </Button>
          </div>
          <textarea
            className={styles.textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          <div className={styles.inline}>
            <div>
              <p className={styles.label}>현재 케이스 추정</p>
              <p className={styles.subtle}>
                {guessed.style} · {(guessed.confidence * 100).toFixed(0)}%
                {showGuessStrong ? " (70% 이상 매칭)" : ""}
              </p>
            </div>
            <div>
              <p className={styles.label}>타겟 케이스</p>
              <select
                value={targetCase}
                onChange={(e) => setTargetCase(e.target.value as CaseStyle)}
              >
                <option value="camel">camelCase</option>
                <option value="pascal">PascalCase</option>
                <option value="snake">snake_case</option>
                <option value="screaming-snake">SCREAMING_SNAKE_CASE</option>
                <option value="kebab">kebab-case</option>
                <option value="train">Train-Case</option>
                <option value="dot">dot.case</option>
                <option value="space">space separated</option>
                <option value="upper">UPPER</option>
                <option value="lower">lower</option>
                <option value="title">Title Case</option>
                <option value="sentence">sentence case</option>
              </select>
            </div>
          </div>

          <div className={styles.inline}>
            <div>
              <p className={styles.label}>Prefix</p>
              <input
                className={styles.input}
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
              />
            </div>
            <div>
              <p className={styles.label}>Suffix</p>
              <input
                className={styles.input}
                value={suffix}
                onChange={(e) => setSuffix(e.target.value)}
              />
            </div>
            <div>
              <p className={styles.label}>번호 붙이기</p>
              <select
                value={numbering ?? ""}
                onChange={(e) =>
                  setNumbering(
                    e.target.value
                      ? (e.target.value as "numeric" | "padded" | "alpha")
                      : null,
                  )
                }
              >
                <option value="">없음</option>
                <option value="numeric">1. 2. 3.</option>
                <option value="padded">001. 002.</option>
                <option value="alpha">A. B. C.</option>
              </select>
            </div>
            {numbering === "padded" && (
              <div>
                <p className={styles.label}>패딩 길이</p>
                <input
                  className={styles.input}
                  type="number"
                  min={2}
                  value={numberWidth}
                  onChange={(e) => setNumberWidth(Number(e.target.value))}
                />
              </div>
            )}
          </div>

          <div className={styles.inline}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={trim}
                onChange={(e) => setTrim(e.target.checked)}
              />
              좌우 공백 제거
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={skipEmpty}
                onChange={(e) => setSkipEmpty(e.target.checked)}
              />
              빈 줄 스킵
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={dedupe}
                onChange={(e) => setDedupe(e.target.checked)}
              />
              중복 제거
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={uppercaseSplit}
                onChange={(e) => setUppercaseSplit(e.target.checked)}
              />
              대문자 묶음 분리(HTTPServer → http-server)
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={useDatePrefix}
                onChange={(e) => setUseDatePrefix(e.target.checked)}
              />
              날짜 프리픽스(YYYYMMDD_)
            </label>
          </div>

          <div>
            <p className={styles.label}>Wrap 템플릿 ({"{{text}}"} 치환)</p>
            <input
              className={styles.input}
              value={wrapTemplate}
              onChange={(e) => setWrapTemplate(e.target.value)}
            />
          </div>

          <div className={styles.inline}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={splitNumbers}
                onChange={(e) => setSplitNumbers(e.target.checked)}
              />
              숫자 앞뒤 분리
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={joinMode === "one"}
                onChange={(e) =>
                  setJoinMode(e.target.checked ? "one" : "lines")
                }
              />
              결과를 한 줄로 합치기
            </label>
          </div>

          <div className={styles.delimiterRow}>
            <p className={styles.label}>구분자</p>
            {delimitersPreset.map((delim) => (
              <label key={delim} className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={delimiters.includes(delim)}
                  onChange={(e) => {
                    setDelimiters((prev) =>
                      e.target.checked
                        ? Array.from(new Set([...prev, delim]))
                        : prev.filter((d) => d !== delim),
                    );
                  }}
                />
                {delim === " " ? "[space]" : delim}
              </label>
            ))}
            <div className={styles.inline}>
              <input
                className={styles.input}
                placeholder="커스텀 구분자 추가"
                value={customDelimiter}
                onChange={(e) => setCustomDelimiter(e.target.value)}
              />
              <button
                className="ghost"
                onClick={() => {
                  const value = customDelimiter.trim();
                  if (!value) return;
                  setDelimiters((prev) =>
                    Array.from(new Set([...prev, value])),
                  );
                  setCustomDelimiter("");
                }}
              >
                추가
              </button>
            </div>
            <div className={styles.activeDelims}>
              {delimiters.map((d) => (
                <button
                  key={d || "space"}
                  className={styles.delimChip}
                  onClick={() =>
                    setDelimiters((prev) => prev.filter((item) => item !== d))
                  }
                  title="클릭하면 제거"
                >
                  {d === " " ? "[space]" : d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.row}>
            <p className={styles.label}>결과</p>
            <div className={styles.inlineActions}>
              <Button className={styles.button} onClick={handleCopy}>
                Copy
              </Button>
              <Button className={styles.button} onClick={handleSave}>
                Vault 저장
              </Button>
            </div>
          </div>
          <div className={styles.variants}>
            {Object.entries(variants).map(([style, value]) => (
              <button
                key={style}
                className={styles.variant}
                onClick={() => copyWithToast(value, toast)}
              >
                <span className={styles.variantLabel}>{style}</span>
                <span className={styles.variantValue}>{value}</span>
              </button>
            ))}
          </div>
          <pre className={styles.result}>{processed.combined}</pre>
          {joinMode === "lines" && (
            <div className={styles.lineList}>
              {processed.lines.map((line, idx) => (
                <div key={`${line}-${idx}`} className={styles.lineItem}>
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
