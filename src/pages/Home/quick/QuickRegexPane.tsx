import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { runRegex } from "@/utils/regex";

import styles from "./QuickRegexPane.module.scss";

export function QuickRegexPane() {
  const [pattern, setPattern] = useState("");
  const [text, setText] = useState("");
  const [result, setResult] = useState<string>("");

  const regexResult = useMemo(() => {
    if (!pattern) return null;
    return runRegex(pattern, "g", text);
  }, [pattern, text]);

  const run = () => {
    if (!pattern) {
      setResult("패턴을 입력하세요.");
      return;
    }
    if (regexResult?.error) {
      setResult(`오류: ${regexResult.error}`);
      return;
    }
    if (!regexResult) {
      setResult("패턴을 입력하세요.");
      return;
    }
    const matches = regexResult.matches.map((m) => m.match).filter(Boolean);
    setResult(matches.length ? matches.join(", ") : "일치 없음");
  };

  return (
    <div className={styles.pane}>
      <div className={styles.paneHeader}>
        <p className={styles.title}>빠른 Regex 테스트</p>
        <p className="subtle">g 플래그 기본 적용</p>
      </div>
      <Input
        className={styles.input}
        placeholder="패턴 (예: foo\\d+)"
        value={pattern}
        onChange={(e) => setPattern(e.target.value)}
      />
      <textarea
        className={styles.textarea}
        placeholder="대상 텍스트"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className={styles.paneActions}>
        <Button variant="primary" onClick={run}>
          실행
        </Button>
        {result && <p className="micro">{result}</p>}
      </div>
    </div>
  );
}
