type PartDecode = { ok: true; value: string } | { ok: false; error: string };

export type ParsedJwt = {
  raw: string;
  headerB64: string;
  payloadB64: string;
  signatureB64: string;
  headerJson?: any;
  payloadJson?: any;
  errors: string[];
  unsigned: boolean;
};

export type TimestampInfo = {
  key: string;
  unix: number;
  iso: string;
  relative: string;
  status: "valid" | "expiring" | "expired";
};

export function detectJwtStrings(text: string): string[] {
  const pattern = /([A-Za-z0-9\-_]+)\.([A-Za-z0-9\-_]+)\.([A-Za-z0-9\-_]*)/g;
  const matches = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    const token = m[0];
    if (token.split(".").length === 3) matches.add(token);
  }
  return Array.from(matches);
}

export function decodeBase64Url(input: string): PartDecode {
  try {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "===".slice((normalized.length + 3) % 4);
    let decoded = "";
    if (typeof window !== "undefined" && typeof window.atob === "function") {
      decoded = window.atob(padded);
    } else if ((globalThis as any).Buffer) {
      decoded = (globalThis as any).Buffer.from(padded, "base64").toString(
        "utf-8",
      );
    } else {
      throw new Error("Base64 디코더가 없습니다.");
    }
    return { ok: true, value: decoded };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

export function parseJwt(token: string): ParsedJwt {
  const errors: string[] = [];
  const parts = token.split(".");
  if (parts.length !== 3) {
    errors.push("JWT 형식이 아닙니다. (header.payload.signature 필요)");
    return {
      raw: token,
      headerB64: "",
      payloadB64: "",
      signatureB64: "",
      errors,
      unsigned: true,
    };
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const headerDecoded = decodeBase64Url(headerB64);
  const payloadDecoded = decodeBase64Url(payloadB64);
  let headerJson;
  let payloadJson;

  if (!headerDecoded.ok) {
    errors.push(`Header 디코딩 실패: ${headerDecoded.error}`);
  } else {
    try {
      headerJson = JSON.parse(headerDecoded.value);
    } catch (error) {
      errors.push(`Header JSON 파싱 실패: ${error}`);
    }
  }

  if (!payloadDecoded.ok) {
    errors.push(`Payload 디코딩 실패: ${payloadDecoded.error}`);
  } else {
    try {
      payloadJson = JSON.parse(payloadDecoded.value);
    } catch (error) {
      errors.push(`Payload JSON 파싱 실패: ${error}`);
    }
  }

  return {
    raw: token,
    headerB64,
    payloadB64,
    signatureB64,
    headerJson,
    payloadJson,
    errors,
    unsigned: signatureB64.length === 0,
  };
}

export function detectTimestamps(
  payload: any,
  now = Date.now(),
): TimestampInfo[] {
  if (!payload || typeof payload !== "object") return [];
  const keys = ["iat", "exp", "nbf"];
  const result: TimestampInfo[] = [];
  for (const key of keys) {
    const raw = payload[key];
    if (typeof raw !== "number") continue;
    const ms = raw * 1000;
    const delta = ms - now;
    let status: TimestampInfo["status"] = "valid";
    if (delta < 0) status = "expired";
    else if (delta < 1000 * 60 * 60 * 6) status = "expiring";
    result.push({
      key,
      unix: raw,
      iso: new Date(ms).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
      relative: formatRelative(delta),
      status,
    });
  }
  return result;
}

function formatRelative(deltaMs: number): string {
  const abs = Math.abs(deltaMs);
  const suffix = deltaMs >= 0 ? "후" : "전";
  const units: [number, string][] = [
    [1000 * 60 * 60 * 24, "일"],
    [1000 * 60 * 60, "시간"],
    [1000 * 60, "분"],
    [1000, "초"],
  ];
  for (const [size, label] of units) {
    if (abs >= size) {
      const value = Math.round(abs / size);
      return `${value}${label} ${suffix}`;
    }
  }
  return `0초 ${suffix}`;
}

export function maskSensitiveClaims(payload: any): any {
  if (!payload || typeof payload !== "object") return payload;
  const maskKeys = ["email", "phone", "sub", "user_id", "uid"];
  const clone: Record<string, any> = { ...payload };
  for (const key of Object.keys(clone)) {
    if (maskKeys.includes(key) && typeof clone[key] === "string") {
      clone[key] = maskString(clone[key]);
    }
  }
  return clone;
}

function maskString(value: string): string {
  if (value.length <= 4) return "****";
  const visible = value.slice(-4);
  return `${"*".repeat(Math.max(value.length - 4, 4))}${visible}`;
}

export function prettyJson(value: any): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

export function summarizeClaims(payload: any): Array<{
  key: string;
  value: string;
}> {
  if (!payload || typeof payload !== "object") return [];
  const keys = ["sub", "aud", "iss", "scope", "role"];
  return keys
    .filter((key) => key in payload)
    .map((key) => ({
      key,
      value: String((payload as any)[key]),
    }));
}

export function decodeFirstJwt(
  text: string,
  options?: { maskSensitive?: boolean },
): {
  tokens: string[];
  selected: string | null;
  payloadPretty: string;
  error?: string;
  parsed?: ParsedJwt;
} {
  const tokens = detectJwtStrings(text);
  if (!tokens.length) {
    return {
      tokens,
      selected: null,
      payloadPretty: "",
      error: "JWT를 찾지 못했습니다.",
    };
  }

  const selected = tokens[0];
  const parsed = parseJwt(selected);
  if (parsed.errors.length) {
    return {
      tokens,
      selected,
      payloadPretty: "",
      error: parsed.errors.join("\n"),
      parsed,
    };
  }

  const payload = options?.maskSensitive
    ? maskSensitiveClaims(parsed.payloadJson)
    : parsed.payloadJson;

  return {
    tokens,
    selected,
    payloadPretty: prettyJson(payload),
    parsed,
  };
}
