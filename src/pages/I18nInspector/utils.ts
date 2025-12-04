import {
  type I18nKeyStatus,
  type LocaleEntry,
  type LocalePattern,
  type ScanResult,
} from "./types";

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [k: string]: JsonValue };
type JsonArray = JsonValue[];

const placeholderRegex = /({{[^}]+}}|{[^}]+}|%s|%d|%\d+\$s|%\d+\$d)/g;

export const flattenJson = (
  data: JsonValue,
  prefix = "",
): Record<string, string> => {
  const result: Record<string, string> = {};
  if (data === null) return result;

  const walk = (value: JsonValue, path: string) => {
    if (
      value === null ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      result[path] = String(value);
      return;
    }
    if (typeof value === "string") {
      result[path] = value;
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, idx) => {
        const next = path ? `${path}.${idx}` : String(idx);
        walk(item, next);
      });
      return;
    }
    Object.entries(value).forEach(([key, val]) => {
      const next = path ? `${path}.${key}` : key;
      walk(val, next);
    });
  };

  if (prefix) walk(data, prefix);
  else if (typeof data === "object") walk(data, "");

  // remove leading dots if any
  const cleaned: Record<string, string> = {};
  Object.entries(result).forEach(([k, v]) => {
    cleaned[k.replace(/^\./, "")] = v;
  });
  return cleaned;
};

const getFileParts = (filePath: string) => {
  const segments = filePath.split(/[/\\]/).filter(Boolean);
  const file = segments[segments.length - 1] ?? "";
  const dotIdx = file.lastIndexOf(".");
  const ext = dotIdx >= 0 ? file.slice(dotIdx) : "";
  const name = dotIdx >= 0 ? file.slice(0, dotIdx) : file;
  return { segments, file, ext, name };
};

export const extractLocaleInfo = (
  filePath: string,
  pattern: LocalePattern,
): { locale: string; namespace: string } | null => {
  const { segments, ext, name } = getFileParts(filePath);
  if (ext.toLowerCase() !== ".json") return null;

  if (pattern === "flat") {
    return { locale: name, namespace: "default" };
  }

  // namespace pattern: .../<locale>/<namespace>.json
  if (segments.length < 2) return null;
  const locale = segments[segments.length - 2];
  const namespace = name;
  return { locale, namespace };
};

export const detectPlaceholders = (text?: string): Set<string> => {
  if (!text) return new Set();
  const matches = text.match(placeholderRegex) ?? [];
  return new Set(matches);
};

const langMap: Record<string, string> = {
  en: "en",
  ko: "ko",
  ja: "ja",
};

export const detectLanguage = (text: string): string | undefined => {
  if (!text || text.trim().length < 2) return undefined;
  const hasHangul = /[\uac00-\ud7af]/.test(text);
  const hasKana = /[\u3040-\u30ff]/.test(text);
  if (hasHangul && !hasKana) return "ko";
  if (hasKana && !hasHangul) return "ja";
  const asciiRatio =
    text.split("").filter((c) => c.charCodeAt(0) < 128).length / text.length;
  if (asciiRatio > 0.8) return "en";
  return undefined;
};

export const compareLocales = (
  baseLocale: string,
  targetLocales: string[],
  entries: LocaleEntry[],
): I18nKeyStatus[] => {
  const byLocale: Record<string, Record<string, string>> = {};
  const namespaceOf: Record<string, string> = {};
  entries.forEach((e) => {
    const composite = `${e.namespace}.${e.key}`;
    if (!byLocale[e.locale]) byLocale[e.locale] = {};
    byLocale[e.locale][composite] = e.value;
    namespaceOf[composite] = e.namespace;
  });

  const baseMap = byLocale[baseLocale] ?? {};
  const baseKeys = new Set(Object.keys(baseMap));
  const results: I18nKeyStatus[] = [];

  targetLocales.forEach((locale) => {
    const targetMap = byLocale[locale] ?? {};
    const targetKeys = new Set(Object.keys(targetMap));

    // missing & ok/untranslated/placeholder/lang checks
    baseKeys.forEach((key) => {
      const baseValue = baseMap[key];
      if (!(key in targetMap)) {
        results.push({
          namespace: namespaceOf[key] ?? "default",
          key,
          baseLocale,
          targetLocale: locale,
          baseValue,
          status: "MISSING",
        });
        return;
      }
      const targetValue = targetMap[key];
      const notes: string[] = [];
      let status: I18nKeyStatus["status"] = "OK";

      const placeholdersBase = detectPlaceholders(baseValue);
      const placeholdersTarget = detectPlaceholders(targetValue);
      if (baseValue.trim() === targetValue.trim()) {
        status = "UNTRANSLATED";
      }
      const missingPlaceholder = [...placeholdersBase].some(
        (p) => !placeholdersTarget.has(p),
      );
      const extraPlaceholder = [...placeholdersTarget].some(
        (p) => !placeholdersBase.has(p),
      );
      if (missingPlaceholder || extraPlaceholder) {
        status = "PLACEHOLDER_MISMATCH";
        if (missingPlaceholder)
          notes.push("기본 문자열의 placeholder가 누락되었습니다.");
        if (extraPlaceholder) notes.push("추가 placeholder가 있습니다.");
      }

      // language detection
      const detected = detectLanguage(targetValue || "");
      const expected = langMap[locale];
      if (expected && detected && detected !== expected) {
        status = status === "OK" ? "LANG_MISMATCH" : status;
        notes.push(`감지된 언어가 ${detected} 입니다.`);
      }

      results.push({
        namespace: namespaceOf[key] ?? "default",
        key,
        baseLocale,
        targetLocale: locale,
        baseValue,
        targetValue,
        status,
        notes: notes.length ? notes : undefined,
        detectedLang: detected,
        expectedLang: expected,
      });
    });

    // extras
    targetKeys.forEach((key) => {
      if (baseKeys.has(key)) return;
      results.push({
        namespace: namespaceOf[key] ?? "default",
        key,
        baseLocale,
        targetLocale: locale,
        targetValue: targetMap[key],
        status: "EXTRA",
      });
    });
  });

  return results;
};

export const groupScanResult = (entries: LocaleEntry[]): ScanResult => {
  const locales = Array.from(new Set(entries.map((e) => e.locale)));
  const namespaces = Array.from(new Set(entries.map((e) => e.namespace)));
  return { locales, namespaces, entries };
};
