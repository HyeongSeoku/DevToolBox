import { useEffect, useMemo, useState } from "react";

import styles from "./index.module.scss";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ToastProvider";
import { useTauriEnv } from "@/hooks/useTauriEnv";
import { useVaultStore } from "@/stores/useVaultStore";
import {
  detectJwtStrings,
  detectTimestamps,
  maskSensitiveClaims,
  parseJwt,
  prettyJson,
  summarizeClaims,
  type ParsedJwt,
} from "@/utils/jwt";

type ViewMode = "pretty" | "raw";

const HISTORY_KEY = "jwt-history";

export function JWTDecoderPage() {
  const toast = useToast();
  const isTauriEnv = useTauriEnv();
  const vault = useVaultStore();

  const [input, setInput] = useState("");
  const [tokens, setTokens] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedJwt | null>(null);
  const [masking, setMasking] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("pretty");
  const [autoPaste, setAutoPaste] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("jwt-auto-paste") !== "0";
  });
  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(HISTORY_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [clipboardReady, setClipboardReady] = useState(false);

  const decodedHeader = useMemo(() => {
    if (!parsed) return "";
    if (viewMode === "raw") return parsed.headerB64;
    return prettyJson(parsed.headerJson);
  }, [parsed, viewMode]);

  const decodedPayload = useMemo(() => {
    if (!parsed) return "";
    if (viewMode === "raw") return parsed.payloadB64;
    const payload = masking
      ? maskSensitiveClaims(parsed.payloadJson)
      : parsed.payloadJson;
    return prettyJson(payload);
  }, [parsed, masking, viewMode]);

  const minifiedPayload = useMemo(() => {
    if (!parsed?.payloadJson) return "";
    try {
      return JSON.stringify(
        masking ? maskSensitiveClaims(parsed.payloadJson) : parsed.payloadJson,
      );
    } catch {
      return "";
    }
  }, [parsed, masking]);

  const timestamps = useMemo(
    () => (parsed?.payloadJson ? detectTimestamps(parsed.payloadJson) : []),
    [parsed],
  );

  const claimSummary = useMemo(
    () => summarizeClaims(parsed?.payloadJson),
    [parsed],
  );

  useEffect(() => {
    const found = detectJwtStrings(input);
    setTokens(found);
    if (!found.length) {
      setParsed(null);
      setSelected(null);
      return;
    }
    const target = selected && found.includes(selected) ? selected : found[0];
    setSelected(target);
    const parsedJwt = parseJwt(target);
    setParsed(parsedJwt);
    if (parsedJwt.errors.length === 0) {
      saveHistory(target);
    }
  }, [input, selected]);

  useEffect(() => {
    if (!autoPaste) return;
    const pasteFromClipboard = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (!text) return;
        const found = detectJwtStrings(text);
        if (found.length) {
          setInput(text);
          setTokens(found);
          setSelected(found[0]);
          toast.show("클립보드에서 JWT를 불러왔습니다.", { type: "info" });
        }
      } catch {
        // ignore clipboard failures
      }
    };
    void pasteFromClipboard();
  }, [autoPaste, toast]);

  useEffect(() => {
    const checkClipboard = async () => {
      try {
        const text = await navigator.clipboard.readText();
        setClipboardReady(detectJwtStrings(text).length > 0);
      } catch {
        setClipboardReady(false);
      }
    };
    void checkClipboard();
  }, []);

  const saveHistory = (token: string) => {
    setHistory((prev) => {
      const next = [token, ...prev.filter((t) => t !== token)].slice(0, 10);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const handleParse = () => {
    const found = detectJwtStrings(input);
    setTokens(found);
    if (!found.length) {
      toast.show("JWT 형식을 찾지 못했습니다.", { type: "error" });
      setParsed(null);
      return;
    }
    setSelected(found[0]);
  };

  const handleClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const found = detectJwtStrings(text);
      if (!found.length) {
        toast.show("클립보드에서 JWT를 찾지 못했습니다.", { type: "error" });
        return;
      }
      setInput(text);
      setTokens(found);
      setSelected(found[0]);
      toast.show("클립보드에서 JWT를 불러왔습니다.", { type: "success" });
    } catch (error) {
      toast.show(`클립보드를 읽지 못했습니다: ${error}`, { type: "error" });
    }
  };

  const handleExport = async () => {
    if (!parsed?.payloadJson) return;
    const filename = `history/jwt-decode/${new Date()
      .toISOString()
      .slice(0, 10)}-${Date.now()}.json`;
    try {
      await vault.writeFile(
        filename,
        JSON.stringify(parsed.payloadJson, null, 2),
      );
      toast.show("Vault에 저장했습니다.", { type: "success" });
    } catch {
      toast.show("Vault 저장 실패: 설정을 확인하세요.", { type: "error" });
    }
  };

  const signBadge = parsed?.unsigned ? "Unsigned" : "Signed";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className="eyebrow">JWT 디코더</p>
        <h1>JWT를 자동 감지하고 안전하게 디코딩</h1>
        <p className="micro">
          붙여넣기만 하면 header/payload를 디코드합니다. 민감 정보는 로컬에서만
          처리됩니다.
        </p>
      </header>

      <section className={styles.inputCard}>
        <div className={styles.inputRow}>
          <textarea
            className={styles.input}
            placeholder="JWT를 붙여넣거나 문자열 속 JWT를 포함해도 됩니다."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className={styles.actions}>
            {clipboardReady && (
              <Button variant="ghost" onClick={handleClipboard}>
                클립보드에서 가져오기
              </Button>
            )}
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={autoPaste}
                onChange={(e) => {
                  setAutoPaste(e.target.checked);
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem(
                      "jwt-auto-paste",
                      e.target.checked ? "1" : "0",
                    );
                  }
                }}
              />
              Cmd+V 자동 디코드 허용
            </label>
            <Button variant="primary" onClick={handleParse}>
              디코드
            </Button>
          </div>
        </div>
        <div className={styles.tokenList}>
          {tokens.length === 0 && (
            <p className="subtle">JWT가 감지되지 않았습니다.</p>
          )}
          {tokens.map((tkn) => (
            <Button
              key={tkn}
              className={`${styles.tokenItem} ${selected === tkn ? styles.active : ""}`}
              onClick={() => setSelected(tkn)}
            >
              <span className={styles.badge}>
                {parseJwt(tkn).unsigned ? "Unsigned" : "Signed"}
              </span>
              <span className={styles.tokenText}>{maskMiddle(tkn)}</span>
            </Button>
          ))}
        </div>
      </section>

      {parsed?.errors?.length ? (
        <div className={styles.errorBox}>
          <p className={styles.label}>유효성 오류</p>
          <ul>
            {parsed.errors.map((err) => (
              <li key={err} className={styles.errorItem}>
                {err}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className={styles.layout}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.label}>헤더</p>
              <div className={styles.badges}>
                {parsed?.headerJson?.alg === "none" && (
                  <span className={styles.alert}>alg: none (취약)</span>
                )}
                <span className={styles.secondary}>{signBadge}</span>
              </div>
            </div>
            <div className={styles.panelActions}>
              <Button
                variant="ghost"
                onClick={() => copyText(parsed?.headerB64 || "")}
              >
                Copy Base64URL
              </Button>
              <Button variant="ghost" onClick={() => copyText(decodedHeader)}>
                Copy JSON
              </Button>
            </div>
          </div>
          <pre className={styles.code}>{decodedHeader || "// 내용 없음"}</pre>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.label}>Payload</p>
              <div className={styles.badges}>
                {timestamps.map((t) => (
                  <span
                    key={t.key}
                    className={`${styles.badgeTime} ${
                      t.status === "expired"
                        ? styles.danger
                        : t.status === "expiring"
                          ? styles.warn
                          : styles.success
                    }`}
                  >
                    {t.key}: {t.relative}
                  </span>
                ))}
              </div>
            </div>
            <div className={styles.panelActions}>
              <Button
                variant="ghost"
                onClick={() => copyText(parsed?.payloadB64 || "")}
              >
                Copy Base64URL
              </Button>
              <Button variant="ghost" onClick={() => copyText(decodedPayload)}>
                Copy JSON
              </Button>
              <Button variant="ghost" onClick={() => copyText(minifiedPayload)}>
                Minify & Copy
              </Button>
              <Button variant="ghost" onClick={handleExport}>
                JSON 저장
              </Button>
              <Button variant="ghost" onClick={() => setMasking((m) => !m)}>
                {masking ? "마스킹 해제" : "마스킹"}
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  setViewMode((m) => (m === "pretty" ? "raw" : "pretty"))
                }
              >
                {viewMode === "pretty" ? "Raw 보기" : "Pretty 보기"}
              </Button>
            </div>
          </div>

          {claimSummary.length > 0 && (
            <div className={styles.summaryRow}>
              {claimSummary.map((c) => (
                <div key={c.key} className={styles.summaryCard}>
                  <p className={styles.label}>{c.key}</p>
                  <p className={styles.summaryValue}>{c.value}</p>
                </div>
              ))}
            </div>
          )}

          <pre className={styles.code}>{decodedPayload || "// 내용 없음"}</pre>
        </div>
      </section>

      <section className={styles.history}>
        <div className={styles.historyHeader}>
          <p className={styles.label}>최근 디코드</p>
          <Button
            variant="ghost"
            onClick={() => {
              setHistory([]);
              if (typeof window !== "undefined") {
                window.localStorage.removeItem(HISTORY_KEY);
              }
            }}
          >
            모두 지우기
          </Button>
        </div>
        <div className={styles.historyList}>
          {history.length === 0 && <p className="subtle">기록 없음</p>}
          {history.map((item) => (
            <Button
              key={item}
              className={styles.historyItem}
              onClick={() => {
                setInput(item);
                setTokens([item]);
                setSelected(item);
              }}
            >
              {maskMiddle(item)}
            </Button>
          ))}
        </div>
      </section>

      {!isTauriEnv && (
        <p className="micro">
          Tauri 환경에서 Vault 저장 및 클립보드 기능이 더 완전하게 작동합니다.
        </p>
      )}
    </div>
  );
}

function maskMiddle(token: string) {
  if (token.length < 20) return token;
  return `${token.slice(0, 10)}…${token.slice(-10)}`;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // ignore
  }
}
