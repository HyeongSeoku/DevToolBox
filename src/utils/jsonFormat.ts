export const normalizeJsLike = (input: string) => {
  let text = input;
  text = text.replace(
    /'([^'\\]*(?:\\.[^'\\]*)*)'/g,
    (_, inner) => `"${inner.replace(/\\"/g, '"').replace(/"/g, '\\"')}"`,
  );
  text = text.replace(
    /([,{\s])([0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ_./-]+)\s*:/g,
    '$1"$2":',
  );
  text = text.replace(/,\s*([}\]])/g, "$1");
  text = text.replace(/:\s*([^,\}\]\s"]+)/g, (_full, val: string) => {
    const lowered = val.toLowerCase();
    if (["true", "false", "null"].includes(lowered)) return `:${lowered}`;
    if (/^-?\d+(\.\d+)?$/.test(val)) return `:${val}`;
    return `:"${val}"`;
  });
  return text;
};

export const tryParseJson = (input: string, allowJsLike: boolean) => {
  const attempts = [input.trim()];
  if (allowJsLike) {
    const normalized = normalizeJsLike(input.trim());
    attempts.push(normalized);
  }

  for (const candidate of attempts) {
    try {
      return { value: JSON.parse(candidate), source: candidate } as const;
    } catch {
      // continue
    }
  }
  throw new Error("JSON 파싱에 실패했습니다.");
};

export const computePosition = (text: string, message: string) => {
  const match =
    message.match(/position (\d+)/i) || message.match(/at position (\d+)/i);
  if (!match) return null;
  const pos = Number(match[1]);
  if (Number.isNaN(pos)) return null;
  const until = text.slice(0, pos);
  const lines = until.split(/\n/);
  const line = lines.length;
  const col = lines[lines.length - 1]?.length + 1;
  return { line, col };
};

export const sortJsonKeys = (obj: any, recursive: boolean): any => {
  if (Array.isArray(obj))
    return obj.map((item) => (recursive ? sortJsonKeys(item, true) : item));
  if (obj && typeof obj === "object") {
    return Object.keys(obj)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = recursive ? sortJsonKeys(obj[key], true) : obj[key];
          return acc;
        },
        {} as Record<string, any>,
      );
  }
  return obj;
};

export const formatJson = (params: {
  input: string;
  allowJsLike: boolean;
  minify?: boolean;
  sort?: boolean;
  sortRecursive?: boolean;
  indent: "2" | "4" | "tab";
}) => {
  const { input, allowJsLike, minify, sort, sortRecursive, indent } = params;
  const parsed = tryParseJson(input, allowJsLike).value;
  const sorted = sort ? sortJsonKeys(parsed, !!sortRecursive) : parsed;
  const space = minify ? 0 : indent === "tab" ? "\t" : Number(indent);
  return JSON.stringify(sorted, null, space as any);
};
