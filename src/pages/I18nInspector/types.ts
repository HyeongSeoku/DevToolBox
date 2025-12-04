export type LocalePattern = "flat" | "namespace";

export type LocaleEntry = {
  locale: string;
  namespace: string;
  key: string;
  value: string;
  path: string;
};

export type FlatLocaleMap = Record<string, Record<string, string>>; // locale -> key -> value

export type PlaceholderCheck = {
  placeholders: Set<string>;
};

export type KeyStatus =
  | "OK"
  | "MISSING"
  | "EXTRA"
  | "UNTRANSLATED"
  | "PLACEHOLDER_MISMATCH"
  | "LANG_MISMATCH";

export type I18nKeyStatus = {
  namespace: string;
  key: string;
  baseLocale: string;
  targetLocale: string;
  baseValue?: string;
  targetValue?: string;
  status: KeyStatus;
  notes?: string[];
  detectedLang?: string;
  expectedLang?: string;
};

export type ScanResult = {
  locales: string[];
  namespaces: string[];
  entries: LocaleEntry[];
};
