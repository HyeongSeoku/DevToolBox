import { useEffect, useMemo, useState } from "react";

import { useToast } from "@/components/ToastProvider";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Checkbox } from "@/components/ui/Checkbox";
import { copyWithToast } from "@/utils/clipboard";

import styles from "./index.module.scss";

type Encoding = "utf-8" | "utf-16le";
type Mode = "encode" | "decode";

const LARGE_WARN_BYTES = 5 * 1024 * 1024;

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

const base64ToBytes = (b64: string) => {
  const normalized = b64.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");

const formatSize = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

export function Base64Page() {
  const toast = useToast();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [urlSafe, setUrlSafe] = useState(false);
  const [encoding, setEncoding] = useState<Encoding>("utf-8");
  const [mode, setMode] = useState<Mode>("encode");

  const inputBytes = useMemo(() => new TextEncoder().encode(input), [input]);
  const inputSize = inputBytes.length;
  const outputSize = output.length;

  const encodeBytes = (text: string) => {
    if (encoding === "utf-8") return new TextEncoder().encode(text);
    const buf = new Uint8Array(text.length * 2);
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      buf[i * 2] = code & 0xff;
      buf[i * 2 + 1] = code >> 8;
    }
    return buf;
  };

  const decodeBytes = (bytes: Uint8Array) => {
    if (encoding === "utf-8") {
      const decoder = new TextDecoder("utf-8", { fatal: true });
      return decoder.decode(bytes);
    }
    let result = "";
    for (let i = 0; i < bytes.length; i += 2) {
      result += String.fromCharCode(bytes[i] | ((bytes[i + 1] || 0) << 8));
    }
    return result;
  };

  const handleEncode = () => {
    try {
      const b64 = bytesToBase64(encodeBytes(input));
      const encoded = urlSafe
        ? b64.replace(/\+/g, "-").replace(/\//g, "_")
        : b64;
      setOutput(encoded);
      setError(null);
    } catch (err) {
      setError(String(err));
    }
  };

  const handleDecode = () => {
    try {
      const bytes = base64ToBytes(input.trim());
      const decoded = decodeBytes(bytes);
      setOutput(decoded);
      setError(null);
    } catch (err) {
      try {
        const bytes = base64ToBytes(input.trim());
        const hex = bytesToHex(bytes);
        setOutput(hex);
        setError("디코딩 실패 → Hex로 표시합니다.");
      } catch (err2) {
        setError(`디코드 실패: ${err2}`);
        setOutput("");
      }
    }
  };

  useEffect(() => {
    if (mode === "encode") {
      handleEncode();
    } else {
      handleDecode();
    }
  }, [input, urlSafe, encoding, mode]);

  return (
    <div className={styles.page}>
      <header className={styles.row}>
        <div>
          <p className="eyebrow">Base64 인/디코더</p>
          <h1>텍스트 ↔ Base64 변환</h1>
        </div>
        <div className={styles.modeButtons}>
          <button
            className={`ghost ${mode === "encode" ? styles.modeButtonActive : ""}`}
            onClick={() => setMode("encode")}
          >
            Encode
          </button>
          <button
            className={`ghost ${mode === "decode" ? styles.modeButtonActive : ""}`}
            onClick={() => setMode("decode")}
          >
            Decode
          </button>
        </div>
      </header>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.row}>
            <p className="micro">옵션</p>
            <label className="inline">
            <Checkbox
              checked={urlSafe}
              onChange={(e) => setUrlSafe(e.target.checked)}
              label="URL-safe (+/ → -/_)"
            />
          </label>
            <label className="inline">
              <span>Encoding</span>
              <select
                value={encoding}
                onChange={(e) => setEncoding(e.target.value as Encoding)}
              >
                <option value="utf-8">UTF-8</option>
                <option value="utf-16le">UTF-16 LE</option>
              </select>
            </label>
          </div>

          <label className="micro">입력 (텍스트 또는 Base64)</label>
          <textarea
            className={styles.textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="텍스트를 입력해 Encode, Base64를 입력해 Decode"
          />
          <div className={styles.actions}>
            <button className="primary" onClick={handleEncode}>
              Encode
            </button>
            <button className="ghost" onClick={handleDecode}>
              Decode
            </button>
          </div>
          {error && <p className="micro warning">{error}</p>}
          <div className={styles.badgeRow}>
            <span className={styles.badge}>input: {formatSize(inputSize)}</span>
            <span className={styles.badge}>
              output: {formatSize(outputSize)}
            </span>
            {inputSize > LARGE_WARN_BYTES && (
              <span className={`${styles.badge} ${styles.warn}`}>
                5MB 이상은 느릴 수 있습니다.
              </span>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.row}>
            <p className="micro">결과</p>
            <button
              className="ghost"
              onClick={() => copyWithToast(output, toast)}
              disabled={!output}
            >
              Copy
            </button>
          </div>
          <ScrollArea className={styles.output}>
            <pre>{output || "// 결과 없음"}</pre>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
