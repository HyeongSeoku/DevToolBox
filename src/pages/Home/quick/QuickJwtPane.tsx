import { useState } from "react";

import styles from "../index.module.scss";

export function QuickJwtPane() {
  const [token, setToken] = useState("");
  const [payload, setPayload] = useState<string>("");
  const [error, setError] = useState<string>("");

  const decode = () => {
    try {
      const parts = token.split(".");
      if (parts.length < 2) throw new Error("형식이 올바르지 않습니다.");
      const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
      const parsed = JSON.parse(decodeURIComponent(escape(json)));
      setPayload(JSON.stringify(parsed, null, 2));
      setError("");
    } catch (err) {
      setError(String(err));
      setPayload("");
    }
  };

  return (
    <div className={styles.pane}>
      <div className={styles.paneHeader}>
        <p className={styles.title}>JWT 빠른 디코드</p>
        <p className="subtle">payload만 간단히 확인</p>
      </div>
      <textarea
        className={styles.textarea}
        placeholder="JWT 토큰을 붙여넣기"
        value={token}
        onChange={(e) => setToken(e.target.value)}
      />
      <div className={styles.paneActions}>
        <button className="primary" onClick={decode}>
          디코드
        </button>
        {error && <p className="micro warning">{error}</p>}
        {payload && <pre className={styles.code}>{payload}</pre>}
      </div>
    </div>
  );
}
