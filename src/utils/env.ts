export type EnvEntry = {
  key: string;
  value: string;
  comment?: string;
  raw?: string;
};

export type EnvFile = {
  entries: EnvEntry[];
  map: Record<string, EnvEntry>;
};

export type DiffStatus = "match" | "missing" | "extra" | "diff";

export type DiffItem = {
  key: string;
  base?: EnvEntry;
  compare?: EnvEntry;
  status: DiffStatus;
};

export function parseEnv(text: string): EnvFile {
  const lines = text.split(/\r?\n/);
  const entries: EnvEntry[] = [];
  const map: Record<string, EnvEntry> = {};

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = line.indexOf("=");
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    const valueRaw = line.slice(idx + 1).trim();
    const value = stripQuotes(valueRaw);
    const entry = { key, value, raw: line };
    entries.push(entry);
    map[key] = entry;
  });

  return { entries, map };
}

export function diffEnvDetailed(base: EnvFile, compare: EnvFile): DiffItem[] {
  const keys = new Set([
    ...base.entries.map((e) => e.key),
    ...compare.entries.map((e) => e.key),
  ]);
  const items: DiffItem[] = [];
  keys.forEach((key) => {
    const b = base.map[key];
    const c = compare.map[key];
    let status: DiffStatus = "match";
    if (b && !c) status = "missing";
    else if (!b && c) status = "extra";
    else if (b && c && b.value !== c.value) status = "diff";
    items.push({ key, base: b, compare: c, status });
  });
  return items.sort((a, b) => a.key.localeCompare(b.key));
}

export function maskEnv(
  entries: EnvEntry[],
  mode: "full" | "partial" | "none",
) {
  if (mode === "none") return entries;
  return entries.map((e) => ({
    ...e,
    value: maskValue(e.value, mode),
  }));
}

function maskValue(value: string, mode: "full" | "partial") {
  if (mode === "full") return "****";
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}

function stripQuotes(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function generateExample(entries: EnvEntry[]): string {
  return entries
    .map((e) => `${e.key}=${e.value ? `"${e.value}"` : ""}`)
    .join("\n");
}

export function scanSecrets(entries: EnvEntry[]) {
  const patterns = [/SECRET/i, /TOKEN/i, /KEY/i, /PASSWORD/i, /AWS/];
  return entries
    .filter((e) => patterns.some((p) => p.test(e.key) || p.test(e.value)))
    .map((e) => e.key);
}
