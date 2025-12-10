import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { copyWithToast } from "@/utils/clipboard";

import styles from "./index.module.scss";
import { useToast } from "../../components/ToastProvider";
import {
  generateTypesFromSchemas,
  parseOpenApiText,
} from "../../utils/openapi";
import { generateInterfaces } from "@/utils/typegen";

type Tab = "openapi" | "json";

const defaultCode = `// 생성된 타입이 여기에 표시됩니다.`;

export function TypeGenPage() {
  const [tab, setTab] = useState<Tab>("openapi");
  const [inputText, setInputText] = useState("");
  const [url, setUrl] = useState("");
  const [lastFetchedUrl, setLastFetchedUrl] = useState("");
  const [typeName, setTypeName] = useState("GeneratedType");
  const [preview, setPreview] = useState(defaultCode);
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState("");
  const toast = useToast();

  const isJsonTab = tab === "json";

  const handleGenerate = async () => {
    if (isJsonTab) {
      try {
        const json = JSON.parse(inputText);
        const enumsMap = json.enums as Record<string, string[]> | undefined;
        const inferred = generateInterfaces(json, typeName || "Root", enumsMap);
        setPreview(inferred);
        setSummary("JSON 샘플에서 타입을 생성했습니다.");
        setStatus("완료");
        toast.show("타입 생성 완료", { type: "success" });
      } catch (err) {
        const msg = `JSON 파싱 실패: ${err}`;
        setStatus(msg);
        toast.show(msg, { type: "error" });
      }
    } else {
      try {
        const specText = inputText.trim();
        if (!specText) {
          const msg = "스펙 텍스트를 붙여 넣거나 URL을 불러와 주세요.";
          setStatus(msg);
          toast.show(msg, { type: "error" });
          return;
        }
        let spec;
        try {
          spec = parseOpenApiText(specText);
        } catch (innerErr) {
          const extracted = await fetchSpecFromHtml(
            specText,
            url || lastFetchedUrl,
          );
          if (!extracted) throw innerErr;
          spec = parseOpenApiText(extracted);
        }
        const result = generateTypesFromSchemas(spec);
        setPreview(result.code);
        setSummary(
          `스키마 ${result.schemaCount}개, paths ${result.pathCount}개 감지됨 (v${spec.version})`,
        );
        setStatus("OpenAPI/Swagger 스펙에서 타입을 생성했습니다.");
        toast.show("타입 생성 완료", { type: "success" });
      } catch (err) {
        const msg = `스펙 처리 실패: ${err}`;
        setStatus(msg);
        toast.show(msg, { type: "error" });
      }
    }
  };

  const handleFetch = async () => {
    if (!url) {
      const msg = "URL을 입력하세요.";
      setStatus(msg);
      toast.show(msg, { type: "error" });
      return;
    }
    setStatus("불러오는 중...");
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        const msg = `URL 불러오기 실패: HTTP ${resp.status}`;
        setStatus(msg);
        toast.show(msg, { type: "error" });
        return;
      }
      const body = await resp.text();
      setLastFetchedUrl(url);
      // HTML이면 스펙 URL 추출 시도
      if (looksLikeHtml(body)) {
        const specText = await fetchSpecFromHtml(body, url);
        if (specText) {
          setInputText(specText);
          setStatus(
            "HTML에서 스펙을 추출했습니다. 타입 생성 버튼을 눌러주세요.",
          );
          return;
        }
      }
      setInputText(body);
      setStatus("스펙을 불러왔습니다. 타입 생성 버튼을 눌러주세요.");
    } catch (err) {
      const msg = `URL 불러오기 실패: ${err}`;
      setStatus(msg);
      toast.show(msg, { type: "error" });
    }
  };

  const sampleHint = useMemo(
    () =>
      isJsonTab
        ? `예시: {"id":1,"name":"Alice","roles":["admin"],"profile":{"age":30,"active":true}}`
        : `예시: https://petstore.swagger.io/v2/swagger.json 또는 스펙 JSON/YAML 붙여넣기 (Swagger UI HTML도 지원)`,
    [isJsonTab],
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className="eyebrow">API 타입 생성</p>
        <h1>OpenAPI/Swagger/JSON 샘플로 TypeScript 타입 생성</h1>
        <p className="micro">
          Swagger/Redoc URL이나 JSON 샘플을 붙여 넣어 타입을 만들어 보세요.
          (OpenAPI 파서는 추후 업데이트)
        </p>
      </header>

      <div className={styles.tabRow}>
        <Button
          className={`${styles.tab} ${tab === "openapi" ? styles.active : ""}`}
          onClick={() => setTab("openapi")}
        >
          OpenAPI / Swagger
        </Button>
        <Button
          className={`${styles.tab} ${tab === "json" ? styles.active : ""}`}
          onClick={() => setTab("json")}
        >
          JSON 샘플
        </Button>
      </div>

      <section className={styles.layout}>
        <div className={styles.inputCard}>
          <p className={styles.label}>
            {isJsonTab ? "JSON 입력" : "스펙 URL 또는 스펙 텍스트"}
          </p>
          {!isJsonTab && (
            <div className={styles.inlineRow}>
              <Input
                className={styles.input}
                placeholder="https://api.example.com/openapi.json"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <Button variant="ghost" onClick={handleFetch}>
                URL 불러오기
              </Button>
            </div>
          )}
          <textarea
            className={styles.textarea}
            placeholder={sampleHint}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          {isJsonTab && (
            <div className={styles.inlineRow}>
              <label className={styles.label}>타입 이름</label>
              <Input
                className={styles.input}
                type="text"
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
              />
            </div>
          )}
          <div className={styles.buttonRow}>
            <Button variant="primary" onClick={handleGenerate}>
              타입 생성
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setInputText("");
                setPreview(defaultCode);
                setSummary("");
                setStatus("");
              }}
            >
              초기화
            </Button>
          </div>
          {status && <p className="micro">{status}</p>}
        </div>

        <div className={styles.previewCard}>
          <div className={styles.previewHeader}>
            <p className={styles.label}>미리보기</p>
            {summary && <p className="micro">{summary}</p>}
            <Button
              variant="ghost"
              onClick={() => copyWithToast(preview, toast)}
            >
              Copy
            </Button>
          </div>
          <pre className={styles.code}>{preview}</pre>
        </div>
      </section>
    </div>
  );
}

