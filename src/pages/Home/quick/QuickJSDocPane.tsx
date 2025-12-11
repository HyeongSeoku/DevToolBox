import { useState } from "react";

import { generateJSDoc } from "@/modules/jsdoc/generator";
import { parseInterfaces } from "@/modules/jsdoc/parser";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/Button";
import { copyWithToast } from "@/utils/clipboard";

import styles from "./QuickJSDocPane.module.scss";

export function QuickJSDocPane() {
  const [input, setInput] = useState(
    `interface Props {\n  name: string;\n  age?: number;\n}`,
  );
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const toast = useToast();

  const generate = () => {
    try {
      const parsed = parseInterfaces(input);
      const code = generateJSDoc(parsed, {
        mode: "typedef",
        rootName: "Props",
        rootParam: "props",
        simplifyTypes: true,
        autoDescription: true,
        detectSetter: true,
      });
      setOutput(code);
      setError("");
    } catch (err) {
      setError(String(err));
      setOutput("");
    }
  };

  return (
    <div className={styles.pane}>
      <div className={styles.paneHeader}>
        <p className={styles.title}>JSDoc Generator</p>
        <p className="subtle">간단한 인터페이스 → JSDoc</p>
      </div>
      <textarea
        className={styles.textarea}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <div className={styles.paneActions}>
        <Button variant="primary" onClick={generate}>
          생성
        </Button>
        <Button variant="ghost" onClick={() => copyWithToast(output || "", toast)}>
          복사
        </Button>
      </div>
      {error && <p className="micro warning">{error}</p>}
      {output && <pre className={styles.code}>{output}</pre>}
    </div>
  );
}
