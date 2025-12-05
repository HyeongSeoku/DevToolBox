import { useState } from "react";

import { decodeFirstJwt } from "@/utils/jwt";

import styles from "./QuickJwtPane.module.scss";

export function QuickJwtPane() {
  const [token, setToken] = useState("");
  const [payload, setPayload] = useState<string>("");
  const [error, setError] = useState<string>("");

  const decode = () => {
    const result = decodeFirstJwt(token, { maskSensitive: true });
    if (result.error) {
      setError(result.error);
      setPayload("");
      return;
    }
    setPayload(result.payloadPretty);
    setError("");
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
