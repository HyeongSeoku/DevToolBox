import { useMemo, useState } from "react";

import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/Button";
import { copyWithToast } from "@/utils/clipboard";
import {
  processLines,
  type CaseStyle,
  type LineProcessOptions,
} from "@/utils/textTransform";

import styles from "./QuickTextPane.module.scss";

export function QuickTextPane() {
  const [value, setValue] = useState("");
  const [targetCase, setTargetCase] = useState<CaseStyle>("upper");
  const [trim, setTrim] = useState(true);
  const toast = useToast();

  const baseOptions = useMemo(
    (): LineProcessOptions => ({
      targetCase,
      trim,
      skipEmpty: false,
      joinMode: "lines",
      splitOptions: {
        delimiters: [" ", "_", "-", "."],
        splitNumbers: false,
        uppercaseAcronyms: true,
      },
      prefix: undefined,
      suffix: undefined,
      wrapTemplate: undefined,
      datePrefix: false,
      numbering: null,
      numberWidth: 3,
      dedupe: false,
    }),
    [targetCase, trim],
  );

  const processed = useMemo(
    () => processLines(value, baseOptions),
    [value, baseOptions],
  );

  const applyCase = (next: CaseStyle) => {
    setTargetCase(next);
    const opts = { ...baseOptions, targetCase: next };
    setValue(processLines(value, opts).combined);
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
        <Button variant="ghost" onClick={() => applyCase("upper")}>
          대문자
        </Button>
        <Button variant="ghost" onClick={() => applyCase("lower")}>
          소문자
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setTrim(true);
            const opts = { ...baseOptions, trim: true };
            setValue(processLines(value, opts).combined);
          }}
        >
          Trim
        </Button>
        <Button variant="primary" onClick={() => copyWithToast(processed.combined, toast)}>
          복사
        </Button>
      </div>
    </div>
  );
}