function looksLikeHtml(text: string) {
  const trimmed = text.trim().toLowerCase();
  return (
    trimmed.startsWith("<!doctype") ||
    trimmed.startsWith("<html") ||
    trimmed.includes("<body")
  );
}

async function fetchSpecFromHtml(
  html: string,
  baseUrl: string,
): Promise<string | null> {
  // direct spec url in HTML
  const direct = tryExtractSpecUrl(html, baseUrl);
  if (direct) {
    const resp = await fetch(direct);
    if (resp.ok) return resp.text();
  }

  // swagger-initializer.js 추출
  const scriptMatch = html.match(
    /<script[^>]+src=["']([^"']*swagger-initializer[^"']+)["']/i,
  );
  if (scriptMatch && scriptMatch[1]) {
    const scriptUrl = new URL(scriptMatch[1], baseUrl).toString();
    const js = await fetch(scriptUrl);
    if (js.ok) {
      const jsText = await js.text();
      const urlMatch = jsText.match(/url:\s*["']([^"']+)["']/i);
      if (urlMatch && urlMatch[1]) {
        const specUrl = new URL(urlMatch[1], scriptUrl).toString();
        const specResp = await fetch(specUrl);
        if (specResp.ok) return specResp.text();
      }
    }
  }
  return null;
}

function tryExtractSpecUrl(html: string, baseUrl: string): string | null {
  // Swagger UI initializer typically has url: "..."
  const urlMatch = html.match(/url:\s*["']([^"']+)["']/i);
  if (urlMatch && urlMatch[1])
    return new URL(urlMatch[1], baseUrl || undefined).toString();

  // redoc pattern: data-spec-url="..."
  const dataSpec = html.match(/data-spec-url=["']([^"']+)["']/i);
  if (dataSpec && dataSpec[1])
    return new URL(dataSpec[1], baseUrl || undefined).toString();

  // link with swagger/openapi.json
  const linkJson = html.match(
    /href=["']([^"']+(swagger|openapi)[^"']+\\.json)["']/i,
  );
  if (linkJson && linkJson[1])
    return new URL(linkJson[1], baseUrl || undefined).toString();

  return null;
}
