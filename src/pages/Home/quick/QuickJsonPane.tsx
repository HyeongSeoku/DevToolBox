import { useState } from "react";

import { ScrollArea } from "@/components/ui/ScrollArea";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/Button";
import { copyWithToast } from "@/utils/clipboard";
import { computePosition, formatJson } from "@/utils/jsonFormat";

import styles from "./QuickJsonPane.module.scss";

export function QuickJsonPane() {
  const [input, setInput] = useState('{"hello":"world"}');
  const [output, setOutput] = useState("{}");
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const format = () => {
    try {
      setOutput(
        formatJson({
          input,
          allowJsLike: true,
          indent: "2",
        }),
      );
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const pos = computePosition(input, msg);
      setError(pos ? `${msg} (line ${pos.line}, col ${pos.col})` : msg);
      setOutput("");
    }
  };

  const minify = () => {
    try {
      setOutput(
        formatJson({
          input,
          allowJsLike: true,
          indent: "2",
          minify: true,
        }),
      );
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const pos = computePosition(input, msg);
      setError(pos ? `${msg} (line ${pos.line}, col ${pos.col})` : msg);
      setOutput("");
    }
  };

  return (
    <div className={styles.pane}>
      <div className={styles.paneHeader}>
        <p className={styles.title}>JSON Formatter</p>
        <p className="subtle">빠른 포맷/미니파이</p>
      </div>
      <ScrollArea className={styles.paneScroll}>
        <textarea
          className={styles.textarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='{"hello":"world"}'
        />
      </ScrollArea>
      <div className={styles.paneActions}>
        <Button variant="primary" onClick={format}>
          Format
        </Button>
        <Button variant="ghost" onClick={minify}>
          Minify
        </Button>
        <Button variant="ghost" onClick={() => copyWithToast(output || "", toast)}>
          Copy
        </Button>
      </div>
      {error && <p className="micro warning">{error}</p>}
      <ScrollArea className={styles.paneScroll}>
        <pre className={styles.code}>{output}</pre>
      </ScrollArea>
    </div>
  );
}
