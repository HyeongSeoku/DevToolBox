import { useState } from "react";

import { useToast } from "@/components/ToastProvider";
import { copyWithToast } from "@/utils/clipboard";
import { generateInterfaces } from "@/utils/typegen";

import styles from "./QuickTypegenPane.module.scss";

export function QuickTypegenPane() {
  const toast = useToast();
  const [input, setInput] = useState(
    `{"id":1,"name":"Alice","roles":["admin"],"profile":{"age":30,"active":true}}`,
  );
  const [output, setOutput] = useState<string>("");

  const generate = () => {
    try {
      const json = JSON.parse(input);
      const code = generateInterfaces(json, "Root");
      setOutput(code);
      toast.show("타입 생성 완료", { type: "success" });
    } catch (err) {
      const msg = `JSON 파싱 실패: ${err}`;
      setOutput(msg);
      toast.show(msg, { type: "error" });
    }
  };

  return (
    <div className={styles.pane}>
      <div className={styles.paneHeader}>
        <p className={styles.title}>API 타입 생성</p>
        <p className="subtle">JSON 샘플 → TS 인터페이스</p>
      </div>
      <textarea
        className={styles.textarea}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <div className={styles.paneActions}>
        <button className="primary" onClick={generate}>
          타입 생성
        </button>
        <button
          className="ghost"
          onClick={() => copyWithToast(output, toast)}
        >
          복사
        </button>
      </div>
      {output && <pre className={styles.code}>{output}</pre>}
    </div>
  );
}
