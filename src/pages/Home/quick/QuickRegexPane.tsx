import { useState } from "react";

import styles from "../index.module.scss";

export function QuickRegexPane() {
  const [pattern, setPattern] = useState("");
  const [text, setText] = useState("");
  const [result, setResult] = useState<string>("");

  const run = () => {
    try {
      const regex = new RegExp(pattern, "g");
      const matches = [...text.matchAll(regex)].map((m) => m[0]);
      setResult(matches.length ? matches.join(", ") : "일치 없음");
    } catch (err) {
      setResult(`오류: ${err}`);
    }
  };

  return (
    <div className={styles.pane}>
      <div className={styles.paneHeader}>
        <p className={styles.title}>빠른 Regex 테스트</p>
        <p className="subtle">g 플래그 기본 적용</p>
      </div>
      <input
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
        <button className="primary" onClick={run}>
          실행
        </button>
        {result && <p className="micro">{result}</p>}
      </div>
    </div>
  );
}
