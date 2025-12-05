import { useMemo, useState } from "react";

import { useToast } from "@/components/ToastProvider";
import { copyWithToast } from "@/utils/clipboard";
import { useVaultStore } from "@/stores/useVaultStore";
import {
  commonRegexSnippets,
  runRegex,
  type RegexSnippet,
} from "@/utils/regex";

import styles from "./index.module.scss";

type FlagKey = "g" | "i" | "m" | "s" | "u";

const HISTORY_PATH = "history/regex-tester";
const CUSTOM_SNIPPETS_KEY = "regex-custom-snippets";
const flagDescriptions: Record<FlagKey, string> = {
  g: "global: 모든 매칭을 찾습니다.",
  i: "ignore-case: 대소문자 무시",
  m: "multiline: ^, $가 줄 단위로 동작",
  s: "dotAll: .이 줄바꿈도 포함",
  u: "unicode: 유니코드 모드",
};

export function RegexTesterPage() {
  const toast = useToast();
  const vault = useVaultStore();
  const [pattern, setPattern] = useState(
    "([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})",
  );
  const [flags, setFlags] = useState<FlagKey[]>(["g"]);
  const [text, setText] = useState(
    "contact: hello@example.com\nsupport@example.org",
  );
  const [replace, setReplace] = useState<string>("");
  const [useReplace, setUseReplace] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState<RegexSnippet | null>(
    null,
  );
  const [snippetCategory, setSnippetCategory] = useState<
    "all" | "frontend" | "backend" | "common" | "custom"
  >("all");
  const [hoverFlag, setHoverFlag] = useState<FlagKey | null>(null);
  const [tooltipFlag, setTooltipFlag] = useState<FlagKey | null>(null);
  const [timerId, setTimerId] = useState<number | null>(null);
  const [customSnippets, setCustomSnippets] = useState<RegexSnippet[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(CUSTOM_SNIPPETS_KEY);
      return raw ? (JSON.parse(raw) as RegexSnippet[]) : [];
    } catch {
      return [];
    }
  });
  const [customTitle, setCustomTitle] = useState("");
  const [customPattern, setCustomPattern] = useState("");
  const [customFlags, setCustomFlags] = useState("");
  const [customDescription, setCustomDescription] = useState("");

  const flagString = useMemo(() => flags.join(""), [flags]);

  const result = useMemo(
    () => runRegex(pattern, flagString, text, useReplace ? replace : undefined),
    [pattern, flagString, text, replace, useReplace],
  );

  const toggleFlag = (f: FlagKey) => {
    setFlags((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );
  };

  const handleFlagEnter = (f: FlagKey) => {
    setHoverFlag(f);
    if (timerId) {
      clearTimeout(timerId);
    }
    const id = window.setTimeout(() => setTooltipFlag(f), 800);
    setTimerId(id);
  };

  const handleFlagLeave = () => {
    setHoverFlag(null);
    if (timerId) clearTimeout(timerId);
    setTimerId(null);
    setTooltipFlag(null);
  };

  const applySnippet = (snippet: RegexSnippet) => {
    setSelectedSnippet(snippet);
    setPattern(snippet.pattern);
    if (snippet.replace !== undefined) {
      setUseReplace(true);
      setReplace(typeof snippet.replace === "string" ? snippet.replace : "");
    }
  };

  const filteredSnippets = useMemo(
    () =>
      (snippetCategory === "all"
        ? [...customSnippets, ...commonRegexSnippets]
        : snippetCategory === "custom"
          ? customSnippets
          : [...customSnippets, ...commonRegexSnippets].filter(
              (s) =>
                s.category === snippetCategory ||
                (!s.category && snippetCategory === "common"),
            )) satisfies RegexSnippet[],
    [snippetCategory, customSnippets],
  );

  const saveHistory = async () => {
    try {
      const filename = `${HISTORY_PATH}/${Date.now()}.json`;
      await vault.writeFile(
        filename,
        JSON.stringify(
          {
            pattern,
            flags: flagString,
            replace: useReplace ? replace : "",
            text,
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
        <p className="eyebrow">Regex Tester</p>
        <h1>정규식 테스트 · Replace 프리뷰 · 스니펫</h1>
        <p className="micro">
          패턴/플래그를 조합하고 결과/치환 미리보기를 확인하세요. 로컬 Vault에
          기록을 저장할 수 있습니다.
        </p>
      </header>

      <section className={styles.grid}>
        <div className={styles.card}>
          <label className={styles.label}>패턴</label>
          <input
            className={styles.input}
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
          />
          <p className={styles.patternPreview}>
            /{pattern}/{flagString || " "}
          </p>

          <div className={styles.flags}>
            {(["g", "i", "m", "s", "u"] as FlagKey[]).map((f) => (
              <button
                key={f}
                className={`${styles.button} ${styles.flag} ${flags.includes(f) ? styles.active : ""}`}
                onClick={() => toggleFlag(f)}
                onMouseEnter={() => handleFlagEnter(f)}
                onMouseLeave={handleFlagLeave}
              >
                {f}
              </button>
            ))}

            {tooltipFlag && (
              <div className={styles.tooltip}>
                {tooltipFlag.toUpperCase()}: {flagDescriptions[tooltipFlag]}
              </div>
            )}
          </div>
          <p className="micro">
            JS 테스트 예)
            <code>
              const regex = new RegExp(pattern, flags); regex.test(text);
            </code>
          </p>

          <label className={styles.label}>대상 텍스트</label>
          <textarea
            className={styles.textarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div className={styles.replaceRow}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={useReplace}
                onChange={(e) => setUseReplace(e.target.checked)}
              />
              Replace 프리뷰
            </label>
            <input
              className={styles.input}
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              placeholder="$1, $<name> 사용 가능"
              disabled={!useReplace}
            />
            <button
              className={`${styles.button} ${styles.ghost}`}
              onClick={() => copyWithToast(pattern, toast)}
            >
              패턴 복사
            </button>
            <button
              className={`${styles.button} ${styles.ghost}`}
              onClick={saveHistory}
            >
              Vault 저장
            </button>
          </div>

          <div className={styles.snippets}>
            <p className={styles.label}>스니펫</p>
            <div className={styles.tabRow}>
              {(
                ["all", "frontend", "backend", "common", "custom"] as const
              ).map((cat) => (
                <button
                  key={cat}
                  className={`${styles.button} ${styles.tab} ${snippetCategory === cat ? styles.active : ""}`}
                  onClick={() => setSnippetCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className={styles.snippetList}>
              {filteredSnippets.map((s) => (
                <button
                  key={s.key}
                  className={`${styles.button} ${styles.snippet} ${selectedSnippet?.key === s.key ? styles.active : ""}`}
                  onClick={() => applySnippet(s)}
                >
                  <span className={styles.snippetTitle}>{s.title}</span>
                  <span className={styles.snippetPattern}>{s.pattern}</span>
                  {s.description && (
                    <span className={styles.snippetDesc}>{s.description}</span>
                  )}
                </button>
              ))}
            </div>
            <div className={styles.customForm}>
              <p className={styles.label}>커스텀 스니펫 추가</p>
              <div className={styles.customRow}>
                <input
                  className={styles.input}
                  placeholder="제목"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                />
                <input
                  className={styles.input}
                  placeholder="플래그 (예: gim)"
                  value={customFlags}
                  onChange={(e) => setCustomFlags(e.target.value)}
                />
              </div>
              <textarea
                className={styles.textarea}
                placeholder="패턴 (정규식 본문)"
                value={customPattern}
                onChange={(e) => setCustomPattern(e.target.value)}
              />
              <input
                className={styles.input}
                placeholder="설명 (선택)"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
              />
              <button
                className={`${styles.button} ${styles.ghost}`}
                onClick={() => {
                  if (!customTitle || !customPattern) return;
                  const snippet: RegexSnippet = {
                    key: `custom-${Date.now()}`,
                    title: customTitle,
                    pattern: customPattern,
                    flags: customFlags || undefined,
                    description: customDescription || undefined,
                    category: "custom",
                  };
                  setCustomSnippets((prev) => {
                    const next = [snippet, ...prev].slice(0, 50);
                    if (typeof window !== "undefined") {
                      window.localStorage.setItem(
                        CUSTOM_SNIPPETS_KEY,
                        JSON.stringify(next),
                      );
                    }
                    return next;
                  });
                  setCustomTitle("");
                  setCustomPattern("");
                  setCustomFlags("");
                  setCustomDescription("");
                  toast.show("커스텀 스니펫을 저장했습니다.", {
                    type: "success",
                  });
                }}
              >
                추가
              </button>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.row}>
            <p className={styles.label}>매칭 결과 ({result.matches.length})</p>
            {result.error && (
              <span className={styles.error}>{result.error}</span>
            )}
          </div>
          {!result.matches.length && !result.error && (
            <p className="subtle">매칭 없음</p>
          )}
          <div className={styles.matchList}>
            {result.matches.map((m, idx) => (
              <div key={`${m.index}-${idx}`} className={styles.matchItem}>
                <div className={styles.matchHeader}>
                  <span className={styles.badge}>idx {m.index}</span>
                  <span className={styles.matchValue}>{m.match}</span>
                </div>
                {Object.keys(m.groups).length > 0 && (
                  <div className={styles.groups}>
                    {Object.entries(m.groups).map(([k, v]) => (
                      <div key={k} className={styles.group}>
                        <span className={styles.groupKey}>{k}</span>
                        <span className={styles.groupValue}>{v ?? ""}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {useReplace && (
            <div className={styles.replacePreview}>
              <p className={styles.label}>Replace Preview</p>
              <pre className={styles.pre}>
                {result.replaced ?? "// replace 실패"}
              </pre>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
