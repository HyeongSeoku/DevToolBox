import { type ReactNode, useMemo } from "react";

import Prism from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-json";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-rust";

import ContentCopy from "@/assets/icons/content_copy.svg?react";
import { ScrollArea } from "@/components/ui/ScrollArea";

import { Button } from "./Button";
import styles from "./CodeBlock.module.scss";

type CodeBlockProps = {
  language?: string;
  className?: string;
  children?: ReactNode;
  copyable?: boolean;
  copyText?: string;
  onCopy?: (value: string) => void | Promise<void>;
  maxHeight?: number | string;
  scrollable?: boolean;
};

const normalizeLanguage = (language?: string) => {
  const raw = language?.toLowerCase().trim();
  if (!raw) return "text";
  if (raw === "js" || raw === "javascript") return "javascript";
  if (raw === "ts" || raw === "typescript") return "typescript";
  if (raw === "json") return "json";
  if (raw === "rust" || raw === "rs") return "rust";
  if (raw === "env") return "env";
  if (raw === "base64") return "base64";
  return raw;
};

export function CodeBlock({
  language,
  className,
  children,
  copyable = false,
  copyText,
  onCopy,
  maxHeight,
  scrollable = false,
}: CodeBlockProps) {
  const normalized = normalizeLanguage(language);
  const languageClass = styles[`lang_${normalized}`] ?? styles.lang_text;
  const preClasses = [
    styles.block,
    languageClass,
    copyable ? styles.withCopy : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  const content = useMemo(() => String(children ?? ""), [children]);
  const highlighted = useMemo(() => {
    const grammar = Prism.languages[normalized];
    if (!grammar) return escapeHtml(content);
    return Prism.highlight(content, grammar, normalized);
  }, [content, normalized]);
  const copyValue = copyText ?? content;
  const canCopy = copyable && copyValue.trim().length > 0;
  const isScrollable = scrollable || maxHeight !== undefined;

  const pre = (
    <pre className={preClasses} data-language={normalized}>
      <code
        className={styles.code}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </pre>
  );

  return (
    <div
      className={`${styles.container} ${isScrollable ? styles.scrollable : ""}`}
    >
      {canCopy && (
        <Button
          variant="ghost"
          type="button"
          className={styles.copyButton}
          onClick={() => {
            if (onCopy) {
              void onCopy(copyValue);
              return;
            }
            if (typeof navigator !== "undefined" && navigator.clipboard) {
              void navigator.clipboard.writeText(copyValue);
            }
          }}
          aria-label="코드 복사"
        >
          <ContentCopy />
        </Button>
      )}
      {isScrollable ? (
        <ScrollArea
          className={styles.scrollContent}
          wrapperClassName={styles.scrollWrapper}
          maxHeight={maxHeight}
        >
          {pre}
        </ScrollArea>
      ) : (
        pre
      )}
    </div>
  );
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
