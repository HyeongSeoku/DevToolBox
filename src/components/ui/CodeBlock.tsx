import { type ReactNode, useMemo } from "react";

import Prism from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-json";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-rust";

import ContentCopy from "@/assets/icons/content_copy.svg?react";
import { useToast } from "@/components/ToastProvider";
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
  floatingCopy?: boolean;
  toastOnCopy?: boolean;
  toastMessage?: string;
  toastErrorMessage?: string;
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
  floatingCopy = false,
  toastOnCopy = true,
  toastMessage = "클립보드에 복사했습니다.",
  toastErrorMessage = "복사에 실패했습니다.",
}: CodeBlockProps) {
  const toast = useToast();
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
  const isFullHeight = maxHeight === "100%";

  const handleCopy = async () => {
    try {
      if (onCopy) {
        await onCopy(copyValue);
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(copyValue);
      } else {
        throw new Error("Clipboard API not available");
      }
      if (toastOnCopy) {
        toast.show(toastMessage, { type: "success" });
      }
    } catch {
      if (toastOnCopy) {
        toast.show(toastErrorMessage, { type: "error" });
      }
    }
  };

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
      className={`${styles.container} ${isScrollable ? styles.scrollable : ""} ${
        isFullHeight ? styles.fullHeight : ""
      } ${floatingCopy ? styles.floating : ""}`}
    >
      <div className={styles.scrollFrame}>
        {isScrollable ? (
          <ScrollArea
            className={styles.scrollContent}
            wrapperClassName={`${styles.scrollWrapper} ${
              isFullHeight ? styles.scrollWrapperFull : ""
            }`}
            maxHeight={maxHeight}
          >
            <div className={styles.inner}>{pre}</div>
          </ScrollArea>
        ) : (
          pre
        )}
        {canCopy && (
          <div className={styles.copyRow}>
            <Button
              variant="ghost"
              type="button"
              className={styles.copyButton}
              onClick={handleCopy}
              aria-label="코드 복사"
            >
              <ContentCopy />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
