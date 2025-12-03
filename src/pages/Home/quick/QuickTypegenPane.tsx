import { useState } from "react";

import { useToast } from "@/components/ToastProvider";
import styles from "../index.module.scss";

function inferJson(json: any): string {
  const lines: string[] = [];
  const indent = (lvl: number) => "  ".repeat(lvl);

  const render = (value: any, name: string, depth: number) => {
    if (Array.isArray(value)) {
      if (value.length === 0) return "any[]";
      const first = value[0];
      const child = render(first, `${name}Item`, depth + 1);
      return `${child}[]`;
    }
    if (value === null) return "any";
    const type = typeof value;
    if (type === "string") return "string";
    if (type === "number") return "number";
    if (type === "boolean") return "boolean";
    if (type !== "object") return "any";

    const ifaceName = depth === 0 ? name : `${name[0].toUpperCase()}${name.slice(1)}`;
    lines.push(`${indent(depth)}interface ${ifaceName} {`);
    Object.entries(value).forEach(([k, v]) => {
      const childType = render(v, k, depth + 1);
      lines.push(`${indent(depth + 1)}${k}: ${childType};`);
    });
    lines.push(`${indent(depth)}}`);
    return ifaceName;
  };

  render(json, "Root", 0);
  return lines.join("\n");
}

export function QuickTypegenPane() {
  const toast = useToast();
  const [input, setInput] = useState(
    `{"id":1,"name":"Alice","roles":["admin"],"profile":{"age":30,"active":true}}`,
  );
  const [output, setOutput] = useState<string>("");

  const generate = () => {
    try {
      const json = JSON.parse(input);
      const code = inferJson(json);
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
        <button className="ghost" onClick={() => navigator.clipboard.writeText(output)}>
          복사
        </button>
      </div>
      {output && <pre className={styles.code}>{output}</pre>}
    </div>
  );
}
