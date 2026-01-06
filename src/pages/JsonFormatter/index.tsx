import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Select } from "@/components/ui/Select";
import { TextArea } from "@/components/ui/TextArea";
import { computePosition, formatJson } from "@/utils/jsonFormat";

import styles from "./index.module.scss";

export function JsonFormatterPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("{}");
  const [error, setError] = useState<string | null>(null);
  const [allowJsLike, setAllowJsLike] = useState(true);
  const [indent, setIndent] = useState<"2" | "4" | "tab">("2");
  const [sortAll, setSortAll] = useState(false);
  const indentOptions = [
    { value: "2", label: "2 spaces" },
    { value: "4", label: "4 spaces" },
    { value: "tab", label: "tab" },
  ];

  const formatWithInput = (
    nextInput: string,
    opts?: { minify?: boolean; sort?: boolean },
  ) => {
    try {
      const formatted = formatJson({
        input: nextInput,
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
      const pos = computePosition(nextInput, msg);
      setError(pos ? `${msg} (line ${pos.line}, col ${pos.col})` : msg);
      setOutput("");
    }
  };

  const format = (opts?: { minify?: boolean; sort?: boolean }) => {
    formatWithInput(input, opts);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.row}>
          <label className={styles.inline}>
            <span>들여쓰기</span>
            <Select
              value={indent}
              onChange={(next) => setIndent(next as "2" | "4" | "tab")}
              options={indentOptions}
              className={styles.select}
              ariaLabel="들여쓰기"
            />
          </label>
          <label className={styles.inline}>
            <Checkbox
              checked={allowJsLike}
              onChange={(e) => setAllowJsLike(e.target.checked)}
              label="JS 스타일 허용(단일따옴표, 트레일링콤마)"
            />
          </label>
          <label className={styles.inline}>
            <Checkbox
              checked={sortAll}
              onChange={(e) => setSortAll(e.target.checked)}
              label="키 정렬(재귀)"
            />
          </label>
          <Button
            variant="primary"
            className={styles.actionButton}
            onClick={() => format()}
          >
            Format
          </Button>
          <Button
            variant="ghost"
            className={styles.actionButton}
            onClick={() => format({ minify: true })}
          >
            Minify
          </Button>
          <Button
            variant="ghost"
            className={styles.actionButton}
            onClick={() => format({ sort: true })}
          >
            Sort
          </Button>
        </div>
        {error && <p className="micro warning">{error}</p>}
      </header>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <p className={styles.title}>입력</p>
            <p className="micro subtle">붙여넣기 시 자동 포맷</p>
          </div>
          <div className={styles.inputBody}>
            <TextArea
              className={styles.textarea}
              value={input}
              placeholder={`{
  "hello": "world",
  "foo": 1
}`}
              onChange={(e) => setInput(e.target.value)}
              onPaste={(event) => {
                const el = event.currentTarget;
                // 기본 붙여넣기를 그대로 두고, 직후 현재 값으로 포맷만 트리거
                setTimeout(() => {
                  const next = el.value;
                  setInput(next);
                  formatWithInput(next);
                }, 0);
              }}
              spellCheck={false}
              maxHeight="100%"
              scrollable
              wrapperClassName={styles.textareaScroll}
            />
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <p className={styles.title}>결과</p>

            <div className={styles.cardHeaderSubContainer}>
              <p className="micro subtle">포맷/미니파이/정렬 결과</p>
            </div>
          </div>
          <div className={styles.resultBody}>
            <CodeBlock
              className={styles.output}
              language="json"
              copyable
              maxHeight="100%"
            >
              {output}
            </CodeBlock>
          </div>
        </div>
      </div>
    </div>
  );
}
