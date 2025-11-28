export type CaseStyle =
  | "camel"
  | "pascal"
  | "snake"
  | "screaming-snake"
  | "kebab"
  | "train"
  | "dot"
  | "space"
  | "upper"
  | "lower"
  | "title"
  | "sentence"
  | "unknown";

export type SplitOptions = {
  delimiters: string[];
  splitNumbers: boolean;
  uppercaseAcronyms: boolean;
};

export type LineProcessOptions = {
  trim: boolean;
  skipEmpty: boolean;
  prefix?: string;
  suffix?: string;
  wrapTemplate?: string;
  datePrefix?: boolean;
  numbering?: "numeric" | "padded" | "alpha" | null;
  numberWidth?: number;
  joinMode: "lines" | "one";
  targetCase: CaseStyle;
  dedupe: boolean;
  splitOptions: SplitOptions;
};

const alphaSeq = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function detectCase(input: string): CaseStyle {
  if (!input) return "unknown";
  if (/^[a-z]+([A-Z][a-z0-9]+)+$/.test(input)) return "camel";
  if (/^[A-Z][A-Za-z0-9]+(?:[A-Z][a-z0-9]+)*$/.test(input)) return "pascal";
  if (/^[a-z0-9]+(_[a-z0-9]+)+$/.test(input)) return "snake";
  if (/^[A-Z0-9]+(_[A-Z0-9]+)+$/.test(input)) return "screaming-snake";
  if (/^[a-z0-9]+(-[a-z0-9]+)+$/.test(input)) return "kebab";
  if (/^[A-Z][a-z0-9]+(-[A-Z][a-z0-9]+)+$/.test(input)) return "train";
  if (/^[a-z0-9]+(\.[a-z0-9]+)+$/.test(input)) return "dot";
  if (/^[A-Za-z0-9]+( [A-Za-z0-9]+)+$/.test(input)) return "space";
  if (/^[A-Z0-9]+( [A-Z0-9]+)*$/.test(input)) return "upper";
  if (/^[a-z0-9]+( [a-z0-9]+)*$/.test(input)) return "lower";
  if (/^[A-Z][a-z]+( [A-Z][a-z]+)+$/.test(input)) return "title";
  return "unknown";
}

export function splitWords(
  input: string,
  options: SplitOptions
): string[] {
  const delimiters = options.delimiters.join("");
  const regex = new RegExp(`[${escapeRegex(delimiters)}]+`, "g");
  let working = input;
  if (options.uppercaseAcronyms) {
    working = working.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  }
  working = working.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  let tokens = working.split(regex).filter(Boolean);

  if (options.splitNumbers) {
    tokens = tokens.flatMap((token) =>
      token.split(/([0-9]+)/).filter(Boolean)
    );
  }
  return tokens.map((t) => t.trim()).filter(Boolean);
}

export function toCase(words: string[], target: CaseStyle): string {
  const normalized = words.map((w) => w.toLowerCase());
  switch (target) {
    case "camel":
      return normalized
        .map((w, i) => (i === 0 ? w : capitalize(w)))
        .join("");
    case "pascal":
      return normalized.map(capitalize).join("");
    case "snake":
      return normalized.join("_");
    case "screaming-snake":
      return normalized.join("_").toUpperCase();
    case "kebab":
      return normalized.join("-");
    case "train":
      return normalized.map(capitalize).join("-");
    case "dot":
      return normalized.join(".");
    case "space":
      return normalized.join(" ");
    case "upper":
      return normalized.join(" ").toUpperCase();
    case "lower":
      return normalized.join(" ").toLowerCase();
    case "title":
      return normalized.map(capitalize).join(" ");
    case "sentence":
      return sentenceCase(normalized.join(" "));
    default:
      return normalized.join(" ");
  }
}

export function processLines(
  input: string,
  options: LineProcessOptions
): { lines: string[]; combined: string } {
  const rawLines = input.split(/\r?\n/);
  const seen = new Set<string>();
  const processed: string[] = [];
  const datePrefix = options.datePrefix ? formatDatePrefix() : "";

  rawLines.forEach((line) => {
    let working = options.trim ? line.trim() : line;
    if (options.skipEmpty && working === "") return;
    const words = splitWords(working, options.splitOptions);
    const transformed = toCase(words, options.targetCase);

    let finalLine = transformed;
    if (options.wrapTemplate?.includes("{{text}}")) {
      finalLine = options.wrapTemplate.replace(/{{\s*text\s*}}/gi, finalLine);
    }
    const composedPrefix = `${datePrefix}${options.prefix ?? ""}`;
    if (composedPrefix) finalLine = `${composedPrefix}${finalLine}`;
    if (options.suffix) finalLine = `${finalLine}${options.suffix}`;

    if (options.numbering === "numeric") {
      const n = processed.length + 1;
      finalLine = `${n}. ${finalLine}`;
    } else if (options.numbering === "padded") {
      const n = processed.length + 1;
      const width = Math.max(options.numberWidth ?? 3, 2);
      finalLine = `${String(n).padStart(width, "0")}. ${finalLine}`;
    } else if (options.numbering === "alpha") {
      const pos = processed.length % alphaSeq.length;
      finalLine = `${alphaSeq[pos]}. ${finalLine}`;
    }

    if (options.dedupe) {
      if (seen.has(finalLine)) return;
      seen.add(finalLine);
    }

    processed.push(finalLine);
  });

  return {
    lines: processed,
    combined:
      options.joinMode === "one" ? processed.join(" ") : processed.join("\n"),
  };
}

export function guessDominantCase(
  lines: string[]
): { style: CaseStyle; confidence: number } {
  const counts: Record<CaseStyle, number> = {
    camel: 0,
    pascal: 0,
    snake: 0,
    "screaming-snake": 0,
    kebab: 0,
    train: 0,
    dot: 0,
    space: 0,
    upper: 0,
    lower: 0,
    title: 0,
    sentence: 0,
    unknown: 0,
  };
  lines.forEach((line) => {
    const c = detectCase(line.trim());
    counts[c] = (counts[c] || 0) + 1;
  });
  const total = lines.length || 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  const ratio = top ? top[1] / total : 0;
  return {
    style: (top?.[0] as CaseStyle) ?? "unknown",
    confidence: ratio,
  };
}

export function generateCaseVariants(words: string[]): Record<CaseStyle, string> {
  const targets: CaseStyle[] = [
    "camel",
    "pascal",
    "snake",
    "screaming-snake",
    "kebab",
    "train",
    "dot",
    "space",
    "title",
    "sentence",
    "upper",
    "lower",
  ];
  return targets.reduce<Record<CaseStyle, string>>((acc, style) => {
    acc[style] = toCase(words, style);
    return acc;
  }, {} as Record<CaseStyle, string>);
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function sentenceCase(str: string) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function escapeRegex(str: string) {
  return str.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

function formatDatePrefix() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}_`;
}
