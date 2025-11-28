export type EnvEntry = {
  key: string;
  value: string;
  comment?: string;
};

export type EnvFile = {
  entries: EnvEntry[];
  map: Record<string, EnvEntry>;
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
    const entry = { key, value };
    entries.push(entry);
    map[key] = entry;
  });

  return { entries, map };
}

export function diffEnv(
  base: EnvFile,
  compare: EnvFile
): { missing: EnvEntry[]; extras: EnvEntry[]; common: EnvEntry[] } {
  const missing = base.entries.filter((e) => !compare.map[e.key]);
  const extras = compare.entries.filter((e) => !base.map[e.key]);
  const common = base.entries.filter((e) => compare.map[e.key]);
  return { missing, extras, common };
}

export function maskEnv(entries: EnvEntry[], mode: "full" | "partial" | "none") {
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
