import { useState } from "react";

import styles from "../index.module.scss";

export function QuickTextPane() {
  const [value, setValue] = useState("");
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore clipboard error
    }
  };

  return (
    <div className={styles.pane}>
      <div className={styles.paneHeader}>
        <p className={styles.title}>텍스트 변환</p>
        <p className="subtle">대문자/소문자·트림·클립보드 복사</p>
      </div>
      <textarea
        className={styles.textarea}
        placeholder="여기에 텍스트를 붙여넣기"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className={styles.paneActions}>
        <button className="ghost" onClick={() => setValue(value.toUpperCase())}>
          대문자
        </button>
        <button className="ghost" onClick={() => setValue(value.toLowerCase())}>
          소문자
        </button>
        <button className="ghost" onClick={() => setValue(value.trim())}>
          Trim
        </button>
        <button className="primary" onClick={() => handleCopy(value)}>
          복사
        </button>
      </div>
    </div>
  );
}
