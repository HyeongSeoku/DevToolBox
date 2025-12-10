import { useToast } from "@/components/ToastProvider";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { copyWithToast } from "@/utils/clipboard";
import { Button } from "@/components/ui/Button";
import { useJSDocGenerator } from "@/hooks/useJSDocGenerator";

import styles from "./index.module.scss";

export function JSDocGeneratorPage() {
  const toast = useToast();
  const {
    input,
    setInput,
    mode,
    setMode,
    rootName,
    setRootName,
    rootParam,
    setRootParam,
    simplifyTypes,
    setSimplifyTypes,
    autoDescription,
    setAutoDescription,
    detectSetter,
    setDetectSetter,
    error,
    code,
    sample,
  } = useJSDocGenerator();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className="eyebrow">JSDoc Generator</p>
        <h1>TypeScript 인터페이스 → JSDoc 주석 생성</h1>
        <p className="micro">
          props 정의를 붙여 넣고 Interface/Typedef/Param 모드로 JSDoc을 만들어 보세요.
        </p>
      </header>

      <section className={styles.layout}>
        <div className={styles.inputCard}>
          <div className={styles.row}>
            <p className={styles.label}>입력 코드</p>
            <div className={styles.inline}>
              <Button variant="ghost" onClick={() => setInput(sample)}>
                샘플 입력
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setInput("");
                }}
              >
                지우기
              </Button>
            </div>
          </div>
          <textarea
            className={styles.textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="interface Props { foo: string; bar?: number; }"
          />

          <div className={styles.options}>
            <div className={styles.inline}>
              <label className={styles.label}>모드</label>
              <div className={styles.tabRow}>
                {(["interface", "typedef", "param"] as const).map((m) => (
                  <Button
                    key={m}
                    variant="pill"
                    active={mode === m}
                    onClick={() => setMode(m)}
                  >
                    {m === "interface"
                      ? "Interface"
                      : m === "typedef"
                        ? "Typedef"
                        : "Param"}
                  </Button>
                ))}
              </div>
            </div>
            <div className={styles.inline}>
              <label className={styles.label}>루트 이름</label>
              <Input
                className={styles.input}
                value={rootName}
                onChange={(e) => setRootName(e.target.value)}
              />
              {mode === "param" && (
                <>
                  <label className={styles.label}>루트 파라미터</label>
                  <Input
                    className={styles.input}
                    value={rootParam}
                    onChange={(e) => setRootParam(e.target.value)}
                  />
                </>
              )}
            </div>
            <div className={styles.inline}>
              <label className={styles.checkbox}>
                <Checkbox
                  checked={simplifyTypes}
                  onChange={(e) => setSimplifyTypes(e.target.checked)}
                  label="JS 친화 타입으로 단순화"
                />
              </label>
              <label className={styles.checkbox}>
                <Checkbox
                  checked={autoDescription}
                  onChange={(e) => setAutoDescription(e.target.checked)}
                  label="자동 description 생성"
                />
              </label>
              <label className={styles.checkbox}>
                <Checkbox
                  checked={detectSetter}
                  onChange={(e) => setDetectSetter(e.target.checked)}
                  label="setter 자동 감지"
                />
              </label>
            </div>
          </div>
        </div>

        <div className={styles.outputCard}>
          <div className={styles.row}>
            <p className={styles.label}>출력</p>
            <div className={styles.inline}>
              <Button
                variant="primary"
                onClick={() => copyWithToast(code, toast)}
              >
                Copy
              </Button>
              <Button
                variant="ghost"
                onClick={() => copyWithToast(code, toast)}
              >
                Generate
              </Button>
            </div>
          </div>
          {error && <p className="micro">{error}</p>}
          <pre className={styles.code}>{code}</pre>
        </div>
      </section>
    </div>
  );
}
