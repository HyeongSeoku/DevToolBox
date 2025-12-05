import { useMemo, useState } from "react";

import { ScrollArea } from "@/components/ui/ScrollArea";
import { computePosition, formatJson } from "@/utils/jsonFormat";

import styles from "./index.module.scss";

export function JsonFormatterPage() {
  const [input, setInput] = useState(
    "{\n  \"hello\": 'world',\n  foo: 1,\n}\n",
  );
  const [output, setOutput] = useState("{}");
  const [error, setError] = useState<string | null>(null);
  const [allowJsLike, setAllowJsLike] = useState(true);
  const [indent, setIndent] = useState<"2" | "4" | "tab">("2");
  const [sortAll, setSortAll] = useState(false);

  const indentValue = useMemo(() => {
    if (indent === "tab") return "\t";
    return Number(indent);
  }, [indent]);

  const format = (opts?: { minify?: boolean; sort?: boolean }) => {
    try {
      const formatted = formatJson({
        input,
        allowJsLike,
        minify: opts?.minify,
        sort: opts?.sort,
        sortRecursive: sortAll,
        indent,
      });
      setOutput(formatted);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const pos = computePosition(input, msg);
      setError(pos ? `${msg} (line ${pos.line}, col ${pos.col})` : msg);
      setOutput("");
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className="eyebrow">JSON Formatter</p>
          <h1>JSON 포맷 / 미니파이 / 검증</h1>
        </div>
        <div className={styles.row}>
          <label className={styles.inline}>
            <span>들여쓰기</span>
            <select
              value={indent}
              onChange={(e) => setIndent(e.target.value as any)}
            >
              <option value="2">2 spaces</option>
              <option value="4">4 spaces</option>
              <option value="tab">tab</option>
            </select>
          </label>
          <label className={styles.inline}>
            <input
              type="checkbox"
              checked={allowJsLike}
              onChange={(e) => setAllowJsLike(e.target.checked)}
            />
            JS 스타일 허용(단일따옴표, 트레일링콤마)
          </label>
          <label className={styles.inline}>
            <input
              type="checkbox"
              checked={sortAll}
              onChange={(e) => setSortAll(e.target.checked)}
            />
            키 정렬(재귀)
          </label>
          <button className="primary" onClick={() => format()}>
            Format
          </button>
          <button className="ghost" onClick={() => format({ minify: true })}>
            Minify
          </button>
          <button className="ghost" onClick={() => format({ sort: true })}>
            Beautify + Sort
          </button>
          <button
            className="ghost"
            onClick={() => navigator.clipboard.writeText(output || "")}
          >
            Copy
          </button>
        </div>
        {error && <p className="micro warning">{error}</p>}
      </header>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <p className={styles.title}>입력</p>
            <p className="micro subtle">붙여넣기 시 자동 포맷</p>
          </div>
          <ScrollArea className={styles.scrollArea}>
            <textarea
              className={styles.textarea}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={() => {
                // 기본 붙여넣기를 그대로 두고, 직후 현재 값으로 포맷만 트리거
                setTimeout(() => {
                  format();
                }, 0);
              }}
              spellCheck={false}
            />
          </ScrollArea>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <p className={styles.title}>결과</p>
            <p className="micro subtle">포맷/미니파이/정렬 결과</p>
          </div>
          <ScrollArea className={styles.scrollArea}>
            <pre className={styles.output}>{output}</pre>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
