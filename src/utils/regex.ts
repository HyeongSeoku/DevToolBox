export type RegexRunResult = {
  ok: boolean;
  error?: string;
  matches: Array<{
    match: string;
    index: number;
    groups: Record<string, string | undefined>;
  }>;
  replaced?: string;
};

export type RegexSnippet = {
  key: string;
  title: string;
  pattern: string;
  flags?: string;
  replace?: string | ((...args: any[]) => string);
  description?: string;
  category?: "common" | "frontend" | "backend";
};

export const commonRegexSnippets: RegexSnippet[] = [
  {
    key: "email",
    title: "이메일 추출",
    pattern: "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b",
    description: "RFC 단순 패턴",
    category: "common",
  },
  {
    key: "date-ymd",
    title: "날짜 YYYY-MM-DD",
    pattern: "\\b\\d{4}-\\d{2}-\\d{2}\\b",
    category: "common",
  },
  {
    key: "time-hms",
    title: "시간 HH:MM(:SS)",
    pattern: "\\b\\d{2}:\\d{2}(?::\\d{2})?\\b",
    category: "common",
  },
  {
    key: "credit-card",
    title: "카드번호(공백/대시 허용)",
    pattern: "\\b(?:\\d[ -]*?){13,19}\\b",
    category: "common",
  },
  {
    key: "password-strong",
    title: "비밀번호(대/소/숫자/특수 8~)",
    pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*]).{8,}$",
    flags: "m",
    category: "common",
  },
  {
    key: "url",
    title: "URL 추출",
    pattern: "(https?:\\/\\/[^\\s]+)",
    category: "common",
  },
  {
    key: "uuid",
    title: "UUID",
    pattern:
      "\\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\b",
    category: "backend",
  },
  {
    key: "jwt",
    title: "JWT 감지",
    pattern: "([A-Za-z0-9\\-_]+\\.[A-Za-z0-9\\-_]+\\.[A-Za-z0-9\\-_]+)",
    category: "backend",
  },
  {
    key: "ipv4",
    title: "IPv4",
    pattern: "\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b",
    category: "backend",
  },
  {
    key: "phone-kr",
    title: "휴대폰(한국)",
    pattern: "01[016789]-?\\d{3,4}-?\\d{4}",
    category: "common",
  },
  {
    key: "hex-color",
    title: "HEX 색상",
    pattern: "#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\\b",
    category: "frontend",
  },
  {
    key: "css-class",
    title: "CSS 클래스 선택자",
    pattern: "\\.[A-Za-z_][A-Za-z0-9_-]*",
    category: "frontend",
  },
  {
    key: "css-id",
    title: "CSS ID 선택자",
    pattern: "#[A-Za-z_][A-Za-z0-9_-]*",
    category: "frontend",
  },
  {
    key: "html-strip",
    title: "HTML 태그 제거",
    pattern: "<[^>]+>",
    replace: "",
    category: "common",
  },
  {
    key: "script-tag",
    title: "<script> 블록",
    pattern: "<script\\b[^>]*>([\\s\\S]*?)<\\/script>",
    category: "frontend",
  },
  {
    key: "numbers",
    title: "숫자만 추출",
    pattern: "\\d+",
    category: "common",
  },
  {
    key: "snake-to-camel",
    title: "snake → camel 치환",
    pattern: "_([a-z])",
    replace: (_m, g1) => g1.toUpperCase(),
    description: "replace에서 함수 사용 가능",
    category: "backend",
  },
  {
    key: "query-param",
    title: "쿼리스트링 key=value",
    pattern: "([?&])([\\w-]+)=([^&#]+)",
    description: "querystring key/value 추출",
    category: "frontend",
  },
  {
    key: "iso-datetime",
    title: "ISO 날짜시간",
    pattern: "\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?Z",
    category: "backend",
  },
  {
    key: "bearer",
    title: "Bearer 토큰 헤더",
    pattern: "Authorization:\\s*Bearer\\s+([^\\s]+)",
    category: "backend",
  },
  {
    key: "path-param",
    title: "API path 파라미터(:id)",
    pattern: "\\/:[a-zA-Z_][a-zA-Z0-9_]*",
    category: "backend",
  },
  {
    key: "tailwind-class",
    title: "Tailwind 클래스",
    pattern: "\\b[a-z0-9\\-:]+(?:\\/\\/[\\w-]+)?\\b",
    description: "의견: project별 커스터마이즈 필요",
    category: "frontend",
  },
  {
    key: "react-prop",
    title: "React props (kebab → camel)",
    pattern: "([a-z0-9]+)-([a-z])",
    replace: (_m, a, b) => `${a}${b.toUpperCase()}`,
    category: "frontend",
  },
];

export function runRegex(
  pattern: string,
  flags: string,
  text: string,
  replace?: string | ((...args: any[]) => string),
): RegexRunResult {
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch (error) {
    return { ok: false, error: String(error), matches: [] };
  }

  const matches: RegexRunResult["matches"] = [];
  if (!pattern) return { ok: true, matches: [] };

  if (flags.includes("g")) {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      matches.push({
        match: m[0],
        index: m.index,
        groups: collectGroups(m),
      });
      if (m[0] === "") {
        regex.lastIndex++;
      }
    }
  } else {
    const m = regex.exec(text);
    if (m) {
      matches.push({
        match: m[0],
        index: m.index,
        groups: collectGroups(m),
      });
    }
  }

  let replaced: string | undefined;
  if (replace !== undefined) {
    try {
      replaced = text.replace(regex, replace as any);
    } catch (error) {
      return { ok: false, error: String(error), matches: [] };
    }
  }

  return { ok: true, matches, replaced };
}

function collectGroups(m: RegExpExecArray) {
  const groups: Record<string, string | undefined> = {};
  if (m.groups) {
    Object.keys(m.groups).forEach((k) => {
      groups[k] = m.groups?.[k];
    });
  }
  for (let i = 1; i < m.length; i++) {
    groups[i.toString()] = m[i];
  }
  return groups;
}
